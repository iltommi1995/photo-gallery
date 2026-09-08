-- Split the single MOBILE viewport into two orientation-specific values.
--
-- This is a data-preserving alternative to Prisma's default enum-change
-- behavior (drop + recreate the type), which would fail for existing rows
-- referencing 'MOBILE' or silently lose data. Renaming the value in place
-- keeps every existing Placement row that currently has viewport = 'MOBILE'
-- pointing at the same (renamed) value, with no data loss and no need for
-- the user to redo their mosaic authoring.
--
-- ALTER TYPE ... RENAME VALUE has been supported since PostgreSQL 10, and
-- ALTER TYPE ... ADD VALUE has been usable inside a transaction block since
-- PostgreSQL 12 (this project runs postgres:17-alpine, see
-- docker-compose.dev.yml). The new value added below (MOBILE_PORTRAIT) is
-- not referenced anywhere else in this same migration/transaction, so the
-- historical "can't use a new enum value in the same transaction it was
-- added in" restriction does not apply here.

-- Rename the existing value in place (preserves every row currently using it)
ALTER TYPE "Viewport" RENAME VALUE 'MOBILE' TO 'MOBILE_LANDSCAPE';

-- Add the new value
ALTER TYPE "Viewport" ADD VALUE 'MOBILE_PORTRAIT';
