-- Las tarjetas físicas SmartNFC Empresas se producen con branding corporativo
-- y datos de una persona concreta. Por diseño, no se reasignan entre empresas.
-- La empresa queda fijada desde el momento de creación de la tarjeta física.

CREATE OR REPLACE FUNCTION prevent_physical_card_company_transfer()
RETURNS trigger AS $$
BEGIN
  IF NEW."companyId" IS DISTINCT FROM OLD."companyId" THEN
    RAISE EXCEPTION 'No se permite reasignar una tarjeta física a otra empresa.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "PhysicalNfcCard_prevent_company_transfer" ON "PhysicalNfcCard";

CREATE TRIGGER "PhysicalNfcCard_prevent_company_transfer"
BEFORE UPDATE OF "companyId" ON "PhysicalNfcCard"
FOR EACH ROW
EXECUTE FUNCTION prevent_physical_card_company_transfer();
