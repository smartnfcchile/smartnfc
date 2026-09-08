-- Los prospectos son patrimonio comercial de la empresa y no deben desaparecer
-- al eliminar accidentalmente una tarjeta. La eliminación queda bloqueada mientras
-- existan prospectos asociados; el flujo normal es suspender/desactivar la tarjeta.
ALTER TABLE "Lead" DROP CONSTRAINT IF EXISTS "Lead_cardId_fkey";

ALTER TABLE "Lead"
ADD CONSTRAINT "Lead_cardId_fkey"
FOREIGN KEY ("cardId") REFERENCES "Card"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
