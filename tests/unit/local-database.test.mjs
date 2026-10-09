import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { initializeLocalDatabase, backupLocalDatabase, restoreLocalDatabase } from '../../scripts/local-database.mjs';

function createClient({ url }) {
  const db = new DatabaseSync(fileURLToPath(url));
  return {
    execute(query) {
      const statement = db.prepare(typeof query === 'string' ? query : query.sql);
      return { rows: statement.all(...(query.args ?? [])) };
    },
    close() { db.close(); },
  };
}

async function fixture(t) {
  const dataDir = await mkdtemp(join(tmpdir(), 'rewardhive-db-'));
  t.after(() => rm(dataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
  const url = pathToFileURL(join(dataDir, 'rewardhive.db')).href;
  return { dataDir, url };
}

test('fresh schema contains every Astro table, starts empty and preserves rows on repeated startup', async t => {
  const options = await fixture(t);
  assert.equal((await initializeLocalDatabase(options)).created, true);
  const client = createClient({ url: options.url });
  try {
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_rewardhive_schema'");
    assert.equal(tables.rows.length, 39);
    for (const { name } of tables.rows) {
      assert.equal((await client.execute(`SELECT COUNT(*) AS n FROM "${name}"`)).rows[0].n, 0);
    }
    await client.execute({ sql: 'INSERT INTO Users (id,email) VALUES (?,?)', args: ['persisted-marker', 'test@example.invalid'] });
  } finally { client.close(); }
  assert.equal((await initializeLocalDatabase(options)).created, false);
  const reopened = createClient({ url: options.url });
  try { assert.equal((await reopened.execute('SELECT id FROM Users')).rows[0].id, 'persisted-marker'); }
  finally { reopened.close(); }
});

test('an unrelated database is rejected without removing its data', async t => {
  const options = await fixture(t);
  const client = createClient({ url: options.url });
  try {
    await client.execute('CREATE TABLE original (value TEXT)');
    await client.execute("INSERT INTO original VALUES ('keep-me')");
    await assert.rejects(initializeLocalDatabase(options), /unrecognized|incompatible/i);
    assert.equal((await client.execute('SELECT value FROM original')).rows[0].value, 'keep-me');
    assert.equal((await client.execute("SELECT COUNT(*) AS n FROM sqlite_master WHERE name='_rewardhive_schema'")).rows[0].n, 0);
  } finally { client.close(); }
});

test('schema drift fails closed without overwriting columns', async t => {
  const options = await fixture(t);
  await initializeLocalDatabase(options);
  const client = createClient({ url: options.url });
  try {
    await client.execute('ALTER TABLE Users ADD COLUMN unexpected TEXT');
    await assert.rejects(initializeLocalDatabase(options), /schema.*incompatible|schema.*changed/i);
    assert.ok((await client.execute('PRAGMA table_info(Users)')).rows.some(r => r.name === 'unexpected'));
  } finally { client.close(); }
});

test('unknown schema versions require an explicit migration', async t => {
  const options = await fixture(t);
  await initializeLocalDatabase(options);
  const client = createClient({ url: options.url });
  try {
    await client.execute('UPDATE _rewardhive_schema SET version=99');
    await assert.rejects(initializeLocalDatabase(options), /explicit migration/i);
    assert.equal((await client.execute('SELECT version FROM _rewardhive_schema')).rows[0].version, 99);
  } finally { client.close(); }
});

test('consistent backup includes committed WAL data and restores only to a new database', async t => {
  const options = await fixture(t);
  await initializeLocalDatabase(options);
  const client = createClient({ url: options.url });
  const backupPath = join(options.dataDir, 'snapshot.db');
  const destination = join(options.dataDir, 'restored.db');
  try {
    await client.execute('PRAGMA journal_mode=WAL');
    await client.execute({ sql: 'INSERT INTO Users (id,email) VALUES (?,?)', args: ['in-wal', 'test@example.invalid'] });
    await backupLocalDatabase({ ...options, destination: backupPath });
    await client.execute({ sql: 'INSERT INTO Users (id,email) VALUES (?,?)', args: ['after-snapshot', 'later@example.invalid'] });
    await restoreLocalDatabase({ dataDir: options.dataDir, backupPath, destination });
    const restored = createClient({ url: pathToFileURL(destination).href });
    try { assert.deepEqual((await restored.execute('SELECT id FROM Users')).rows.map(r => r.id), ['in-wal']); }
    finally { restored.close(); }
    await assert.rejects(restoreLocalDatabase({ dataDir: options.dataDir, backupPath, destination }), /exists/i);
    await assert.rejects(backupLocalDatabase({ ...options, destination: backupPath }), /exists/i);
    assert.equal((await client.execute('SELECT COUNT(*) AS n FROM Users')).rows[0].n, 2);
  } finally { client.close(); }
});

test('remote mode is left alone and local paths cannot escape DATA_DIR', async t => {
  const options = await fixture(t);
  assert.equal(await initializeLocalDatabase({ url: 'libsql://example.invalid', dataDir: options.dataDir }), null);
  await assert.rejects(initializeLocalDatabase({ ...options, url: pathToFileURL(join(options.dataDir, '..', 'outside.db')).href }), /DATA_DIR/i);
  const invalid = join(options.dataDir, 'invalid.db');
  await writeFile(invalid, 'not a database');
  await assert.rejects(initializeLocalDatabase({ ...options, url: pathToFileURL(invalid).href }));
});
