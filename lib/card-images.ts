/**
 * Validación y renderizado seguro de las imágenes del perfil digital (Card):
 * avatarUrl, logoUrl, coverUrl y heroImageUrl.
 *
 * - Escritura (servidor): solo se aceptan URLs del store de Vercel Blob configurado
 *   para SmartNFC o archivos locales generados por el propio servidor (/uploads).
 *   Un valor idéntico al ya guardado se conserva para no romper perfiles legacy.
 * - Renderizado: la URL nunca se interpola en una etiqueta <style>; se entrega como
 *   valor CSS url("...") escapado para usarse en una propiedad de estilo de React.
 */

export const CARD_IMAGE_FIELDS = ["avatarUrl", "logoUrl", "coverUrl", "heroImageUrl"] as const;
export type CardImageField = (typeof CARD_IMAGE_FIELDS)[number];

const CARD_IMAGE_LABELS: Record<CardImageField, string> = {
  avatarUrl: "fotografía de perfil",
  logoUrl: "logo",
  coverUrl: "portada",
  heroImageUrl: "imagen hero / fondo",
};

const MAX_IMAGE_URL_LENGTH = 2048;
const LOCAL_UPLOAD_PATH = /^\/uploads\/[A-Za-z0-9._-]+\.(png|jpe?g|webp)$/;
const STORE_ID_PATTERN = /^[A-Za-z0-9]+$/;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const MAX_DATA_IMAGE_LENGTH = 8 * 1024 * 1024;
const DATA_IMAGE_PATTERN = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/;

function normalizeStoreId(storeId: string) {
  const trimmed = storeId.trim();
  return trimmed.startsWith("store_") ? trimmed.slice("store_".length) : trimmed;
}

/**
 * Hosts públicos de Vercel Blob autorizados, derivados de la misma configuración que usa
 * @vercel/blob: BLOB_STORE_ID o el store id contenido en BLOB_READ_WRITE_TOKEN
 * (vercel_blob_rw_<storeId>_<secret>). Sin configuración no se autoriza ningún host.
 */
export function getAuthorizedBlobHosts(env: Record<string, string | undefined> = process.env): string[] {
  const ids = new Set<string>();
  if (env.BLOB_STORE_ID) ids.add(normalizeStoreId(env.BLOB_STORE_ID));
  if (env.BLOB_READ_WRITE_TOKEN) {
    const [, , , storeId = ""] = env.BLOB_READ_WRITE_TOKEN.split("_");
    if (storeId) ids.add(normalizeStoreId(storeId));
  }
  return [...ids]
    .filter((id) => STORE_ID_PATTERN.test(id))
    .map((id) => `${id.toLowerCase()}.public.blob.vercel-storage.com`);
}

/** URL de imagen subida por SmartNFC: store Blob autorizado (HTTPS canónico) o /uploads local. */
export function isAuthorizedCardImageUrl(value: string, authorizedHosts: readonly string[]): boolean {
  if (!value || value.length > MAX_IMAGE_URL_LENGTH) return false;
  if (LOCAL_UPLOAD_PATH.test(value)) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      // Solo la forma canónica: rechaza comillas, espacios, barras invertidas y control chars.
      url.href === value &&
      !url.username && !url.password && !url.port && !url.search && !url.hash &&
      authorizedHosts.includes(url.hostname) &&
      url.pathname.length > 1
    );
  } catch {
    return false;
  }
}

/**
 * Resuelve el valor a guardar para un campo de imagen:
 * - campo ausente del formulario → se conserva el valor actual;
 * - vacío → se elimina la imagen (null);
 * - idéntico al valor actual → se conserva (compatibilidad con datos existentes);
 * - nuevo valor → debe ser una URL autorizada, si no se lanza un error.
 */
export function resolveCardImageUpdate(
  field: CardImageField,
  submitted: FormDataEntryValue | null,
  current: string | null,
  authorizedHosts: readonly string[],
): string | null {
  if (submitted === null) return current;
  if (typeof submitted !== "string") throw new Error(`La ${CARD_IMAGE_LABELS[field]} no es válida.`);
  const value = submitted.trim();
  if (!value) return null;
  if (current !== null && value === current) return current;
  if (!isAuthorizedCardImageUrl(value, authorizedHosts)) {
    throw new Error(`La ${CARD_IMAGE_LABELS[field]} debe subirse desde el editor de SmartNFC.`);
  }
  return value;
}

/**
 * Devuelve `url("...")` listo para una propiedad CSS de React, o null si el valor no es
 * una referencia de imagen segura. Tolerante con datos existentes (http/https, rutas
 * relativas al sitio, blob: y data:image en base64) pero siempre escapado.
 */
export function toCssImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  // data:image en base64 (datos existentes): solo caracteres base64, que no pueden salir de url("...").
  // Tiene su propio límite porque una imagen embebida supera con facilidad los 2048 caracteres.
  if (value.startsWith("data:")) {
    return value.length <= MAX_DATA_IMAGE_LENGTH && DATA_IMAGE_PATTERN.test(value) ? `url("${value}")` : null;
  }

  if (value.length > MAX_IMAGE_URL_LENGTH || CONTROL_CHARS.test(value)) return null;

  let safe: string;
  if (value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")) {
    try {
      const url = new URL(value, "https://smartnfc.invalid");
      if (url.origin !== "https://smartnfc.invalid") return null;
      safe = `${url.pathname}${url.search}`;
    } catch {
      return null;
    }
  } else {
    try {
      const url = new URL(value);
      if (!["https:", "http:", "blob:"].includes(url.protocol) || url.username || url.password) return null;
      safe = url.href;
    } catch {
      return null;
    }
  }

  return `url("${safe.replace(/[\\"]/g, "\\$&")}")`;
}
