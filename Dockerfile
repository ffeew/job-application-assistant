FROM node:24-bookworm-slim AS base
RUN npm install --global pnpm@12.10.1
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder
COPY . .
RUN pnpm run build:runtime
# These values only satisfy import-time validation; no real secrets or database
# are needed to build. Runtime containers validate their actual configuration.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    BETTER_AUTH_SECRET=build-only-placeholder-secret-never-use-in-production \
    BETTER_AUTH_URL=http://localhost:3000 GROQ_API_KEY=build-only \
    pnpm run build

FROM base AS production-dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM node:24-bookworm-slim AS script-runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/build ./
COPY --chown=node:node scripts/container-entrypoint.mjs scripts/worker-health.mjs ./scripts/
USER node

FROM script-runtime AS migrator
COPY --chown=node:node migrations ./migrations
CMD ["node", "scripts/container-entrypoint.mjs", "migrate.mjs"]

FROM script-runtime AS worker
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node scripts/worker-health.mjs
CMD ["node", "scripts/container-entrypoint.mjs", "generation-worker.mjs"]

FROM node:24-bookworm-slim AS app
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --chown=node:node scripts/container-entrypoint.mjs ./scripts/
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=8s --start-period=30s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "scripts/container-entrypoint.mjs", "server.js"]
