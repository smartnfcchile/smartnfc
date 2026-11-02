// Errores de Server Actions (BUG-E2E-3, 27-oct-2026).
//
// En el build de producción React oculta el mensaje de cualquier error LANZADO por una Server Action: el
// usuario ve «Minified React error #441…». Por eso las acciones migradas DEVUELVEN el resultado en vez de
// lanzar, distinguiendo dos casos:
//   - Error esperado de negocio (UserFacingError): su mensaje está escrito para el usuario y es seguro
//     mostrarlo (p. ej. «La empresa alcanzó el máximo de identidades…»).
//   - Error inesperado (cualquier otro): se registra en el servidor con una referencia corta y el usuario
//     recibe un mensaje genérico con esa referencia. Nunca se devuelve el mensaje interno (Prisma, red, etc.).
// redirect()/notFound() de Next.js se vuelven a lanzar (unstable_rethrow) para conservar su comportamiento.
// Las verificaciones de sesión, rol, empresa y capability no cambian: solo cambia cómo se informa el rechazo.

import { randomUUID } from "node:crypto";
import { unstable_rethrow } from "next/navigation";

export { UserFacingError } from "./user-facing-error";
import { UserFacingError } from "./user-facing-error";

export const GENERIC_ACTION_ERROR = "No fue posible completar la operación. Intenta nuevamente; si el problema continúa, contacta a soporte.";

export type ActionFailure = { ok: false; success: false; error: string };
export type ActionSuccess<T extends object> = { ok: true; success: true } & T;
export type ActionResult<T extends object = Record<never, never>> = ActionSuccess<T> | ActionFailure;

export function isUserFacingError(error: unknown): error is UserFacingError {
  return error instanceof UserFacingError || (typeof error === "object" && error !== null && (error as { userFacing?: unknown }).userFacing === true);
}

/** Convierte un error capturado en un resultado seguro para el cliente. */
export function toActionFailure(error: unknown, context: string, log: (...args: unknown[]) => void = console.error): ActionFailure {
  unstable_rethrow(error);
  if (isUserFacingError(error)) return { ok: false, success: false, error: error.message };
  const ref = randomUUID().slice(0, 8);
  log(`[action:${context}] error inesperado (ref ${ref})`, error);
  return { ok: false, success: false, error: `${GENERIC_ACTION_ERROR} (ref. ${ref})` };
}

/** Ejecuta el cuerpo de una Server Action y devuelve siempre un resultado (nunca lanza, salvo redirect/notFound). */
export async function runAction<T extends object>(context: string, body: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const value = await body();
    return { ok: true, success: true, ...value };
  } catch (error) {
    return toActionFailure(error, context);
  }
}
