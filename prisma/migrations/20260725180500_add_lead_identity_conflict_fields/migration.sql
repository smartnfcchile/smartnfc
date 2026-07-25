-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "conflictDetails" TEXT,
ADD COLUMN     "identityConflict" BOOLEAN NOT NULL DEFAULT false;
