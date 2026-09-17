FROM node:24-bookworm AS node

FROM oven/bun:1.3.12
COPY --from=node /usr/local/bin/node /usr/local/bin/node
WORKDIR /repo

ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=$DATABASE_URL

COPY package.json bun.lock turbo.json biome.jsonc ./
COPY apps ./apps
COPY packages ./packages
COPY tools ./tools

RUN bun install --frozen-lockfile

ARG NEXT_PUBLIC_API_URL
ARG APP_URL
ARG API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
	APP_URL=$APP_URL \
	API_URL=$API_URL \
	NODE_ENV=production \
	NEXT_TELEMETRY_DISABLED=1 \
	TURBO_TELEMETRY_DISABLED=1 \
	DO_NOT_TRACK=1

RUN bun run --filter=api trpc:generate && bunx turbo run build --filter='!app'
RUN cd apps/app && node "$(node -p "require.resolve('next/dist/bin/next')")" build

COPY docker-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["app"]
