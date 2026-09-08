-- CreateEnum
CREATE TYPE "Viewport" AS ENUM ('WEB', 'MOBILE');

-- DropIndex
DROP INDEX "Placement_chapterId_order_idx";

-- AlterTable
ALTER TABLE "Placement" ADD COLUMN     "viewport" "Viewport" NOT NULL DEFAULT 'WEB';

-- CreateIndex
CREATE INDEX "Placement_chapterId_viewport_order_idx" ON "Placement"("chapterId", "viewport", "order");
