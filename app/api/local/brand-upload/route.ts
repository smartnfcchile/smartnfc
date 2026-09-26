// Subida de logo/portada del Local e imágenes de promociones (procesada en el servidor).
// Exige administrador con SmartNFC Local operativo y un local activo de la propia empresa;
// valida tamaño (≤ 4 MB) y contenido real (PNG/JPG/WEBP) y guarda en local-brand/<localId>/.
// No usa el flujo de token de cliente ni onUploadCompleted: no depende de callbackUrl.
import { NextResponse } from "next/server";
import { BRAND_UPLOAD_MAX_BODY, BrandUploadError, processBrandUpload } from "../../../../lib/local/brand-upload";
import { brandUploadErrorMessage, type BrandUploadErrorCode } from "../../../../lib/local/brand";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

function fail(code: BrandUploadErrorCode, status: number) {
  return NextResponse.json({ error: { code, message: brandUploadErrorMessage(code) } }, { status, headers: noStore });
}

export async function POST(request: Request): Promise<NextResponse> {
  // Solo mismo origen (defensa CSRF adicional a las cookies SameSite de la sesión).
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return fail("FORBIDDEN", 403);
  if (!(request.headers.get("content-type") || "").startsWith("multipart/form-data")) return fail("INVALID_REQUEST", 400);
  // Los navegadores siempre informan el largo de un multipart; sin él no se lee el cuerpo.
  const length = Number(request.headers.get("content-length") || 0);
  if (!Number.isFinite(length) || length <= 0) return fail("INVALID_REQUEST", 400);
  if (length > BRAND_UPLOAD_MAX_BODY) return fail("FILE_TOO_LARGE", 413);
  // Sesión, rol y Local operativo ANTES de leer el cuerpo: sin permiso no se procesa ningún archivo.
  let actorId: string;
  try { ({ actorId } = await (await import("../../../../lib/local/location-brand")).authorizeLocalBrandUploader()); }
  catch { return fail("FORBIDDEN", 403); }
  // Límite por usuario (no por IP): evita llenar el almacenamiento con subidas repetidas.
  const { checkRateLimit } = await import("../../../../lib/rateLimit");
  if (!(await checkRateLimit("user:" + actorId, "LOCAL_BRAND_UPLOAD")).allowed) return fail("TOO_MANY_UPLOADS", 429);

  let form: FormData;
  try { form = await request.formData(); } catch { return fail("INVALID_REQUEST", 400); }
  try {
    const { url } = await processBrandUpload({ locationId: form.get("locationId"), kind: form.get("kind"), file: form.get("file") });
    return NextResponse.json({ url }, { headers: noStore });
  } catch (error) {
    if (error instanceof BrandUploadError) {
      if (error.status >= 500) console.error("LOCAL_BRAND_UPLOAD_FAILED", error.code, error.detail ?? "");
      return fail(error.code, error.status);
    }
    console.error("LOCAL_BRAND_UPLOAD_FAILED", "UNEXPECTED", error instanceof Error ? error.constructor.name : "Unknown");
    return fail("STORAGE_FAILED", 500);
  }
}
