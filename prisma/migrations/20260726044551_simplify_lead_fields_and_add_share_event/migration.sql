-- AlterEnum
-- This migration adds the value 'PROFILE_SHARED' to the EventType enum.
ALTER TYPE "EventType" ADD VALUE 'PROFILE_SHARED';

-- AlterTable
-- This migration changes the email column in the Lead table to be nullable.
ALTER TABLE "Lead" ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
-- This migration creates a composite index on companyId and phone for the Lead table.
CREATE INDEX "Lead_companyId_phone_idx" ON "Lead"("companyId", "phone");
