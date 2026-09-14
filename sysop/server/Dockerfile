FROM node:24-bookworm-slim AS base
WORKDIR /workspace
RUN npm install --global pnpm@11.19.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY sysop/dti/package.json ./sysop/dti/
COPY sysop/server/package.json ./sysop/server/

FROM base AS build
RUN pnpm install --filter @bigmotors/sysop-server... --frozen-lockfile
COPY packages/core/ ./packages/core/
COPY packages/db/ ./packages/db/
COPY sysop/dti/ ./sysop/dti/
COPY sysop/server/ ./sysop/server/
RUN pnpm build:server && pnpm typecheck:server

FROM base AS prod-deps
RUN pnpm install --filter @bigmotors/sysop-server... --prod --frozen-lockfile

FROM node:24-bookworm-slim AS runner
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4000 FILES_ROOT=/files FILES_UPLOADS=/files/uploads
WORKDIR /app/sysop/server
COPY --from=prod-deps --chown=node:node /workspace/node_modules/ /app/node_modules/
COPY --from=prod-deps --chown=node:node /workspace/packages/ /app/packages/
COPY --from=prod-deps --chown=node:node /workspace/sysop/ /app/sysop/
COPY --from=build --chown=node:node /workspace/packages/core/dist/ /app/packages/core/dist/
COPY --from=build --chown=node:node /workspace/packages/db/dist/ /app/packages/db/dist/
COPY --from=build --chown=node:node /workspace/sysop/dti/dist/ /app/sysop/dti/dist/
COPY --from=build --chown=node:node /workspace/sysop/server/dist/ ./dist/
RUN mkdir -p /files/uploads /files/cache && chown -R node:node /files
USER node
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.mjs"]
