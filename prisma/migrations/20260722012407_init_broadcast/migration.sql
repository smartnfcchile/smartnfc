-- CreateEnum
CREATE TYPE "LocalBroadcastBatchStatus" AS ENUM ('EXPORTED', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BroadcastRemovalReason" AS ENUM ('OPTED_OUT', 'BLOCKED');

-- AlterEnum
ALTER TYPE "LocalEventType" ADD VALUE 'VCF_DOWNLOAD';

-- AlterTable
ALTER TABLE "LocalSubscriber" ADD COLUMN     "lastSubscribedAt" TIMESTAMP(3);
UPDATE "LocalSubscriber" SET "lastSubscribedAt" = "firstSubscribedAt" WHERE "lastSubscribedAt" IS NULL;
ALTER TABLE "LocalSubscriber" ALTER COLUMN "lastSubscribedAt" SET NOT NULL;
ALTER TABLE "LocalSubscriber" ALTER COLUMN "lastSubscribedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "LocalBroadcastExportBatch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "campaignId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "confirmedByUserId" TEXT,
    "status" "LocalBroadcastBatchStatus" NOT NULL DEFAULT 'EXPORTED',
    "activeScopeKey" TEXT,

    CONSTRAINT "LocalBroadcastExportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalBroadcastExportItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "consentRecordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocalBroadcastExportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalBroadcastRemoval" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "consentRecordId" TEXT NOT NULL,
    "reason" "BroadcastRemovalReason" NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedByUserId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalBroadcastRemoval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LocalBroadcastExportBatch_activeScopeKey_key" ON "LocalBroadcastExportBatch"("activeScopeKey");

-- CreateIndex
CREATE INDEX "LocalBroadcastExportBatch_companyId_idx" ON "LocalBroadcastExportBatch"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "LocalBroadcastExportItem_batchId_subscriberId_key" ON "LocalBroadcastExportItem"("batchId", "subscriberId");

-- CreateIndex
CREATE INDEX "LocalBroadcastRemoval_subscriberId_idx" ON "LocalBroadcastRemoval"("subscriberId");

-- CreateIndex
CREATE UNIQUE INDEX "LocalBroadcastRemoval_subscriberId_consentRecordId_key" ON "LocalBroadcastRemoval"("subscriberId", "consentRecordId");

-- AddForeignKey
ALTER TABLE "LocalBroadcastExportBatch" ADD CONSTRAINT "LocalBroadcastExportBatch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalBroadcastExportBatch" ADD CONSTRAINT "LocalBroadcastExportBatch_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "LocalCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalBroadcastExportBatch" ADD CONSTRAINT "LocalBroadcastExportBatch_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalBroadcastExportBatch" ADD CONSTRAINT "LocalBroadcastExportBatch_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalBroadcastExportItem" ADD CONSTRAINT "LocalBroadcastExportItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "LocalBroadcastExportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalBroadcastExportItem" ADD CONSTRAINT "LocalBroadcastExportItem_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "LocalSubscriber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalBroadcastExportItem" ADD CONSTRAINT "LocalBroadcastExportItem_consentRecordId_fkey" FOREIGN KEY ("consentRecordId") REFERENCES "LocalConsentRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalBroadcastRemoval" ADD CONSTRAINT "LocalBroadcastRemoval_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "LocalSubscriber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalBroadcastRemoval" ADD CONSTRAINT "LocalBroadcastRemoval_consentRecordId_fkey" FOREIGN KEY ("consentRecordId") REFERENCES "LocalConsentRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalBroadcastRemoval" ADD CONSTRAINT "LocalBroadcastRemoval_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalBroadcastRemoval" ADD CONSTRAINT "LocalBroadcastRemoval_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
