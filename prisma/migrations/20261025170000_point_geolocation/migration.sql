-- CreateEnum
CREATE TYPE "InstallationMethod" AS ENUM ('MANUAL', 'MAP', 'ADDRESS');

-- CreateEnum
CREATE TYPE "InstallationVisibility" AS ENUM ('PRIVATE');

-- CreateTable
CREATE TABLE "PointGeolocation" (
    "id" TEXT NOT NULL,
    "localTouchpointId" TEXT,
    "physicalNfcCardId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "label" VARCHAR(120),
    "address" VARCHAR(300),
    "accuracyMeters" DOUBLE PRECISION,
    "method" "InstallationMethod" NOT NULL DEFAULT 'MANUAL',
    "visibility" "InstallationVisibility" NOT NULL DEFAULT 'PRIVATE',
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointGeolocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PointGeolocation_localTouchpointId_key" ON "PointGeolocation"("localTouchpointId");

-- CreateIndex
CREATE UNIQUE INDEX "PointGeolocation_physicalNfcCardId_key" ON "PointGeolocation"("physicalNfcCardId");

-- AddForeignKey
ALTER TABLE "PointGeolocation" ADD CONSTRAINT "PointGeolocation_localTouchpointId_fkey" FOREIGN KEY ("localTouchpointId") REFERENCES "LocalTouchpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointGeolocation" ADD CONSTRAINT "PointGeolocation_physicalNfcCardId_fkey" FOREIGN KEY ("physicalNfcCardId") REFERENCES "PhysicalNfcCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Exactly one owner; nullable relations preserve every existing NFC/QR record.
ALTER TABLE "PointGeolocation" ADD CONSTRAINT "PointGeolocation_one_owner"
CHECK (("localTouchpointId" IS NOT NULL)::int + ("physicalNfcCardId" IS NOT NULL)::int = 1);
ALTER TABLE "PointGeolocation" ADD CONSTRAINT "PointGeolocation_coordinates"
CHECK ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180);
ALTER TABLE "PointGeolocation" ADD CONSTRAINT "PointGeolocation_accuracy"
CHECK ("accuracyMeters" IS NULL OR "accuracyMeters" BETWEEN 0 AND 100000);
