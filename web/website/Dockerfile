FROM node:24-bookworm-slim AS build
WORKDIR /workspace
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@11.19.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY web/website/package.json ./web/website/
RUN pnpm install --filter @bigmotors/website... --frozen-lockfile
COPY packages/core/ ./packages/core/
COPY packages/db/ ./packages/db/
COPY web/website/ ./web/website/
RUN pnpm build:website

FROM node:24-bookworm-slim AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 FILES_ROOT=/files
WORKDIR /app
COPY --from=build --chown=node:node /workspace/web/website/.next/standalone/ ./
COPY --from=build --chown=node:node /workspace/web/website/.next/static/ ./web/website/.next/static/
COPY --from=build --chown=node:node /workspace/web/website/public/ ./web/website/public/
RUN mkdir -p /files && chown node:node /files
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "web/website/server.js"]
