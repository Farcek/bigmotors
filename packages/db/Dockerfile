FROM node:24-bookworm-slim AS build

WORKDIR /workspace
RUN npm install --global pnpm@11.19.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
RUN pnpm install --filter @bigmotors/db... --frozen-lockfile

COPY packages/core/ ./packages/core/
COPY packages/db/ ./packages/db/
RUN pnpm build:db
RUN pnpm typecheck:db
RUN pnpm test:db
FROM node:24-bookworm-slim AS prod-deps

WORKDIR /workspace
RUN npm install --global pnpm@11.19.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
RUN pnpm install --filter @bigmotors/db... --prod --frozen-lockfile

FROM node:24-bookworm-slim AS runner

ENV NODE_ENV=production
WORKDIR /app/packages/db
# Preserve pnpm's workspace symlinks without shipping build dependencies.
COPY --from=prod-deps --chown=node:node /workspace/node_modules/ /app/node_modules/
COPY --from=prod-deps --chown=node:node /workspace/packages/db/node_modules/ ./node_modules/
COPY --from=prod-deps --chown=node:node /workspace/packages/db/package.json ./package.json
COPY --from=prod-deps --chown=node:node /workspace/packages/core/package.json /app/packages/core/package.json
COPY --from=build --chown=node:node /workspace/packages/core/dist/ /app/packages/core/dist/
COPY --from=build --chown=node:node /workspace/packages/db/dist/ ./dist/
COPY --from=build --chown=node:node /workspace/packages/db/migrations/ ./migrations/
USER node

# One-shot release job. Credentials are injected only when the container runs.
CMD ["node", "dist/migrate.mjs"]
