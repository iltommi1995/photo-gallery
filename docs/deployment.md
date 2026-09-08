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
- **Resources**: 2 CPU cores, **4 GB RAM** (2 GB is not enough — a real
  deploy hit swap exhaustion and effectively hung during `next build`'s
  Turbopack compile with only 2 GB RAM / 512 MB swap; bumping to 4 GB RAM
  / 2 GB swap resolved it), 16+ GB disk. Comfortable for a personal photo
  site (Postgres + the app + generated image variants) once sized this way.
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
runner in step 8 also needs this to already exist.)

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
this manual first-boot walkthrough and for the automated deploy in step 8.

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
container-run time. The `app` build itself still needs to reach `db:5432`
once the migrator has already applied the schema — see step 5 below for
how that's wired up (it's _not_ a plain compose `network:` key, which
BuildKit rejects). This is also why `app`'s runtime commands use the
`next`/`prisma`/`tsx` binaries directly (`node_modules/.bin/...`) instead
of `pnpm start`/`pnpm prisma` — pnpm wraps script execution in a
workspace-consistency check that tries to write a temp file into `/app`,
which the container's non-root user can't do (verified directly — this is
not a hypothetical concern).

## 5. One-time buildx builder setup

`docker compose build` goes through BuildKit (via `docker buildx bake` on
recent Compose versions), which only accepts `default`/`none`/`host` for a
service's `build.network` — a named bridge network like the
`photo-gallery-net` this stack creates is rejected outright
(`network mode "photo-gallery-net" not supported by buildkit`), discovered
live during a real deployment. `docker-compose.yml` sets `network: host`
for `app`'s build, but that alone isn't enough — for a plain default
builder, `host` means the actual machine's network, which doesn't help
`db` resolve. It only becomes useful once paired with a **network-attached
buildx builder**: for a `docker-container`-driver builder created with
`--driver-opt network=photo-gallery-net`, BuildKit's `host` network mode
means "the builder's own container's network" — which, for this specific
builder, _is_ `photo-gallery-net`. Create it once per host (and per OS
user that runs builds — buildx builders are stored under that user's
`~/.docker/buildx`, so the self-hosted CI runner user in step 8 needs this
done for its own account too, separately from whichever user does it
here):

```bash
docker buildx create --name photo-gallery-builder \
  --driver docker-container --driver-opt network=photo-gallery-net --use
docker buildx inspect --bootstrap
```

`--use` makes it the default builder for future `docker build`/
`docker compose build` invocations by that user — nothing else needs to
reference it by name (or pass `BUILDX_BUILDER=photo-gallery-builder`
explicitly if `--use` didn't stick, which some Compose/bake versions seem
to need). This only needs to be done once — it survives reboots of the
container itself, but **not** if the container running Docker gets
rebooted (e.g. after resizing its RAM, see step 6): the builder's own
backing container doesn't restart automatically, and re-running the two
commands above (harmless if it already exists — `docker buildx rm
photo-gallery-builder` first if `create` complains) fixes a
`Can't reach database server at db:5432` failure during `RUN pnpm build`
that otherwise looks identical to the network-not-supported error from a
missing builder, but isn't the same problem.

## 6. First boot

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

## 7. Point Nginx Proxy Manager at it

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

## 8. CI/CD — deploy automatically on push to `main`

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
   ./config.sh --url https://github.com/<you>/<repo> --token <TOKEN>
   ```

   No `--labels` needed — `deploy.yml` targets plain `runs-on: self-hosted`
   (an earlier attempt to scope it to a custom `photo-gallery` label
   failed silently: the flag didn't stick, and every deploy sat forever
   waiting for a runner that was never considered a match). One
   self-hosted runner per repo is enough for `self-hosted` alone to be
   unambiguous.

   (Use the exact download URL and token GitHub's UI shows you — they're
   per-repo and the token is single-use/short-lived.)

3. Install it as a service so it survives reboots and keeps polling:

   ```bash
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```

4. The runner's own working directory
   (`~/actions-runner/_work/<repo>/<repo>`) is where `actions/checkout`
   puts the code each run — **not** `/opt/photo-gallery`, a separate
   clone. Don't try to symlink `_work` itself at `/opt/photo-gallery` to
   unify them — tried live, and it doesn't work: `_work` is a parent
   directory, `actions/checkout` creates the actual `<repo>/<repo>`
   checkout _inside_ whatever `_work` resolves to, so a symlink there
   just relocates that nesting into `/opt/photo-gallery` instead of
   replacing it, silently polluting the manual clone with a second one.
   Instead, let the runner use its own default `_work` untouched, and
   copy `.env` into the real checkout path once, after the first run has
   created it (a fresh runner's very first job fails at the `.env` check
   below — that's expected, it creates the directory to copy into):
   ```bash
   cp /opt/photo-gallery/.env \
     ~/actions-runner/_work/photo-gallery/photo-gallery/.env
   ```
   This only survives across runs because `deploy.yml`'s checkout step
   sets `clean: false` — the default `actions/checkout` behavior runs
   `git clean -ffdx` before every checkout, which would otherwise wipe
   this gitignored file again on the very next deploy (also discovered
   live: copying it once did not, in fact, stick). The workflow's very
   first real step fails loudly (`.env is missing`) if this isn't in
   place, rather than silently deploying with missing secrets.
5. `svc.sh install` runs the runner as whichever non-root user invoked
   `config.sh` above — that user needs its own network-attached buildx
   builder (see step 5 near the top of this doc), separately from whichever
   user (e.g. `root`) set one up for the manual first boot. Run the same
   two commands as that user before the first automated deploy, or its
   `docker compose build app` step fails with the same
   `network mode ... not supported by buildkit` error covered there.

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
