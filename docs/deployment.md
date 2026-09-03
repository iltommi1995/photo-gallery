# Deployment (Proxmox / Docker Compose)

Targets a Debian/Ubuntu VM or LXC container on Proxmox with Docker and the
Compose plugin installed (`docker compose version` should work). This repo's
production stack is `docker-compose.yml`: `db` (Postgres), `app` (this
Next.js app), `reverse-proxy` (Caddy, automatic HTTPS via Let's Encrypt).

## Why the build order matters

Home, `/places`, `/about`, and every published album are statically
generated at build time (ISR) — they query Postgres directly during
`next build`, and **the tables need to already exist**, not just a
reachable connection (verified directly: building `app` against a
DB with no migrations applied yet fails outright, `P2021` — table does
not exist). Migrations can't run _from_ the `app` image either, because
building that image is exactly the step that requires them to have
already run — chicken-and-egg.

The Dockerfile's `migrator` stage breaks the cycle: it's a separate,
lightweight build target (just Prisma + the schema, no app source, so it
never needs `db` at build time) that only runs migrations _against_ `db`
at container-run time. `docker-compose.yml`'s `app.build.network` key
joins the `app` build itself to `db`'s network so `next build` can reach
`db:5432` once the migrator has already applied the schema. This is also
why `app`'s runtime commands use the `next`/`prisma`/`tsx` binaries
directly (`node_modules/.bin/...`) instead of `pnpm start`/`pnpm prisma`
— pnpm wraps script execution in a workspace-consistency check that tries
to write a temp file into `/app`, which the container's non-root user
can't do (verified directly — this is not a hypothetical concern).

## First boot

1. **Get the code onto the server** (git clone, or copy the repo) and `cd`
   into it.

2. **Create `.env`** from the example and fill in every value:

   ```bash
   cp .env.example .env
   nano .env  # or your editor of choice
   ```

   At minimum: `POSTGRES_PASSWORD` (and `DATABASE_URL`'s password —
   they must match), `AUTH_SECRET` (generate with
   `openssl rand -base64 32`), `ADMIN_EMAIL`/`ADMIN_PASSWORD`,
   `NEXT_PUBLIC_SITE_URL` (your real `https://` domain),
   `SITE_DOMAIN` (same domain, no scheme — Caddy uses this to request a
   certificate, so DNS must already point at this server first).

3. **Start Postgres first, and wait for it to be healthy:**

   ```bash
   docker compose up -d db
   docker compose ps  # wait until db shows "healthy"
   ```

4. **Build the migrator image and run migrations** against `db` (loads
   `.env` for `DATABASE_URL`, which should already be in its production
   form, `postgresql://...@db:5432/...`):

   ```bash
   docker build --target migrator -t photo-gallery-migrator .
   docker run --rm --network photo-gallery-net --env-file .env \
     photo-gallery-migrator
   ```

5. **Seed optionally**, using that same migrator image with its command
   overridden. Only do this on a genuinely empty database — it creates the
   initial admin user from `ADMIN_EMAIL`/`ADMIN_PASSWORD` and, if you want
   the placeholder sample albums to explore before uploading real photos,
   sample data too:

   ```bash
   docker run --rm --network photo-gallery-net --env-file .env \
     photo-gallery-migrator node_modules/.bin/tsx prisma/seed.ts
   ```

   If you'd rather start with just the admin account and no sample
   albums, that's a very small edit to `prisma/seed.ts` (the admin-upsert
   block near the top) — run it before the sample albums are created, or
   comment out the sample-album section.

6. **Build the app image** (now that the schema — and, if you seeded,
   the data — exists, `next build`'s static generation succeeds), and
   **start everything:**

   ```bash
   docker compose build app
   docker compose up -d
   ```

   Caddy will request a Let's Encrypt certificate for `SITE_DOMAIN` on
   first request — make sure ports 80 and 443 are reachable from the
   internet (Proxmox firewall / router port forwarding) before this step,
   or the certificate request will fail.

7. **Verify:** `https://<SITE_DOMAIN>/places` should load, and
   `https://<SITE_DOMAIN>/admin/login` should let you sign in with
   `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

## Updating the app

Code changes need a rebuild (with `db` already running, for the same
build-time reason as first boot) and a migration run for any schema
changes — same migrator-then-app order as first boot:

```bash
git pull
docker compose up -d db          # make sure it's running/healthy
docker build --target migrator -t photo-gallery-migrator .
docker run --rm --network photo-gallery-net --env-file .env \
  photo-gallery-migrator
docker compose build app
docker compose up -d app
```

`reverse-proxy` doesn't need touching for an app update.

## Backups

Two things need backing up: the Postgres data (the whole database) and the
`photo-storage` volume (original photos + every generated variant). Neither
is optional — losing the storage volume loses the actual photos, and losing
the database loses the metadata that describes them.

**Manual backup:** `scripts/backup.sh` dumps the database (gzipped) and
tars the `photo-storage` volume into `./backups/` (override with
`BACKUP_DIR`):

```bash
./scripts/backup.sh
```

**Cron, scheduled on the Proxmox host** (or inside the VM/LXC — wherever
Docker actually runs):

```
0 3 * * * BACKUP_DIR=/mnt/backups/photo-gallery COMPOSE_DIR=/opt/photo-gallery /opt/photo-gallery/scripts/backup.sh >> /var/log/photo-gallery-backup.log 2>&1
```

Keep backups off the same disk as the running stack — copy them to another
Proxmox storage target, or off-host entirely, on whatever schedule matches
how much photo-upload work you're willing to redo.

**Restoring:**

```bash
# Database (stack should be down or at least `app` stopped)
gunzip -c backup-db-YYYY-MM-DD.sql.gz | docker compose exec -T db \
  psql -U "$POSTGRES_USER" "$POSTGRES_DB"

# Photo storage volume
docker run --rm \
  -v photo-gallery_photo-storage:/data \
  -v "$(pwd)":/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/backup-storage-YYYY-MM-DD.tar.gz -C /data"
```

## Local development database

`docker-compose.dev.yml` starts _only_ Postgres, on host port 5433 (chosen
to avoid colliding with a default 5432 already in use), matching the
default `DATABASE_URL` in `.env.example`:

```bash
docker compose -f docker-compose.dev.yml up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

This is unrelated to `docker-compose.yml` (the production stack) — don't
run both against the same `.env` simultaneously, their `DATABASE_URL`
values point at different ports/hosts on purpose.
