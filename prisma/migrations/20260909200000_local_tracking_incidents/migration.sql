CREATE TABLE "LocalTrackingIncident" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "companyId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "LocalTrackingIncident_companyId_createdAt_idx" ON "LocalTrackingIncident"("companyId", "createdAt");
