#!/usr/bin/env bash
# Backs up the production Postgres database and the photo-storage volume.
# Run from the repo root (where docker-compose.yml and .env live), or set
# COMPOSE_DIR. Intended for cron — see docs/deployment.md.
#
# Usage: BACKUP_DIR=/path/to/backups ./scripts/backup.sh

set -euo pipefail

COMPOSE_DIR="${COMPOSE_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
BACKUP_DIR="${BACKUP_DIR:-$COMPOSE_DIR/backups}"
DATE="$(date +%F)"

cd "$COMPOSE_DIR"
# shellcheck disable=SC1091
[ -f .env ] && set -a && source .env && set +a

: "${POSTGRES_USER:?POSTGRES_USER not set (check .env)}"
: "${POSTGRES_DB:?POSTGRES_DB not set (check .env)}"

# docker-compose.yml pins the project name to "photo-gallery" (top-level
# `name:` key), so the volume name is deterministic regardless of what
# directory the repo is checked out into.
STORAGE_VOLUME="photo-gallery_photo-storage"

mkdir -p "$BACKUP_DIR"

echo "Backing up database..."
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip > "$BACKUP_DIR/db-$DATE.sql.gz"

echo "Backing up photo storage volume ($STORAGE_VOLUME)..."
docker run --rm \
  -v "$STORAGE_VOLUME":/data:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/storage-$DATE.tar.gz" -C /data .

echo "Done: $BACKUP_DIR/db-$DATE.sql.gz, $BACKUP_DIR/storage-$DATE.tar.gz"
