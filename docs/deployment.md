# Deployment (Proxmox / Docker Compose / Nginx Proxy Manager)

Targets a Debian/Ubuntu LXC container (or VM) on Proxmox with Docker and the
Compose plugin installed (`docker compose version` should work), fronted by
an existing reverse proxy elsewhere on the network — Nginx Proxy Manager
(NPM) in its own container is what these instructions assume, since that's
the common homelab setup, but any reverse proxy that can forward a domain to
`<this-host-ip>:3000` works the same way. This repo's production stack
(`docker-compose.yml`) is just `db` (Postgres) and `app` (this Next.js app)
— it does **not** run its own TLS-terminating proxy; that's NPM's job,
already covering every other service on the network.

## 1. Create the LXC container

From the Proxmox web UI (or `pct create` on the host shell) — mirror
whatever base image/settings your other app containers already use if
they work well; the specifics below are just concrete defaults:

- **Template**: Debian 12 or Ubuntu 24.04.
- **Unprivileged**: yes, with **nesting enabled** (Proxmox → container →
  Options → Features → check "Nesting") — Docker needs this to run inside
  an unprivileged LXC.
- **Resources**: 2 CPU cores, 2–4 GB RAM, 16+ GB disk is comfortable for a
  personal photo site (Postgres + the app + generated image variants).
