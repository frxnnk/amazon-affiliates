import { initializeLocalDatabase } from './local-database.mjs';

// Require explicit runtime configuration instead of silently using an old build URL.
if (!process.env.ASTRO_DB_REMOTE_URL) throw new Error('ASTRO_DB_REMOTE_URL is required at runtime');
if (process.env.ASTRO_DB_REMOTE_URL.startsWith('file:')) process.umask(0o077);
await initializeLocalDatabase({ url: process.env.ASTRO_DB_REMOTE_URL, dataDir: process.env.DATA_DIR });

// Start Astro explicitly so the container's PID 1 can drain HTTP requests.
process.env.ASTRO_NODE_AUTOSTART = 'disabled';
const { startServer } = await import('../dist/server/entry.mjs');
const { server } = startServer();
const httpServer = server.server;
let closing = false;

function shutdown() {
  if (closing) return;
  closing = true;
  // Leave headroom before Docker's configured 120-second stop timeout.
  const deadline = setTimeout(() => {
    httpServer.closeAllConnections();
    process.exit(1);
  }, 100_000);
  deadline.unref();
  httpServer.close(error => {
    clearTimeout(deadline);
    process.exit(error ? 1 : 0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
