-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'COMPANY_OWNER', 'COMPANY_ADMIN', 'COLLABORATOR');

-- CreateEnum
CREATE TYPE "NfcStatus" AS ENUM ('PENDIENTE_GRABACION', 'GRABADA', 'ENVIADA', 'ENTREGADA', 'ACTIVA', 'SUSPENDIDA');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('VIEW', 'NFC_SCAN', 'WHATSAPP_CLICK', 'PHONE_CLICK', 'EMAIL_CLICK', 'LINK_CLICK', 'VCARD_DOWNLOAD');

-- CreateEnum
CREATE TYPE "LocalCampaignStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LocalCampaignTemplate" AS ENUM ('URBAN');

-- CreateEnum
CREATE TYPE "LocalSubscriberStatus" AS ENUM ('ACTIVE', 'OPTED_OUT', 'BLOCKED');

-- CreateEnum
CREATE TYPE "LocalEventType" AS ENUM ('VIEW', 'NFC_SCAN', 'QR_SCAN', 'SUBSCRIPTION', 'WHATSAPP_REDIRECT');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "plan" "PlanType" NOT NULL DEFAULT 'FREE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxIdentities" INTEGER NOT NULL DEFAULT 5,
    "licenseStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "licenseStart" TIMESTAMP(3),
    "licenseEnd" TIMESTAMP(3),
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'COLLABORATOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "themeColor" TEXT NOT NULL DEFAULT '#2563eb',
    "themeMode" TEXT NOT NULL DEFAULT 'dark',
    "template" TEXT NOT NULL DEFAULT 'corporate-1',
    "bannerStyle" TEXT NOT NULL DEFAULT 'classic',
    "photoStyle" TEXT NOT NULL DEFAULT 'circle',
    "logoUrl" TEXT,
    "avatarUrl" TEXT,
    "coverUrl" TEXT,
    "profileName" TEXT,
    "role" TEXT,
    "companyName" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "videoUrl" TEXT,
    "videoTitle" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "linkedin" TEXT,
    "tiktok" TEXT,
    "youtube" TEXT,
    "showEmail" BOOLEAN NOT NULL DEFAULT true,
    "showPhone" BOOLEAN NOT NULL DEFAULT true,
    "showWhatsapp" BOOLEAN NOT NULL DEFAULT true,
    "showInstagram" BOOLEAN NOT NULL DEFAULT true,
    "showFacebook" BOOLEAN NOT NULL DEFAULT true,
    "showLinkedin" BOOLEAN NOT NULL DEFAULT true,
    "showTiktok" BOOLEAN NOT NULL DEFAULT true,
    "showYoutube" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardLink" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "cardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalNfcCard" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "uid" TEXT,
    "status" "NfcStatus" NOT NULL DEFAULT 'PENDIENTE_GRABACION',
    "batchCode" TEXT,
    "printedAt" TIMESTAMP(3),
    "encodedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "companyId" TEXT NOT NULL,
    "cardId" TEXT,
    "localTouchpointId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalNfcCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "cardId" TEXT NOT NULL,
    "physicalCardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "position" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NUEVO',
    "notes" TEXT,
    "ipHash" TEXT,
    "cardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "companyId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserActivationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Card_slug_key" ON "Card"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalNfcCard_token_key" ON "PhysicalNfcCard"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalNfcCard_uid_key" ON "PhysicalNfcCard"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalNfcCard_localTouchpointId_key" ON "PhysicalNfcCard"("localTouchpointId");

-- CreateIndex
CREATE UNIQUE INDEX "UserActivationToken_tokenHash_key" ON "UserActivationToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "LocalCampaign_slug_key" ON "LocalCampaign"("slug");

-- CreateIndex
CREATE INDEX "LocalCampaign_companyId_status_idx" ON "LocalCampaign"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LocalTouchpoint_code_key" ON "LocalTouchpoint"("code");

-- CreateIndex
CREATE INDEX "LocalTouchpoint_campaignId_isActive_idx" ON "LocalTouchpoint"("campaignId", "isActive");

-- CreateIndex
CREATE INDEX "LocalSubscriber_campaignId_status_idx" ON "LocalSubscriber"("campaignId", "status");

-- CreateIndex
CREATE INDEX "LocalSubscriber_createdAt_idx" ON "LocalSubscriber"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LocalSubscriber_campaignId_whatsapp_key" ON "LocalSubscriber"("campaignId", "whatsapp");

-- CreateIndex
CREATE INDEX "LocalConsentRecord_campaignId_acceptedAt_idx" ON "LocalConsentRecord"("campaignId", "acceptedAt");

-- CreateIndex
CREATE INDEX "LocalConsentRecord_subscriberId_acceptedAt_idx" ON "LocalConsentRecord"("subscriberId", "acceptedAt");

-- CreateIndex
CREATE INDEX "LocalEvent_campaignId_eventType_createdAt_idx" ON "LocalEvent"("campaignId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "LocalEvent_touchpointId_createdAt_idx" ON "LocalEvent"("touchpointId", "createdAt");

-- CreateIndex
CREATE INDEX "LocalEvent_subscriberId_createdAt_idx" ON "LocalEvent"("subscriberId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardLink" ADD CONSTRAINT "CardLink_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalNfcCard" ADD CONSTRAINT "PhysicalNfcCard_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalNfcCard" ADD CONSTRAINT "PhysicalNfcCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalNfcCard" ADD CONSTRAINT "PhysicalNfcCard_localTouchpointId_fkey" FOREIGN KEY ("localTouchpointId") REFERENCES "LocalTouchpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_physicalCardId_fkey" FOREIGN KEY ("physicalCardId") REFERENCES "PhysicalNfcCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActivationToken" ADD CONSTRAINT "UserActivationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

