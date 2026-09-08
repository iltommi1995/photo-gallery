-- Replace the fixed SMALL/MEDIUM/LARGE/FULL preset with free colSpan/rowSpan,
-- so the admin editor can pick an arbitrary width x height in grid cells.
-- Backfill colSpan/rowSpan from the legacy `size` enum before dropping it,
-- so existing published layouts (Milan, Berlin, Dresden, ...) keep their
-- current appearance instead of collapsing to the 1x1 default.
UPDATE "Placement" SET
  "colSpan" = CASE "size"
    WHEN 'SMALL' THEN 1
    WHEN 'MEDIUM' THEN 2
    WHEN 'LARGE' THEN 2
    WHEN 'FULL' THEN 4
  END,
  "rowSpan" = CASE "size"
    WHEN 'SMALL' THEN 1
    WHEN 'MEDIUM' THEN 1
    WHEN 'LARGE' THEN 2
    WHEN 'FULL' THEN 2
  END
WHERE "colSpan" IS NULL OR "rowSpan" IS NULL;

-- AlterTable
ALTER TABLE "Placement" ALTER COLUMN "colSpan" SET NOT NULL,
ALTER COLUMN "colSpan" SET DEFAULT 1,
ALTER COLUMN "rowSpan" SET NOT NULL,
ALTER COLUMN "rowSpan" SET DEFAULT 1,
DROP COLUMN "size";

-- DropEnum
DROP TYPE "PlacementSize";
