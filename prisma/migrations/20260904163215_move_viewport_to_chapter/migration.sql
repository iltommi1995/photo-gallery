-- Move `viewport` from Placement up to Chapter, so a chapter's own
-- *structure* (count/labels/order) can differ per context, not just the
-- photos placed within otherwise-shared chapter boundaries.
--
-- This is a data-preserving alternative to a plain Prisma-generated
-- migration, which would just add Chapter.viewport (fine) but then drop
-- Placement.viewport outright (data loss for every already-authored
-- MOBILE_LANDSCAPE placement — 11 rows across 3 chapters on the real
-- "Montenegro 35mm 2026" album as of this migration). Instead:
--
--   1. Add Chapter.viewport, additive, default 'WEB' — zero behavior
--      change for existing rows.
--   2. For every existing Chapter that has one or more Placement rows with
--      viewport = 'MOBILE_LANDSCAPE', create ONE new sibling Chapter row
--      (same albumId/label/order, viewport = 'MOBILE_LANDSCAPE'), then
--      reassign exactly those placements (via UPDATE ... SET "chapterId")
--      onto the new chapter. The original chapter keeps its WEB-viewport
--      placements untouched and becomes purely WEB once this is done. A
--      DO block is required (not a flat INSERT ... SELECT) because each
--      new chapter's generated id must be captured per source row, to
--      retarget only that source chapter's MOBILE_LANDSCAPE placements.
--      No MOBILE_PORTRAIT placements exist yet, so there is nothing to do
--      for that value.
--   3. Once every Placement row that "needed" its own viewport tag has
--      been reassigned to a viewport-specific Chapter via step 2, drop
--      Placement.viewport (now redundant/inherited from the parent
--      Chapter) and its index, and add the new Chapter index.

-- Step 1: additive Chapter.viewport column.
ALTER TABLE "Chapter" ADD COLUMN "viewport" "Viewport" NOT NULL DEFAULT 'WEB';

-- Step 2: split out MOBILE_LANDSCAPE placements onto new sibling chapters.
DO $$
DECLARE
  src_chapter RECORD;
  new_chapter_id TEXT;
BEGIN
  FOR src_chapter IN
    SELECT DISTINCT c.id, c."albumId", c.label, c."order"
    FROM "Chapter" c
    JOIN "Placement" p ON p."chapterId" = c.id
    WHERE p.viewport = 'MOBILE_LANDSCAPE'
  LOOP
    new_chapter_id := 'clone_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20);

    INSERT INTO "Chapter" (id, "albumId", viewport, label, "order")
    VALUES (
      new_chapter_id,
      src_chapter."albumId",
      'MOBILE_LANDSCAPE',
      src_chapter.label,
      src_chapter."order"
    );

    UPDATE "Placement"
    SET "chapterId" = new_chapter_id
    WHERE "chapterId" = src_chapter.id
      AND viewport = 'MOBILE_LANDSCAPE';
  END LOOP;
END $$;

-- Step 3: drop the now-redundant Placement.viewport column and its index;
-- add the new Chapter index; drop Chapter's old (pre-viewport) index.
DROP INDEX "Chapter_albumId_order_idx";
DROP INDEX "Placement_chapterId_viewport_order_idx";

ALTER TABLE "Placement" DROP COLUMN "viewport";

CREATE INDEX "Chapter_albumId_viewport_order_idx" ON "Chapter"("albumId", "viewport", "order");
CREATE INDEX "Placement_chapterId_order_idx" ON "Placement"("chapterId", "order");
