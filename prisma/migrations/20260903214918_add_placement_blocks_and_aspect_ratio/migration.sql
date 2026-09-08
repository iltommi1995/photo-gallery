-- CreateEnum
CREATE TYPE "PlacementType" AS ENUM ('PHOTO', 'TEXT');

-- DropForeignKey
ALTER TABLE "Placement" DROP CONSTRAINT "Placement_photoId_fkey";

-- AlterTable
ALTER TABLE "Placement" ADD COLUMN     "preserveAspectRatio" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "textContent" TEXT,
ADD COLUMN     "type" "PlacementType" NOT NULL DEFAULT 'PHOTO',
ALTER COLUMN "photoId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
