-- SmartNFC es multi-tenant: la empresa de un usuario define el límite de acceso a datos.
-- Un usuario existente no puede ser transferido a otro tenant mediante un UPDATE,
-- porque sus tarjetas, prospectos, interacciones y auditoría permanecen asociados
-- a la empresa original. Si una persona entra a otra empresa debe crearse una nueva
-- cuenta dentro del tenant correspondiente.

CREATE OR REPLACE FUNCTION prevent_user_company_transfer()
RETURNS trigger AS $$
BEGIN
  IF NEW."companyId" IS DISTINCT FROM OLD."companyId" THEN
    RAISE EXCEPTION 'No se permite transferir un usuario entre empresas. Cree una nueva cuenta en la empresa destino.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "User_prevent_company_transfer" ON "User";

CREATE TRIGGER "User_prevent_company_transfer"
BEFORE UPDATE OF "companyId" ON "User"
FOR EACH ROW
EXECUTE FUNCTION prevent_user_company_transfer();
