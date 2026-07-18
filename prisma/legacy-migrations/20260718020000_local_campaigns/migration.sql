-- CreateEnum
CREATE TYPE "LocalCampaignStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LocalCampaignTemplate" AS ENUM ('URBAN');

-- CreateEnum
CREATE TYPE "LocalSubscriberStatus" AS ENUM ('ACTIVE', 'OPTED_OUT', 'BLOCKED');

-- CreateEnum
CREATE TYPE "LocalEventType" AS ENUM ('VIEW', 'NFC_SCAN', 'QR_SCAN', 'SUBSCRIPTION', 'WHATSAPP_REDIRECT');

-- AlterTable (Añadir columna para asociación opcional)
ALTER TABLE "PhysicalNfcCard" ADD COLUMN "localTouchpointId" TEXT;

-- CreateTable
CREATE TABLE "LocalCampaign" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "LocalCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "template" "LocalCampaignTemplate" NOT NULL DEFAULT 'URBAN',
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#2563eb',
    "secondaryColor" TEXT NOT NULL DEFAULT '#d4af37',
    "businessName" TEXT,
    "clubName" TEXT,
    "headline" TEXT,
    "subheadline" TEXT,
    "address" TEXT,
    "whatsappNumber" TEXT,
    "whatsappMessage" TEXT,
    "benefitLabel" TEXT,
    "benefitTitle" TEXT,
    "benefitDescription" TEXT,
    "benefitConditions" TEXT,
    "benefitStartAt" TIMESTAMP(3),
    "benefitEndAt" TIMESTAMP(3),
    "consentText" TEXT,
    "consentVersion" INTEGER NOT NULL DEFAULT 1,
    "publishedSnapshot" JSONB,
    "publishedVersion" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalTouchpoint" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalTouchpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalSubscriber" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "status" "LocalSubscriberStatus" NOT NULL DEFAULT 'ACTIVE',
    "firstSubscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastInteractionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalConsentRecord" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "consentVersion" INTEGER NOT NULL,
    "consentText" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "source" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocalConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalEvent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "touchpointId" TEXT,
    "subscriberId" TEXT,
    "eventType" "LocalEventType" NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LocalCampaign_slug_key" ON "LocalCampaign"("slug");

-- CreateIndex
CREATE INDEX "LocalCampaign_companyId_status_idx" ON "LocalCampaign"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LocalTouchpoint_code_key" ON "LocalTouchpoint"("code");

-- CreateIndex
CREATE INDEX "LocalTouchpoint_campaignId_isActive_idx" ON "LocalTouchpoint"("campaignId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LocalSubscriber_campaignId_whatsapp_key" ON "LocalSubscriber"("campaignId", "whatsapp");

-- CreateIndex
CREATE INDEX "LocalSubscriber_campaignId_status_idx" ON "LocalSubscriber"("campaignId", "status");

-- CreateIndex
CREATE INDEX "LocalSubscriber_createdAt_idx" ON "LocalSubscriber"("createdAt");

-- CreateIndex
CREATE INDEX "LocalConsentRecord_campaignId_acceptedAt_idx" ON "LocalConsentRecord"("campaignId", "acceptedAt");

-- CreateIndex
CREATE INDEX "LocalConsentRecord_subscriberId_acceptedAt_idx" ON "LocalConsentRecord"("subscriberId", "acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalNfcCard_localTouchpointId_key" ON "PhysicalNfcCard"("localTouchpointId");

-- CreateIndex
CREATE INDEX "LocalEvent_campaignId_eventType_createdAt_idx" ON "LocalEvent"("campaignId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "LocalEvent_touchpointId_createdAt_idx" ON "LocalEvent"("touchpointId", "createdAt");

-- CreateIndex
CREATE INDEX "LocalEvent_subscriberId_createdAt_idx" ON "LocalEvent"("subscriberId", "createdAt");

-- AddForeignKey
ALTER TABLE "PhysicalNfcCard" ADD CONSTRAINT "PhysicalNfcCard_localTouchpointId_fkey" FOREIGN KEY ("localTouchpointId") REFERENCES "LocalTouchpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalCampaign" ADD CONSTRAINT "LocalCampaign_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalTouchpoint" ADD CONSTRAINT "LocalTouchpoint_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "LocalCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalSubscriber" ADD CONSTRAINT "LocalSubscriber_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "LocalCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalConsentRecord" ADD CONSTRAINT "LocalConsentRecord_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "LocalSubscriber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalConsentRecord" ADD CONSTRAINT "LocalConsentRecord_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "LocalCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalEvent" ADD CONSTRAINT "LocalEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "LocalCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalEvent" ADD CONSTRAINT "LocalEvent_touchpointId_fkey" FOREIGN KEY ("touchpointId") REFERENCES "LocalTouchpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalEvent" ADD CONSTRAINT "LocalEvent_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "LocalSubscriber"("id") ON DELETE SET NULL ON UPDATE CASCADE;
