import { createHash } from 'node:crypto';
import { chmod, lstat, open, readFile, realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const manifestUrl = new URL('../db/migrations/V1__initial-schema.json', import.meta.url);
export const sha256 = value => createHash('sha256').update(value).digest('hex');

export function schemaFingerprint(client) {
  const rows = client.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name != '_rewardhive_schema' ORDER BY type,name").all();
  return sha256(JSON.stringify(rows.map(r => [r.type, r.name, r.tbl_name, r.sql])));
}

async function localPath(url, dataDir, mustExist = false) {
  if (!dataDir) throw new Error('DATA_DIR is required for a local database');
  const parsed = new URL(url);
  if (parsed.protocol !== 'file:' || parsed.host || parsed.search || parsed.hash) {
    throw new Error('Expected an absolute local file URL without query parameters');
  }
  const path = fileURLToPath(parsed);
  const root = await realpath(resolve(dataDir));
  const parent = await realpath(dirname(path));
  const fromRoot = relative(root, resolve(parent, basename(path)));
  if (!isAbsolute(path) || fromRoot === '' || fromRoot.startsWith('..') || isAbsolute(fromRoot)) {
    throw new Error('Database path must remain inside DATA_DIR');
  }
  try {
    const info = await lstat(path);
    if (info.isSymbolicLink() || !info.isFile()) throw new Error('Database must be a regular file, not a symlink');
    if (info.size > 0) {
      const file = await open(path, 'r');
      try {
        const header = Buffer.alloc(16);
        await file.read(header, 0, 16, 0);
        if (header.toString() !== 'SQLite format 3\0') throw new Error('Existing file is not a SQLite database');
      } finally { await file.close(); }
    }
  } catch (error) {
    if (error.code !== 'ENOENT' || mustExist) throw error;
  }
  return path;
}

function assertCompatible(client, manifest) {
  const metadata = client.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_rewardhive_schema'").all();
  if (metadata.length !== 1) throw new Error('Unrecognized existing database; refusing to initialize or overwrite it');
  const rows = client.prepare('SELECT version,source_fingerprint FROM _rewardhive_schema').all();
  if (rows.length !== 1 || rows[0].version !== manifest.version || rows[0].source_fingerprint !== manifest.sourceFingerprint) {
    throw new Error('Database schema version is incompatible; an explicit migration is required');
  }
  if (schemaFingerprint(client) !== manifest.schemaFingerprint) {
    throw new Error('Database schema changed or is incompatible; refusing to overwrite it');
  }
}

export async function initializeLocalDatabase({ url, dataDir }) {
  if (!url?.startsWith('file:')) return null;
  const path = await localPath(url, dataDir);
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
  const client = new DatabaseSync(path, { timeout: 5000 });
  let inTransaction = false;
  let created = false;
  try {
    client.exec('BEGIN IMMEDIATE');
    inTransaction = true;
    const rows = client.prepare("SELECT name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'").all();
    if (rows.length === 0) {
      for (const sql of manifest.statements) client.exec(sql);
      client.exec('CREATE TABLE _rewardhive_schema (version INTEGER PRIMARY KEY, source_fingerprint TEXT NOT NULL)');
      client.prepare('INSERT INTO _rewardhive_schema VALUES (?,?)').run(manifest.version, manifest.sourceFingerprint);
      created = true;
    }
    assertCompatible(client, manifest);
    client.exec('COMMIT');
    inTransaction = false;
    if (created) await chmod(path, 0o600);
    return { created, version: manifest.version, tableCount: manifest.tables.length };
  } catch (error) {
    if (inTransaction) client.exec('ROLLBACK');
    throw error;
  } finally {
    client.close();
  }
}

async function snapshotInto({ source, destination, dataDir }) {
  const sourcePath = await localPath(pathToFileURL(source).href, dataDir, true);
  const targetPath = await localPath(pathToFileURL(destination).href, dataDir);
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
  const client = new DatabaseSync(sourcePath, { timeout: 5000 });
  try {
    assertCompatible(client, manifest);
    // Reserve the new destination exclusively. Never overwrite an existing file.
    const target = await open(targetPath, 'wx', 0o600);
    await target.close();
    client.exec('PRAGMA synchronous=FULL');
    client.prepare('VACUUM INTO ?').run(targetPath);
  } finally { client.close(); }
  const copy = new DatabaseSync(targetPath, { readOnly: true });
  try {
    const integrity = copy.prepare('PRAGMA integrity_check').all();
    if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok') throw new Error('Snapshot integrity check failed');
    assertCompatible(copy, manifest);
  } finally { copy.close(); }
  return { path: targetPath, integrity: 'ok', version: manifest.version };
}

export async function backupLocalDatabase({ url, dataDir, destination }) {
  const source = await localPath(url, dataDir, true);
  return snapshotInto({ source, destination, dataDir });
}

export async function restoreLocalDatabase({ backupPath, destination, dataDir }) {
  return snapshotInto({ source: backupPath, destination, dataDir });
}
