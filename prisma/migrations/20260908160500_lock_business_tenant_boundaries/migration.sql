-- Refuerzo multi-tenant para entidades comerciales persistentes.
-- Una tarjeta digital, un prospecto o una interacción CRM no pueden cambiar de
-- empresa mediante UPDATE. Si existe un caso excepcional, debe resolverse con
-- un flujo explícito de migración de datos, nunca alterando companyId en caliente.
-- Las tarjetas físicas quedan fuera de esta regla porque el inventario físico sí
-- puede reasignarse entre empresas cuando está previamente desvinculado.

CREATE OR REPLACE FUNCTION prevent_business_tenant_transfer()
RETURNS trigger AS $$
BEGIN
  IF NEW."companyId" IS DISTINCT FROM OLD."companyId" THEN
    RAISE EXCEPTION 'No se permite transferir datos comerciales entre empresas.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "Card_prevent_company_transfer" ON "Card";
CREATE TRIGGER "Card_prevent_company_transfer"
BEFORE UPDATE OF "companyId" ON "Card"
FOR EACH ROW
EXECUTE FUNCTION prevent_business_tenant_transfer();

DROP TRIGGER IF EXISTS "Lead_prevent_company_transfer" ON "Lead";
CREATE TRIGGER "Lead_prevent_company_transfer"
BEFORE UPDATE OF "companyId" ON "Lead"
FOR EACH ROW
EXECUTE FUNCTION prevent_business_tenant_transfer();

DROP TRIGGER IF EXISTS "LeadInteraction_prevent_company_transfer" ON "LeadInteraction";
CREATE TRIGGER "LeadInteraction_prevent_company_transfer"
BEFORE UPDATE OF "companyId" ON "LeadInteraction"
FOR EACH ROW
EXECUTE FUNCTION prevent_business_tenant_transfer();
