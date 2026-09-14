FROM node:24-bookworm-slim AS build
WORKDIR /workspace
RUN npm install --global pnpm@11.19.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY sysop/dti/package.json ./sysop/dti/
COPY sysop/app/package.json ./sysop/app/
RUN pnpm install --filter @bigmotors/sysop-app... --frozen-lockfile
COPY packages/core/ ./packages/core/
COPY sysop/dti/ ./sysop/dti/
COPY sysop/app/ ./sysop/app/
ENV VITE_API_BASE_URL=/api VITE_FILES_BASE_URL=
RUN pnpm build:app

FROM nginx:stable-alpine AS runner
COPY sysop/app/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /workspace/sysop/app/dist/ /usr/share/nginx/html/
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 CMD wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
