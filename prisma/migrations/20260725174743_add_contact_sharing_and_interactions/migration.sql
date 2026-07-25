/*
  Warnings:

  - Added the required column `companyId` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LeadInteractionType" AS ENUM ('CONTACT_CAPTURE', 'RE_ENGAGEMENT');

-- CreateEnum
CREATE TYPE "ContactSource" AS ENUM ('NFC', 'QR', 'DIRECT', 'UNKNOWN');

-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'CONTACT_SHARED';

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "primaryActionType" TEXT NOT NULL DEFAULT 'WHATSAPP',
ADD COLUMN     "secondaryActionType" TEXT NOT NULL DEFAULT 'SAVE_CONTACT',
ADD COLUMN     "shareContactButtonText" TEXT NOT NULL DEFAULT 'Compárteme tus datos',
ADD COLUMN     "shareContactConfirm" TEXT NOT NULL DEFAULT '¡Gracias! Tus datos fueron enviados correctamente.',
ADD COLUMN     "shareContactConsent" TEXT NOT NULL DEFAULT 'Acepto el tratamiento de mis datos personales para fines de contacto comercial.',
ADD COLUMN     "shareContactEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shareContactFields" JSONB,
ADD COLUMN     "shareContactIntro" TEXT NOT NULL DEFAULT 'Déjame tus datos para mantenernos en contacto.';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "companyId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "LeadInteraction" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "LeadInteractionType" NOT NULL,
    "source" "ContactSource" NOT NULL DEFAULT 'UNKNOWN',
    "message" TEXT,
    "consentAccepted" BOOLEAN NOT NULL DEFAULT false,
    "consentText" TEXT,
    "consentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadInteraction_leadId_createdAt_idx" ON "LeadInteraction"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadInteraction_companyId_createdAt_idx" ON "LeadInteraction"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadInteraction_cardId_createdAt_idx" ON "LeadInteraction"("cardId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_companyId_idx" ON "Lead"("companyId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadInteraction" ADD CONSTRAINT "LeadInteraction_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadInteraction" ADD CONSTRAINT "LeadInteraction_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadInteraction" ADD CONSTRAINT "LeadInteraction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
