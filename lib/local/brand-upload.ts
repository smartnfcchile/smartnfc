// Subida de logo/portada del Local procesada en el servidor.
// Reemplaza el flujo de "client upload" de Vercel Blob para este caso: no requiere token de cliente,
// callbackUrl ni webhook onUploadCompleted, y funciona igual en desarrollo local y en Vercel.
// Las imágenes son ≤ 4 MB, por debajo del límite de cuerpo de las funciones de Vercel (4,5 MB).
//
// Credenciales: se usa SIEMPRE BLOB_READ_WRITE_TOKEN pasado explícitamente a put().
// Sin `token` explícito, @vercel/blob 2.x prioriza OIDC (VERCEL_OIDC_TOKEN o cabecera
// x-vercel-oidc-token) + BLOB_STORE_ID por sobre BLOB_READ_WRITE_TOKEN. En desarrollo local,
// `vercel env pull` deja VERCEL_OIDC_TOKEN (con vencimiento) en .env.local, y Next carga .env*;
// así la ruta podía autenticarse por OIDC contra otro contexto y fallar con BlobStoreNotFoundError,
// mientras `node -e` (sin .env) usaba el token read-write y funcionaba.
import { BlobAccessError, BlobStoreNotFoundError, BlobStoreSuspendedError, put } from "@vercel/blob";
import {
  BRAND_IMAGE_KINDS, BRAND_IMAGE_MAX_BYTES, BRAND_IMAGE_TYPES, LOCATION_ID_PATTERN, brandUploadPathname, detectBrandImageType,
  isAllowedBrandImageUrl, type BrandImageKind, type BrandUploadErrorCode,
} from "./brand";

export class BrandUploadError extends Error {
  constructor(public code: BrandUploadErrorCode, public status: number, public detail?: string) { super(code); }
}

type Deps = {
  authorize: (pathname: string) => Promise<{ locationId: string; kind: BrandImageKind }>;
  put: typeof put;
  env: Record<string, string | undefined>;
};
/** Store id embebido en un token read-write (`vercel_blob_rw_<storeId>_<secreto>`). */
function storeIdFromReadWriteToken(token: string) {
  const parts = token.split("_");
  return parts.length >= 5 && token.startsWith("vercel_blob_rw_") ? parts[3] : null;
}
const partial = (value: string | null | undefined) => (value ? value.slice(0, 4) + "…" + `(${value.length})` : null);

/**
 * Diagnóstico seguro de la configuración de Blob. NUNCA incluye el token ni secretos:
 * solo presencia, largo, store id parcial y coherencia con BLOB_STORE_ID.
 */
export function blobConfigDiagnostics(env: Record<string, string | undefined>) {
  const token = env.BLOB_READ_WRITE_TOKEN?.trim() || "";
  const tokenStore = token ? storeIdFromReadWriteToken(token) : null;
  const envStore = env.BLOB_STORE_ID?.trim().replace(/^store_/, "") || null;
  return {
    tokenPresent: token.length > 0,
    tokenLength: token.length,
    tokenFormatValid: !!tokenStore,
    tokenStoreId: partial(tokenStore),
    blobStoreIdPresent: !!envStore,
    blobStoreIdMatchesToken: envStore && tokenStore ? envStore.toLowerCase() === tokenStore.toLowerCase() : null,
    oidcTokenPresentInEnv: !!env.VERCEL_OIDC_TOKEN?.trim(),
  };
}

const defaultDeps = (): Deps => ({
  authorize: async (pathname) => (await import("./location-brand")).authorizeLocalBrandUpload(pathname),
  put, env: process.env,
});

/** Límite de cuerpo aceptado (archivo + campos multipart). */
export const BRAND_UPLOAD_MAX_BODY = BRAND_IMAGE_MAX_BYTES + 64 * 1024;

export async function processBrandUpload(input: { locationId: unknown; kind: unknown; file: unknown }, deps: Deps = defaultDeps()) {
  const { locationId, kind: rawKind, file } = input;
  const kind = BRAND_IMAGE_KINDS.find(k => k === rawKind);
  if (typeof locationId !== "string" || !LOCATION_ID_PATTERN.test(locationId) || !kind ||
      !(file instanceof Blob)) throw new BrandUploadError("INVALID_REQUEST", 400);
  if (file.size === 0) throw new BrandUploadError("UNSUPPORTED_TYPE", 415);
  if (file.size > BRAND_IMAGE_MAX_BYTES) throw new BrandUploadError("FILE_TOO_LARGE", 413);
  if (file.type && !(BRAND_IMAGE_TYPES as readonly string[]).includes(file.type)) throw new BrandUploadError("UNSUPPORTED_TYPE", 415);

  // 1. Autorización (sesión, rol admin, LOCAL_ACCESS, Local operativo, local activo de la propia empresa).
  try {
    await deps.authorize(brandUploadPathname(locationId, kind, "image/png"));
  } catch {
    throw new BrandUploadError("FORBIDDEN", 403);
  }
  // 2. Contenido real: los bytes deben ser PNG, JPG o WEBP (el MIME declarado por el navegador no basta).
  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = detectBrandImageType(bytes);
  if (!contentType) throw new BrandUploadError("UNSUPPORTED_TYPE", 415);
  // 3. Configuración: exige un BLOB_READ_WRITE_TOKEN con formato válido. BLOB_STORE_ID no basta ni se usa.
  const token = deps.env.BLOB_READ_WRITE_TOKEN?.trim() || "";
  const diagnostics = blobConfigDiagnostics(deps.env);
  if (!token || !diagnostics.tokenFormatValid) throw new BrandUploadError("STORAGE_NOT_CONFIGURED", 503, JSON.stringify(diagnostics));
  // 4. Carpeta fija del local; el nombre lo decide el servidor, nunca el cliente.
  let result: { url: string };
  try {
    result = await deps.put(brandUploadPathname(locationId, kind, contentType), Buffer.from(bytes), {
      access: "public", contentType, addRandomSuffix: true, allowOverwrite: false,
      token, // explícito: evita que la librería elija OIDC + BLOB_STORE_ID
    });
  } catch (error) {
    const name = error instanceof Error ? error.constructor.name : "Unknown";
    const detail = JSON.stringify({ error: name, ...diagnostics });
    if (error instanceof BlobAccessError || error instanceof BlobStoreNotFoundError || error instanceof BlobStoreSuspendedError)
      throw new BrandUploadError("STORAGE_ACCESS", 503, detail);
    throw new BrandUploadError("STORAGE_FAILED", 502, detail);
  }
  // 5. Defensa adicional: la URL devuelta debe cumplir la misma regla que se exige al guardar.
  if (!isAllowedBrandImageUrl(result.url, locationId, [kind])) throw new BrandUploadError("STORAGE_FAILED", 502, "URL devuelta fuera de la carpeta del local");
  return { url: result.url };
}
