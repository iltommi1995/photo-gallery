# Multi-stage build for Next.js. Because Home, /places, /about, and
# published albums are statically generated (ISR), `next build` needs a
# reachable, migrated Postgres — see docs/deployment.md for why the build
# step must run after `db` is up, joined to its network via
# docker-compose.yml's `build.network`, rather than in isolation.
#
# The runner stage keeps the full node_modules (not next's minimal
# "standalone" trace) specifically so `prisma migrate deploy` and the seed
# script (tsx) can run inside the running container for first-boot/updates
# — see docs/deployment.md. That costs some image size, which is an
# acceptable trade for a personal self-hosted deployment.

FROM node:22-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --- migrator: run `prisma migrate deploy` / the seed script against `db`
# BEFORE building `app` — the builder stage's static generation needs the
# schema's tables to already exist, not just a reachable connection, so
# migrations can't run from the app image (chicken-and-egg). Build this
# target directly (`docker build --target migrator ...`), not via the
# `app` service — see docs/deployment.md.
FROM base AS migrator
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
# The prisma binary directly, not `pnpm prisma`/`pnpm exec` — those run a
# pnpm workspace-consistency check first that wants the full source tree
# and (for native deps like sharp) interactive build-script approval,
# neither of which apply to this deliberately source-free image.
# `migrate deploy` itself doesn't need a generated client, but
# `prisma/seed.ts` does (`import { PrismaClient } from "@prisma/client"`) —
# this image is also used to run the seed script (see docs/deployment.md),
# and generating only needs the schema file, not a live `db` connection, so
# it's safe to do at build time here.
RUN node_modules/.bin/prisma generate
CMD ["node_modules/.bin/prisma", "migrate", "deploy"]

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time-only: NEXT_PUBLIC_* vars are inlined into the client bundle,
# and the statically-rendered public pages query the database directly, so
# both must be real values at build time.
ARG DATABASE_URL
ARG NEXT_PUBLIC_SITE_URL
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm prisma generate
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p /app/storage && chown nextjs:nodejs /app/storage
RUN chown -R nextjs:nodejs /app/.next

USER nextjs
EXPOSE 3000

# `next` directly, not `pnpm start` — pnpm wraps script execution in a
# workspace dependency-consistency check that writes a temp lockfile probe
# into /app, which the non-root `nextjs` user can't do here.
CMD ["node_modules/.bin/next", "start"]
