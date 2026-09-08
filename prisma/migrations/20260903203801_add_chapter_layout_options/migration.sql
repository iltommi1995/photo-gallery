-- CreateEnum
CREATE TYPE "ChapterLayout" AS ENUM ('PAGED', 'CONTINUOUS');

-- AlterTable
ALTER TABLE "Album" ADD COLUMN     "chapterLayout" "ChapterLayout" NOT NULL DEFAULT 'PAGED',
ADD COLUMN     "showChapterLabels" BOOLEAN NOT NULL DEFAULT true;
