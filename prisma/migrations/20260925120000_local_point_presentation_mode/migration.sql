-- Landing Pública SmartNFC Local: modo de presentación por Punto Inteligente.
-- Aditiva: crea un enum y una columna NOT NULL con DEFAULT constante 'DIRECT'.
-- En PostgreSQL 11+ el DEFAULT constante no reescribe la tabla; todas las filas existentes
-- quedan en DIRECT y conservan exactamente su comportamiento. Sin backfill, sin cambios en códigos.
CREATE TYPE "LocalPointPresentationMode" AS ENUM ('DIRECT', 'LANDING');
ALTER TABLE "LocalTouchpoint"
  ADD COLUMN "presentationMode" "LocalPointPresentationMode" NOT NULL DEFAULT 'DIRECT';
