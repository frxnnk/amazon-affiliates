import { backupLocalDatabase, restoreLocalDatabase } from './local-database.mjs';

const [operation, first, second] = process.argv.slice(2);
const dataDir = process.env.DATA_DIR;
let result;
if (operation === 'backup' && first && !second) {
  result = await backupLocalDatabase({ url: process.env.ASTRO_DB_REMOTE_URL, dataDir, destination: first });
} else if (operation === 'restore' && first && second) {
  result = await restoreLocalDatabase({ dataDir, backupPath: first, destination: second });
} else {
  throw new Error('Usage: database-maintenance.mjs backup /data/new-backup.db | restore /data/backup.db /data/new-restored.db');
}
console.log(JSON.stringify(result));
