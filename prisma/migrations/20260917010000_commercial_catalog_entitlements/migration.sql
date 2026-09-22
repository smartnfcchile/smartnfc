BEGIN;
-- CreateEnum
CREATE TYPE "ProfileRightOrigin" AS ENUM ('INTERNAL', 'PILOT', 'PURCHASE', 'LEGACY_PRESERVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProductPlanCode" ADD VALUE 'EMPRESAS_PROFILE';
ALTER TYPE "ProductPlanCode" ADD VALUE 'EMPRESAS_PRO';
ALTER TYPE "ProductPlanCode" ADD VALUE 'EMPRESAS_PILOT';
ALTER TYPE "ProductPlanCode" ADD VALUE 'EMPRESAS_TEAM_5';
ALTER TYPE "ProductPlanCode" ADD VALUE 'EMPRESAS_TEAM_10';
ALTER TYPE "ProductPlanCode" ADD VALUE 'EMPRESAS_TEAM_25';
ALTER TYPE "ProductPlanCode" ADD VALUE 'EMPRESAS_TEAM_CONTRACT';
ALTER TYPE "ProductPlanCode" ADD VALUE 'LOCAL_PRO';
ALTER TYPE "ProductPlanCode" ADD VALUE 'LOCAL_PACK_3';
ALTER TYPE "ProductPlanCode" ADD VALUE 'LOCAL_PACK_5';
ALTER TYPE "ProductPlanCode" ADD VALUE 'LOCAL_CONTRACT';

-- AlterTable
ALTER TABLE "LocalCampaign" ADD COLUMN     "locationId" TEXT;

-- AlterTable
ALTER TABLE "CompanyProductLicense" ADD COLUMN     "maxActiveTouchpointsPerLocation" INTEGER;

-- CreateTable
CREATE TABLE "CardProfileRight" (
    "cardId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "origin" "ProfileRightOrigin" NOT NULL,
    "reference" TEXT,
    "reason" TEXT NOT NULL,
    "grantedByUserId" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,

    CONSTRAINT "CardProfileRight_pkey" PRIMARY KEY ("cardId")
);

-- CreateTable
CREATE TABLE "LocalLocation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT,
    "address" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'MANUAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyCapabilityOverride" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyCapabilityOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyLimitOverride" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "limit" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyLimitOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardProfileRight_companyId_idx" ON "CardProfileRight"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CardProfileRight_cardId_companyId_key" ON "CardProfileRight"("cardId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "LocalLocation_id_companyId_key" ON "LocalLocation"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "LocalLocation_companyId_key_key" ON "LocalLocation"("companyId", "key");

-- CreateIndex
CREATE INDEX "CompanyCapabilityOverride_companyId_capability_startsAt_idx" ON "CompanyCapabilityOverride"("companyId", "capability", "startsAt");

-- CreateIndex
CREATE INDEX "CompanyLimitOverride_companyId_limit_startsAt_idx" ON "CompanyLimitOverride"("companyId", "limit", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Card_id_companyId_key" ON "Card"("id", "companyId");

-- AddForeignKey
ALTER TABLE "LocalCampaign" ADD CONSTRAINT "LocalCampaign_locationId_companyId_fkey" FOREIGN KEY ("locationId", "companyId") REFERENCES "LocalLocation"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardProfileRight" ADD CONSTRAINT "CardProfileRight_cardId_companyId_fkey" FOREIGN KEY ("cardId", "companyId") REFERENCES "Card"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardProfileRight" ADD CONSTRAINT "CardProfileRight_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalLocation" ADD CONSTRAINT "LocalLocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyCapabilityOverride" ADD CONSTRAINT "CompanyCapabilityOverride_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyLimitOverride" ADD CONSTRAINT "CompanyLimitOverride_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- No automatic backfill: origin (INTERNAL/PILOT/PURCHASE/LEGACY_PRESERVED) is always an explicit,
-- auditable Superadmin decision per Card, never inferred from continuity alone.

INSERT INTO "LocalLocation" ("id", "companyId", "key", "origin", "createdAt", "updatedAt")
SELECT 'legacy_location_' || "companyId", "companyId", 'legacy-initial', 'LEGACY_TECHNICAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "LocalCampaign" GROUP BY "companyId"
ON CONFLICT ("companyId", "key") DO NOTHING;
UPDATE "LocalCampaign" c SET "locationId" = l."id"
FROM "LocalLocation" l WHERE l."companyId" = c."companyId" AND l."key" = 'legacy-initial' AND c."locationId" IS NULL;

ALTER TABLE "CompanyProductLicense" ADD CONSTRAINT "License_new_point_limit_nonnegative" CHECK ("maxActiveTouchpointsPerLocation" IS NULL OR "maxActiveTouchpointsPerLocation" >= 0);
ALTER TABLE "CardProfileRight" ADD CONSTRAINT "ProfileRight_validity" CHECK (length(trim("reason")) > 0 AND ("expiresAt" IS NULL OR "expiresAt" > "grantedAt"));
ALTER TABLE "CompanyCapabilityOverride" ADD CONSTRAINT "Capability_override_validity" CHECK (length(trim("reason")) > 0 AND ("expiresAt" IS NULL OR "expiresAt" > "startsAt"));
ALTER TABLE "CompanyLimitOverride" ADD CONSTRAINT "Limit_override_validity" CHECK ("value" >= 0 AND length(trim("reason")) > 0 AND ("expiresAt" IS NULL OR "expiresAt" > "startsAt"));

-- New ownership boundaries are immutable just like existing Empresas resources.
CREATE TRIGGER "LocalLocation_prevent_company_transfer" BEFORE UPDATE OF "companyId" ON "LocalLocation"
FOR EACH ROW EXECUTE FUNCTION prevent_business_tenant_transfer();
CREATE TRIGGER "CardProfileRight_prevent_company_transfer" BEFORE UPDATE OF "companyId" ON "CardProfileRight"
FOR EACH ROW EXECUTE FUNCTION prevent_business_tenant_transfer();
CREATE TRIGGER "CapabilityOverride_prevent_company_transfer" BEFORE UPDATE OF "companyId" ON "CompanyCapabilityOverride"
FOR EACH ROW EXECUTE FUNCTION prevent_business_tenant_transfer();
CREATE TRIGGER "LimitOverride_prevent_company_transfer" BEFORE UPDATE OF "companyId" ON "CompanyLimitOverride"
FOR EACH ROW EXECUTE FUNCTION prevent_business_tenant_transfer();

COMMIT;
