-- CreateEnum
CREATE TYPE "LocalReportFrequency" AS ENUM ('WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "LocalEvent" ADD COLUMN     "visitId" TEXT;

-- CreateTable
CREATE TABLE "LocalVisit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "touchpointId" TEXT,
    "source" "ContactSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocalVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalReportSetting" (
    "companyId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "frequency" "LocalReportFrequency" NOT NULL DEFAULT 'MONTHLY',
    "recipientIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nextPeriodStart" TIMESTAMP(3),
    "measurementSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalReportSetting_pkey" PRIMARY KEY ("companyId")
);

-- CreateTable
CREATE TABLE "LocalReport" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "frequency" "LocalReportFrequency" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "snapshot" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockToken" TEXT,
    "lockedUntil" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedAt" TIMESTAMP(3),

    CONSTRAINT "LocalReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalReportDelivery" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'REPORT',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "firstAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "lockToken" TEXT,
    "providerId" TEXT,
    "lastError" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocalReportDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LocalVisit_companyId_createdAt_idx" ON "LocalVisit"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "LocalReport_status_nextAttemptAt_idx" ON "LocalReport"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "LocalReport_companyId_frequency_periodStart_key" ON "LocalReport"("companyId", "frequency", "periodStart");

-- CreateIndex
CREATE INDEX "LocalReportDelivery_status_nextAttemptAt_idx" ON "LocalReportDelivery"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "LocalReportDelivery_reportId_recipientId_kind_key" ON "LocalReportDelivery"("reportId", "recipientId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "LocalEvent_visitId_eventType_key" ON "LocalEvent"("visitId", "eventType");

-- AddForeignKey
ALTER TABLE "LocalEvent" ADD CONSTRAINT "LocalEvent_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "LocalVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalVisit" ADD CONSTRAINT "LocalVisit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalVisit" ADD CONSTRAINT "LocalVisit_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "LocalCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalVisit" ADD CONSTRAINT "LocalVisit_touchpointId_fkey" FOREIGN KEY ("touchpointId") REFERENCES "LocalTouchpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalReportSetting" ADD CONSTRAINT "LocalReportSetting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalReport" ADD CONSTRAINT "LocalReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalReportDelivery" ADD CONSTRAINT "LocalReportDelivery_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "LocalReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- New measurement starts here; old ambiguous scans are never rewritten.
INSERT INTO "LocalReportSetting" ("companyId", "measurementSince", "updatedAt")
SELECT "companyId", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "CompanyProductLicense" WHERE product='LOCAL'
ON CONFLICT ("companyId") DO NOTHING;

ALTER TABLE "LocalReport" ADD CONSTRAINT "LocalReport_status_check" CHECK (status IN ('PENDING','READY','FAILED'));
ALTER TABLE "LocalReportDelivery" ADD CONSTRAINT "LocalReportDelivery_status_check"
CHECK (status IN ('PENDING','SENT','PREVIEW','FAILED','UNKNOWN','CANCELLED'));
ALTER TABLE "LocalReportDelivery" ADD CONSTRAINT "LocalReportDelivery_kind_check" CHECK (kind IN ('REPORT','ALERT'));
ALTER TABLE "LocalReport" ADD CONSTRAINT "LocalReport_period_check" CHECK ("periodEnd">"periodStart");

CREATE TRIGGER "LocalCampaign_prevent_company_transfer"
BEFORE UPDATE OF "companyId" ON "LocalCampaign"
FOR EACH ROW EXECUTE FUNCTION prevent_business_tenant_transfer();

CREATE OR REPLACE FUNCTION validate_local_visit_tenant() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "LocalCampaign" c WHERE c.id=NEW."campaignId" AND c."companyId"=NEW."companyId") THEN
    RAISE EXCEPTION 'Invalid Local visit tenant';
  END IF;
  IF NEW."touchpointId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "LocalTouchpoint" t WHERE t.id=NEW."touchpointId" AND t."campaignId"=NEW."campaignId"
  ) THEN RAISE EXCEPTION 'Invalid Local visit touchpoint'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LocalVisit_validate_tenant" BEFORE INSERT OR UPDATE ON "LocalVisit"
FOR EACH ROW EXECUTE FUNCTION validate_local_visit_tenant();
CREATE TRIGGER "LocalVisit_prevent_company_transfer" BEFORE UPDATE OF "companyId" ON "LocalVisit"
FOR EACH ROW EXECUTE FUNCTION prevent_business_tenant_transfer();
CREATE TRIGGER "LocalReport_prevent_company_transfer" BEFORE UPDATE OF "companyId" ON "LocalReport"
FOR EACH ROW EXECUTE FUNCTION prevent_business_tenant_transfer();

CREATE OR REPLACE FUNCTION validate_local_event_visit() RETURNS trigger AS $$
BEGIN
  IF NEW."visitId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "LocalVisit" v WHERE v.id=NEW."visitId" AND v."campaignId"=NEW."campaignId"
      AND v."touchpointId" IS NOT DISTINCT FROM NEW."touchpointId"
  ) THEN RAISE EXCEPTION 'Invalid Local event visit'; END IF;
  IF NEW."subscriberId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "LocalSubscriber" s WHERE s.id=NEW."subscriberId" AND s."campaignId"=NEW."campaignId"
  ) THEN RAISE EXCEPTION 'Invalid Local event subscriber'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LocalEvent_validate_visit" BEFORE INSERT OR UPDATE ON "LocalEvent"
FOR EACH ROW EXECUTE FUNCTION validate_local_event_visit();
