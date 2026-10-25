import { getCurrentUserContext } from "../permissions";
import { LocationError } from "./validation";
export const locationHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export const locationJson = (body: unknown, status = 200) => Response.json(body, { status, headers: locationHeaders });
export async function locationActor() {
  try { return await getCurrentUserContext(); }
  catch (error) {
    if (error instanceof Error && error.message === "No autorizado") throw new LocationError("Inicia sesión para administrar ubicaciones.", 401);
    throw error;
  }
}
export function checkLocationOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new LocationError("Origen no permitido.", 403);
}
export function locationFailure(error: unknown) {
  if (error instanceof LocationError) return locationJson({ error: error.message }, error.status);
  if (error instanceof SyntaxError) return locationJson({ error: "JSON inválido." }, 400);
  return locationJson({ error: "No se pudo completar la operación. Intenta nuevamente." }, 500);
}
