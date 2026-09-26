-- Bloque 1: identidad digital por Local (LocalLocation).
-- Solo columnas nuevas y opcionales: sin backfill, sin defaults que reescriban filas,
-- sin cambios en LocalCampaign, puntos, eventos ni rutas públicas.
-- En PostgreSQL 11+ ADD COLUMN sin DEFAULT es un cambio de catálogo (no reescribe la tabla).
-- Rollback manual (solo si no hay datos que conservar):
--   ALTER TABLE "LocalLocation" DROP COLUMN "displayName", DROP COLUMN "logoUrl", DROP COLUMN "coverImageUrl",
--     DROP COLUMN "shortDescription", DROP COLUMN "primaryColor", DROP COLUMN "secondaryColor", DROP COLUMN "phone",
--     DROP COLUMN "websiteUrl", DROP COLUMN "mapsUrl", DROP COLUMN "brandUpdatedAt";
ALTER TABLE "LocalLocation"
  ADD COLUMN "displayName" TEXT,
  ADD COLUMN "logoUrl" TEXT,
  ADD COLUMN "coverImageUrl" TEXT,
  ADD COLUMN "shortDescription" TEXT,
  ADD COLUMN "primaryColor" TEXT,
  ADD COLUMN "secondaryColor" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "websiteUrl" TEXT,
  ADD COLUMN "mapsUrl" TEXT,
  ADD COLUMN "brandUpdatedAt" TIMESTAMP(3);
