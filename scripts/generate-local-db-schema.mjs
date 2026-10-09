import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { schemaFingerprint, sha256 } from './local-database.mjs';

const root = new URL('../', import.meta.url);
const manifestUrl = new URL('db/migrations/V1__initial-schema.json', root);
const packageUrl = new URL(import.meta.resolve('@astrojs/db/package.json'));
const { version } = JSON.parse(await readFile(packageUrl, 'utf8'));
if (version !== '0.18.3') throw new Error('Review the local database generator before changing Astro DB version');
const source = (await readFile(new URL('db/config.ts', root), 'utf8')).replaceAll('\r\n', '\n');
const sourceFingerprint = sha256(version + '\n' + source);

if (process.argv.includes('--check')) {
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
  if (manifest.sourceFingerprint !== sourceFingerprint || manifest.astroDbVersion !== version) {
    throw new Error('db/config.ts changed. Add an explicit versioned migration; never regenerate an applied V1');
  }
  console.log('Local database schema V1 matches db/config.ts');
} else if (process.argv.includes('--write-initial')) {
  const { resolveDbConfig } = await import(new URL('dist/core/load-file.js', packageUrl));
  const { getCreateTableQuery, getCreateIndexQueries } = await import(new URL('dist/core/queries.js', packageUrl));
  const { dbConfig, dependencies } = await resolveDbConfig({ root, integrations: [] });
  if (dependencies.some(path => !path.startsWith('astro:db:') && !path.endsWith('db/config.ts'))) {
    throw new Error('Schema imports changed; include their contents in the source fingerprint first');
  }
  const statements = Object.entries(dbConfig.tables).flatMap(([name, table]) => [
    getCreateTableQuery(name, table), ...getCreateIndexQueries(name, table),
  ]);
  const client = new DatabaseSync(':memory:');
  try {
    for (const sql of statements) client.exec(sql);
    const manifest = { version: 1, astroDbVersion: version, sourceFingerprint,
      schemaFingerprint: await schemaFingerprint(client), tables: Object.keys(dbConfig.tables), statements };
    await mkdir(new URL('db/migrations/', root), { recursive: true });
    await writeFile(manifestUrl, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
    console.log(`Generated immutable initial schema with ${manifest.tables.length} tables; no seed data`);
  } finally { client.close(); }
} else {
  throw new Error('Use --check, or --write-initial only before V1 exists');
}