- **Network**: same bridge/VLAN as your other service containers, static
  IP or a DHCP reservation (NPM will point at this IP by hostname/IP, so
  it shouldn't move).

Inside the container, install Docker:

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

## 2. Get the code onto the container

```bash
git clone https://github.com/<you>/<repo>.git /opt/photo-gallery
cd /opt/photo-gallery
```

(If the repo doesn't exist on GitHub yet: create it there first, push this
local repo's `main` branch to it, then clone as above. The self-hosted
runner in step 6 also needs this to already exist.)

## 3. Create `.env`

```bash
cp .env.example .env
nano .env  # or your editor of choice
```

At minimum: `POSTGRES_PASSWORD` (and `DATABASE_URL`'s password — they must
match), `AUTH_SECRET` (generate with `openssl rand -base64 32`),
`ADMIN_EMAIL`/`ADMIN_PASSWORD`, `NEXT_PUBLIC_SITE_URL` (your real `https://`
domain, e.g. `https://photo.sdvproductions.org` — used for absolute URLs
and baked into the client bundle at build time, so it must be set correctly
_before_ the first build, not just at runtime).

This file is gitignored on purpose and never touched by CI — it's the one
thing that has to exist on the host independent of any checkout, both for
this manual first-boot walkthrough and for the automated deploy in step 6.

## 4. Why the build order matters

Home, `/places`, `/about`, and every published album are statically
generated at build time (ISR) — they query Postgres directly during
`next build`, and **the tables need to already exist**, not just a
reachable connection (verified directly: building `app` against a DB with
no migrations applied yet fails outright, `P2021` — table does not exist).
Migrations can't run _from_ the `app` image either, because building that
image is exactly the step that requires them to have already run —
chicken-and-egg.

The Dockerfile's `migrator` stage breaks the cycle: it's a separate,
lightweight build target (just Prisma + the schema, no app source, so it
never needs `db` at build time) that only runs migrations _against_ `db` at
container-run time. `docker-compose.yml`'s `app.build.network` key joins
the `app` build itself to `db`'s network so `next build` can reach
`db:5432` once the migrator has already applied the schema. This is also
why `app`'s runtime commands use the `next`/`prisma`/`tsx` binaries
directly (`node_modules/.bin/...`) instead of `pnpm start`/`pnpm prisma` —
pnpm wraps script execution in a workspace-consistency check that tries to
write a temp file into `/app`, which the container's non-root user can't
do (verified directly — this is not a hypothetical concern).

## 5. First boot

1. **Start Postgres first, and wait for it to be healthy:**

   ```bash
   docker compose up -d db
   docker compose ps  # wait until db shows "healthy"
   ```

2. **Build the migrator image and run migrations** against `db`:

   ```bash
   docker build --target migrator -t photo-gallery-migrator .
   docker run --rm --network photo-gallery-net --env-file .env \
     photo-gallery-migrator
   ```

3. **Seed optionally**, using that same migrator image with its command
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

4. **Build the app image** (now that the schema — and, if you seeded, the
   data — exists, `next build`'s static generation succeeds), and **start
   everything:**

   ```bash
   docker compose build app
   docker compose up -d
   ```

5. **Verify locally, before touching the proxy:**

   ```bash
   curl -I http://localhost:3000/places
   ```

   should return `200`. If it doesn't, `docker compose logs app` first —
   don't move on to NPM until this works.

## 6. Point Nginx Proxy Manager at it

In NPM's own UI (**Hosts → Proxy Hosts → Add Proxy Host**), same pattern as
every other service already listed there:

- **Domain Names**: `photo.sdvproductions.org`
- **Scheme**: `http`
- **Forward Hostname / IP**: this LXC's IP address
- **Forward Port**: `3000`
- **Block Common Exploits**: on
- **SSL tab**: request a new Let's Encrypt certificate, force SSL, HTTP/2
  — same as `stream.sdvproductions.org`/`tcloud.sdvproductions.org` etc.

Once DNS for `photo.sdvproductions.org` points at your public IP (or NPM
is otherwise reachable for the ACME HTTP-01 challenge), save — NPM
requests the certificate and starts proxying. `https://photo.sdvproductions.org/places`
and `https://photo.sdvproductions.org/admin/login` should both load.

## 7. CI/CD — deploy automatically on push to `main`

`.github/workflows/deploy.yml` does this in two stages: a `verify` job on a
regular GitHub-hosted runner (typecheck, lint, test — fast, no homelab
access needed, and it gates the next stage so a broken build never reaches
your server), then a `deploy` job that only runs if `verify` passes.

The `deploy` job needs to run _on the LXC itself_ — a self-hosted GitHub
Actions runner, which polls GitHub outbound, so nothing needs to be opened
inbound from the internet to this container:

1. On GitHub: repo → **Settings → Actions → Runners → New self-hosted
   runner**, choose Linux/x64. Copy the `config.sh ... --token ...` command
   it gives you.
2. On the LXC, as a non-root user, in a dedicated directory (**not**
   `/opt/photo-gallery`, which is the deploy checkout — this is the
   runner's own install, separate from it):

   ```bash
   mkdir ~/actions-runner && cd ~/actions-runner
   curl -o actions-runner-linux-x64.tar.gz -L \
     https://github.com/actions/runner/releases/latest/download/actions-runner-linux-x64-2.XXX.X.tar.gz
   tar xzf actions-runner-linux-x64.tar.gz
   ./config.sh --url https://github.com/<you>/<repo> --token <TOKEN> --labels photo-gallery
   ```

   (Use the exact download URL and token GitHub's UI shows you — they're
   per-repo and the token is single-use/short-lived.)

3. Install it as a service so it survives reboots and keeps polling:

   ```bash
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```

4. The runner's own working directory (`~/actions-runner/_work/<repo>/<repo>`)
   is where `actions/checkout` puts the code each run — **not**
   `/opt/photo-gallery`. Either point the runner's work dir _at_
   `/opt/photo-gallery` (simplest: delete `~/actions-runner/_work` if it
   already exists, then `ln -s /opt/photo-gallery ~/actions-runner/_work`
   before starting the service — checkout will then update that same
   directory every run instead of a separate clone), or just copy your
   already-created `.env` into the runner's own checkout path once. Either
   way, the workflow's very first real step fails loudly
   (`.env is missing`) if this isn't in place, rather than silently
   deploying with missing secrets.

From here on, every push to `main` (or a manual run from the Actions tab)
rebuilds and redeploys automatically — the deploy job runs the exact same
migrate-then-build-then-restart sequence as the "Updating the app" section
below, just triggered by CI instead of by hand.

## Updating the app (manually, without CI)

Useful for a one-off change you don't want to go through a push for, or
for debugging what the workflow does:

```bash
git pull
docker compose up -d db          # make sure it's running/healthy
docker build --target migrator -t photo-gallery-migrator .
docker run --rm --network photo-gallery-net --env-file .env \
  photo-gallery-migrator
docker compose build app
docker compose up -d app
```

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

**Cron, scheduled on the Proxmox host** (or inside the LXC — wherever
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
