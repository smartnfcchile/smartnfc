-- CreateEnum
CREATE TYPE "SmartNfcProduct" AS ENUM ('EMPRESAS', 'LOCAL');

-- CreateEnum
CREATE TYPE "ProductLicenseStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProductPlanCode" AS ENUM ('EMPRESAS_CONECTA', 'EMPRESAS_CRECE', 'EMPRESAS_ESCALA', 'EMPRESAS_CORPORATIVO', 'EMPRESAS_HISTORICO', 'LOCAL_IMPULSA', 'LOCAL_FUNDADOR', 'LOCAL_PERSONALIZADO');

-- CreateTable
CREATE TABLE "CompanyProductLicense" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "product" "SmartNfcProduct" NOT NULL,
    "planCode" "ProductPlanCode" NOT NULL,
    "status" "ProductLicenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "includedIdentities" INTEGER,
    "authorizedExtraIdentities" INTEGER DEFAULT 0,
    "includedCampaigns" INTEGER,
    "includedBranches" INTEGER,
    "includedTouchpoints" INTEGER,
    "startsAt" TIMESTAMP(3),
    "renewsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProductLicense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyProductLicense_companyId_status_idx" ON "CompanyProductLicense"("companyId", "status");

-- CreateIndex
CREATE INDEX "CompanyProductLicense_product_status_idx" ON "CompanyProductLicense"("product", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProductLicense_companyId_product_key" ON "CompanyProductLicense"("companyId", "product");

-- AddForeignKey
ALTER TABLE "CompanyProductLicense" ADD CONSTRAINT "CompanyProductLicense_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Transición de licencias existentes de Empresas
INSERT INTO "CompanyProductLicense" (
  "id",
  "companyId",
  "product",
  "planCode",
  "status",
  "includedIdentities",
  "authorizedExtraIdentities",
  "startsAt",
  "expiresAt",
  "notes",
  "createdAt",
  "updatedAt"
)
SELECT
  'cpl_emp_' || "id" AS "id",
  "id" AS "companyId",
  'EMPRESAS'::"SmartNfcProduct" AS "product",
  'EMPRESAS_HISTORICO'::"ProductPlanCode" AS "planCode",
  CASE
    WHEN "licenseStatus" = 'ACTIVE' THEN 'ACTIVE'::"ProductLicenseStatus"
    WHEN "licenseStatus" = 'SUSPENDED' THEN 'SUSPENDED'::"ProductLicenseStatus"
    WHEN "licenseStatus" = 'CANCELLED' THEN 'CANCELLED'::"ProductLicenseStatus"
    WHEN "licenseStatus" = 'TRIAL' THEN 'ACTIVE'::"ProductLicenseStatus"
    ELSE 'ACTIVE'::"ProductLicenseStatus"
  END AS "status",
  "maxIdentities" AS "includedIdentities",
  0 AS "authorizedExtraIdentities",
  "licenseStart" AS "startsAt",
  "licenseEnd" AS "expiresAt",
  "internalNotes" AS "notes",
  NOW() AS "createdAt",
  NOW() AS "updatedAt"
FROM "Company";

-- Asignar licencia Local Fundador a la empresa propietaria de la campaña Sarcárnico (Mega Publicidad)
INSERT INTO "CompanyProductLicense" (
  "id",
  "companyId",
  "product",
  "planCode",
  "status",
  "includedCampaigns",
  "includedBranches",
  "includedTouchpoints",
  "createdAt",
  "updatedAt"
)
SELECT
  'cpl_loc_' || "id" AS "id",
  "id" AS "companyId",
  'LOCAL'::"SmartNfcProduct" AS "product",
  'LOCAL_FUNDADOR'::"ProductPlanCode" AS "planCode",
  'ACTIVE'::"ProductLicenseStatus" AS "status",
  1 AS "includedCampaigns",
  1 AS "includedBranches",
  3 AS "includedTouchpoints",
  NOW() AS "createdAt",
  NOW() AS "updatedAt"
FROM "Company"
WHERE "id" = 'cmpw3f28u0000usyk0kayon2z';
