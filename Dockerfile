FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Only public configuration belongs in image build arguments. No production tokens.
ARG PUBLIC_CLERK_PUBLISHABLE_KEY
ARG PUBLIC_CLERK_SIGN_IN_URL
ARG PUBLIC_CLERK_SIGN_UP_URL
ARG PUBLIC_CLERK_AFTER_SIGN_IN_URL
ARG PUBLIC_CLERK_AFTER_SIGN_UP_URL
ARG ASTRO_DB_REMOTE_URL
ENV DEPLOY_TARGET=openship ASTRO_TELEMETRY_DISABLED=1
RUN npm run db:schema:check && npm run build
RUN npm prune --omit=dev --no-audit --no-fund

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321 DATA_DIR=/data
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/src/content ./src/content
COPY --from=build --chown=node:node /app/scripts/run-cron.mjs ./scripts/run-cron.mjs
COPY --from=build --chown=node:node /app/scripts/start-server.mjs ./scripts/start-server.mjs
COPY --from=build --chown=node:node /app/scripts/local-database.mjs ./scripts/local-database.mjs
COPY --from=build --chown=node:node /app/scripts/database-maintenance.mjs ./scripts/database-maintenance.mjs
COPY --from=build --chown=node:node /app/db/migrations ./db/migrations
RUN mkdir -p /data/content/lists /data/models && chown -R node:node /data
USER node
VOLUME ["/data"]
EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "scripts/start-server.mjs"]
