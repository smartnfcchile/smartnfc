// Error esperado cuyo mensaje está escrito para el usuario y es seguro mostrarlo (BUG-E2E-3).
// Hereda de Error y conserva el mensaje: el código que hoy lanza y captura Error sigue funcionando igual.
// Sin dependencias de Next.js para poder usarse desde lib/permissions y lib/entitlements.
export class UserFacingError extends Error {
  readonly userFacing = true;
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}
