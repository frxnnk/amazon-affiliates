# OpenShip deployment

The web remains Astro 5.16.6 with its existing libSQL database and Clerk users.
`DEPLOY_TARGET=openship` selects the pinned Node adapter; an unset target keeps
the Vercel adapter and `vercel.json` for rollback. The Telegram converter is a
separate application/repository and is not included in this image.

## Build and run

- Install: `npm ci` (Node 24).
- Build: `DEPLOY_TARGET=openship npm run build` (`astro build --remote`).
- Start: `npm start` (`node scripts/start-server.mjs`). The launcher drains HTTP
  requests on SIGTERM/SIGINT, with a 100-second deadline inside Docker's
  120-second stop grace period.
- Container: repository `Dockerfile`, HTTP port **4321**, health **/api/health**.
- OpenShip: a **services** project importing `docker-compose.yml`, one service
  named `web`. Keep external exposure disabled until HTTPS routing is ready.
  Compose only exposes container port 4321; it publishes no host port.
- Supply `HOST=0.0.0.0` behind the reverse proxy, `PORT=4321`, `DATA_DIR=/data`.
- Terminate public HTTPS at the deployment edge. Preserve the original host and
  protocol headers, permit streaming responses, and avoid caching authenticated
  APIs. Keep the existing website hostname to preserve Clerk and canonical URLs.

The health endpoint only confirms that the server can respond; it never queries
Clerk, libSQL, paid APIs or Telegram. Verify real sign-in and database reads
separately during cutover. No seed, schema push or database migration belongs in
the build or startup command.

## Configuration phases

| Phase | Variables |
| --- | --- |
| Build, public | `PUBLIC_CLERK_PUBLISHABLE_KEY`, `ASTRO_DB_REMOTE_URL` |
| Build, optional public | `PUBLIC_CLERK_SIGN_IN_URL`, `PUBLIC_CLERK_SIGN_UP_URL`, `PUBLIC_CLERK_AFTER_SIGN_IN_URL`, `PUBLIC_CLERK_AFTER_SIGN_UP_URL` |
| Runtime, required | `CLERK_SECRET_KEY`, `ASTRO_DB_APP_TOKEN` |
| Runtime, operational | `DATA_DIR`, `HOST`, `PORT`; `CRON_SECRET` only for an explicitly enabled scheduler |
| Runtime, existing features | `ADMIN_EMAILS`, `AMAZON_PA_API_PARTNER_TAG`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`, `GITHUB_TOKEN`, `RAPIDAPI_KEY`, `OPENAI_API_KEY`, `YOUTUBE_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID` |
| Runtime, optional providers | `AMAZON_CREATORS_CREDENTIAL_ID`, `AMAZON_CREATORS_CREDENTIAL_SECRET`, `RAINFOREST_API_KEY`, `KEEPA_API_KEY`, `TRIPO_API_KEY`, `DISCORD_WEBHOOK_URL`, `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_SECRET` |

In OpenShip 0.8.2, project environment values are also passed as build arguments.
Put **only** `PUBLIC_CLERK_*` and `ASTRO_DB_REMOTE_URL` in project environment.
Put private credentials in the **web service environment overrides**, which the
services pipeline injects at runtime. Never add secrets to project environment,
Compose build arguments, the Dockerfile, or a committed environment file.
The image build only accepts public arguments and never needs production secrets.
The libSQL URL is compiled into the server; changing it requires a rebuild.
Provider credentials and the database token are read at runtime. Clerk 2.x gets
runtime server configuration through its supported `locals.runtime.env` context.
Local development still reads `.env`; `.env*` is excluded from Docker context.

Copy only configuration actually needed for the enabled features. Missing
optional provider keys must not be replaced with fabricated credentials.
The configured GitHub content branch is `master` (also the fallback).

## Persistent files

Mount one persistent volume at **/data**, writable by container UID/GID **1000**.
The Compose volume key is **rewardhive-data** and the service runs as the image's
`node` user (UID 1000). OpenShip's `namespaceVolumes=true` prefixes that key with
the project slug. For slug `rewardhive-web`, the physical volume is
**openship-rewardhive-web-rewardhive-data**, stable across deployments. Preserve
the slug, volume key and namespace setting; confirm that physical mount before
cutover. Do not remove volumes during rollback. For direct Compose deployment,
use the same Compose project name on every release to retain its volume prefix.
The service restarts unless stopped and allows 120 seconds for shutdown.
The application writes lists to `/data/content/lists/{es,en}` and generated GLB
models to `/data/models`. Writes use an atomic rename; IDs and languages cannot
traverse outside these directories. Models are served by `/models/{id}.glb`.
List updates/deletes read current disk state rather than build-time collections.
Without `DATA_DIR`, development retains the old `src/content/lists` and
`public/models` locations.

If the old deployment has user-generated files, copy those files to the matching
volume directories before traffic moves. Do not overwrite this volume during a
release or rollback. The image's original catalog files remain available to the
existing duplicate-check endpoint. The remote libSQL database is separate from
this volume and is not recreated by a deployment.

## Access and jobs

All administrative and debug APIs, including agent controls and SSE, require a
Clerk user with `sessionClaims.metadata.role=admin`. Public catalog, login and
health routes remain public. Scheduled routes accept the exact configured cron
secret or an authenticated admin; missing secrets and arbitrary Bearer strings
do not authorize a job.

**Scheduled jobs are disabled.** No cron daemon or timer is installed. The old
Vercel daily GET called the orchestrator's status endpoint; changing this to POST
would start new AI usage and possibly Telegram publications. Keep that behavior
disabled until deliberately approved. `npm run cron:run` does nothing unless
`ENABLE_SCHEDULED_JOBS=1` is explicitly supplied with `CRON_SECRET`. When enabled,
the runner sends authenticated POST to the local service and never follows
redirects. Only one scheduler should own the job after a cutover.

## Validation and rollback

- `npm run test:unit`: request authorization, persistence and disabled job runner.
- Build with disposable public/test configuration and no production tokens.
- `npm run test:runtime`: starts the built Node artifact on loopback, blocks
  outbound fetch, checks liveness/static/model responses and anonymous API denial.
- `npm run build` without `DEPLOY_TARGET` still builds the Vercel artifact.
- Existing `npx astro check` findings outside this migration need separate work;
  a successful production build does not mean all legacy type checks pass.

Keep Vercel available until HTTPS, Clerk login, required database reads and a
collaborator's authorized deployment have been verified. Roll back traffic to
Vercel if needed, retaining both the remote database and the persistent volume.
Do not enable external publication as part of a health check.
