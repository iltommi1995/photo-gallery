-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "backupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totpLastUsedStep" INTEGER,
ADD COLUMN     "totpSecret" TEXT;
