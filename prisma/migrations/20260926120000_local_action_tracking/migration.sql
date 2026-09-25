-- Action Builder y tracking por acción de SmartNFC Local.
-- Solo cambios aditivos; no modifica ni reinterpreta eventos, visitas, códigos ni tokens existentes:
--   * LocalEventType gana 'LANDING_VIEW' (visualización de la landing, una por visita).
--   * LocalTouchpoint.actions JSONB NOT NULL DEFAULT '[]': DEFAULT constante, sin reescritura en PostgreSQL 11+;
--     todos los puntos existentes quedan sin acciones guardadas y siguen resolviéndose desde destinationUrl/smartLinks.
--   * Tabla nueva LocalActionClick (clic por visita y acción; un clic NO es un mensaje, reseña, seguidor ni compra).
-- Rollback manual (sin pérdida de datos históricos previos a este bloque):
--   DROP TABLE "LocalActionClick"; ALTER TABLE "LocalTouchpoint" DROP COLUMN "actions";
--   (PostgreSQL no permite quitar un valor de enum: 'LANDING_VIEW' puede quedar sin uso.)
-- AlterEnum
ALTER TYPE "LocalEventType" ADD VALUE 'LANDING_VIEW';

-- AlterTable
ALTER TABLE "LocalTouchpoint" ADD COLUMN     "actions" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "LocalActionClick" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "touchpointId" TEXT,
    "visitId" TEXT,
    "actionId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "actionRole" TEXT NOT NULL,
    "source" "ContactSource" NOT NULL,
    "objective" "LocalPointObjective" NOT NULL,
    "presentationMode" "LocalPointPresentationMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocalActionClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LocalActionClick_companyId_createdAt_idx" ON "LocalActionClick"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "LocalActionClick_campaignId_createdAt_idx" ON "LocalActionClick"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "LocalActionClick_touchpointId_createdAt_idx" ON "LocalActionClick"("touchpointId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LocalActionClick_visitId_actionId_key" ON "LocalActionClick"("visitId", "actionId");

-- AddForeignKey
ALTER TABLE "LocalActionClick" ADD CONSTRAINT "LocalActionClick_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalActionClick" ADD CONSTRAINT "LocalActionClick_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "LocalCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalActionClick" ADD CONSTRAINT "LocalActionClick_touchpointId_fkey" FOREIGN KEY ("touchpointId") REFERENCES "LocalTouchpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalActionClick" ADD CONSTRAINT "LocalActionClick_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "LocalVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
