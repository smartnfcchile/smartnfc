-- La desvinculación de un colaborador es terminal en el flujo actual.
-- Un usuario suspendido conserva su historial comercial, pero no debe poder
-- volver a PENDING/ACTIVE mediante reenvío de invitaciones o cambios accidentales.
-- Si la persona vuelve a trabajar para una empresa, se crea una cuenta nueva.

CREATE OR REPLACE FUNCTION prevent_suspended_user_reactivation()
RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'SUSPENDED' AND (NEW."status" IS DISTINCT FROM 'SUSPENDED' OR NEW."isActive" = TRUE) THEN
    RAISE EXCEPTION 'Un usuario suspendido no puede reactivarse. Cree una nueva cuenta si corresponde.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "User_prevent_suspended_reactivation" ON "User";

CREATE TRIGGER "User_prevent_suspended_reactivation"
BEFORE UPDATE OF "status", "isActive" ON "User"
FOR EACH ROW
EXECUTE FUNCTION prevent_suspended_user_reactivation();
