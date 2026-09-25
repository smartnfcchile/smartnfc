// Identidad digital del Local (Bloque 1).
// Módulo puro: sin Prisma ni APIs de Node, para poder usarse en servidor, editor y
// (más adelante) en las landings públicas. La resolución de identidad vive SOLO aquí.
import { z } from "zod";
import { safeDestination } from "./safe-url";

export const BRAND_DEFAULT_PRIMARY = "#2563eb";
export const BRAND_DEFAULT_SECONDARY = "#0f172a";
/** Iguales a los @default de LocalCampaign.primaryColor/secondaryColor en schema.prisma (lo verifica un test). */
export const CAMPAIGN_DEFAULT_COLORS = { primaryColor: "#2563eb", secondaryColor: "#d4af37" } as const;
/** Datos de marca con los que nace una campaña creada desde un Punto Inteligente: la vista previa usa exactamente esto. */
export function newCampaignBrandSource(companyName: string) {
  return { businessName: companyName, ...CAMPAIGN_DEFAULT_COLORS };
}
export const BRAND_LIMITS = { displayName: 80, shortDescription: 160, name: 120, address: 240, url: 2048 } as const;
export const BRAND_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const BRAND_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** logo y portada del Local; promo: imagen de una promoción de un Punto Inteligente del mismo Local. */
export type BrandImageKind = "logo" | "cover" | "promo";
export const BRAND_IMAGE_KINDS: readonly BrandImageKind[] = ["logo", "cover", "promo"];

// ── Colores ──────────────────────────────────────────────────────────────────
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
export function normalizeHexColor(value: string): string | null {
  const v = value.trim();
  if (!HEX.test(v)) return null;
  const hex = v.slice(1).toLowerCase();
  return "#" + (hex.length === 3 ? hex.split("").map(c => c + c).join("") : hex);
}
function luminance(hex: string) {
  const n = normalizeHexColor(hex) ?? BRAND_DEFAULT_PRIMARY;
  const [r, g, b] = [1, 3, 5].map(i => parseInt(n.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrastRatio(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
/** Texto legible (blanco o tinta) sobre un color de marca, según contraste WCAG. */
export function readableTextColor(background: string): "#ffffff" | "#0f172a" {
  return contrastRatio(background, "#ffffff") >= contrastRatio(background, "#0f172a") ? "#ffffff" : "#0f172a";
}

// ── Teléfono ────────────────────────────────────────────────────────────────
/** Normaliza a formato internacional "+<dígitos>". Números chilenos sin código reciben +56. */
export function normalizePhone(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (/[^\d\s()+.-]/.test(raw)) return null;
  const hasPlus = raw.startsWith("+");
  let digits = raw.replace(/\D/g, "");
  if (!hasPlus) {
    if (digits.startsWith("56") && digits.length === 11) { /* ya incluye código de país */ }
    else if (digits.length === 9) digits = "56" + digits; // móvil o fijo chileno de 9 dígitos
    else return null;
  }
  return /^[1-9]\d{7,14}$/.test(digits) ? "+" + digits : null;
}
export function phoneHref(phone: string) { return "tel:" + phone; }

// ── Imágenes ────────────────────────────────────────────────────────────────
// Solo se aceptan imágenes subidas por el flujo autorizado de identidad del local:
// HTTPS + dominio público de Vercel Blob + carpeta del propio local. Esto excluye
// data:, javascript:, http:, SVG y cualquier host externo.
const BLOB_HOST = /^[a-z0-9]+\.public\.blob\.vercel-storage\.com$/;
export const LOCATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
export function brandUploadPathname(locationId: string, kind: BrandImageKind, contentType: string) {
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  return `local-brand/${locationId}/${kind}.${ext}`;
}
export function parseBrandUploadPathname(pathname: string): { locationId: string; kind: BrandImageKind } | null {
  const m = /^local-brand\/([A-Za-z0-9_-]{1,80})\/(logo|cover|promo)\.(png|jpg|jpeg|webp)$/.exec(pathname);
  return m ? { locationId: m[1], kind: m[2] as BrandImageKind } : null;
}
/** Por defecto solo logo/portada (identidad del Local); las promociones pasan ["promo"]. */
export function isAllowedBrandImageUrl(value: string, locationId: string, kinds: readonly BrandImageKind[] = ["logo", "cover"]): boolean {
  if (!LOCATION_ID_PATTERN.test(locationId) || value.length > BRAND_LIMITS.url) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && !url.search && !url.hash &&
      BLOB_HOST.test(url.hostname) &&
      new RegExp(`^/local-brand/${locationId}/(${kinds.join("|")})(-[A-Za-z0-9]+)?\\.(png|jpe?g|webp)$`).test(url.pathname);
  } catch { return false; }
}

// ── Subida de imágenes: detección por contenido y errores con código ─────────
/** Tipo real de la imagen según sus primeros bytes (no confía en la extensión ni en el MIME declarado). */
export function detectBrandImageType(bytes: Uint8Array): (typeof BRAND_IMAGE_TYPES)[number] | null {
  const b = (i: number) => bytes[i];
  if (bytes.length >= 8 && b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47 && b(4) === 0x0d && b(5) === 0x0a && b(6) === 0x1a && b(7) === 0x0a) return "image/png";
  if (bytes.length >= 3 && b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "image/jpeg";
  if (bytes.length >= 12 && b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 && b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50) return "image/webp";
  return null;
}
export const BRAND_UPLOAD_ERRORS = {
  INVALID_REQUEST: "La solicitud de carga no es válida. Recarga la página e inténtalo de nuevo.",
  FORBIDDEN: "No tienes permiso para subir imágenes a este local.",
  FILE_TOO_LARGE: "La imagen supera el máximo de 4 MB.",
  UNSUPPORTED_TYPE: "Formato no admitido. Usa una imagen PNG, JPG o WEBP.",
  STORAGE_NOT_CONFIGURED: "El almacenamiento de imágenes no está configurado en este entorno. Avisa al administrador de la plataforma.",
  STORAGE_ACCESS: "El almacenamiento de imágenes rechazó la carga por configuración. Avisa al administrador de la plataforma.",
  STORAGE_FAILED: "El servicio de almacenamiento no pudo guardar la imagen. Inténtalo nuevamente en unos minutos.",
  TOO_MANY_UPLOADS: "Subiste muchas imágenes seguidas. Espera unos minutos e inténtalo nuevamente.",
  NETWORK: "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.",
} as const;
export type BrandUploadErrorCode = keyof typeof BRAND_UPLOAD_ERRORS;
export function brandUploadErrorMessage(code: unknown): string {
  return typeof code === "string" && code in BRAND_UPLOAD_ERRORS ? BRAND_UPLOAD_ERRORS[code as BrandUploadErrorCode] : BRAND_UPLOAD_ERRORS.STORAGE_FAILED;
}

// ── Esquema de entrada del editor ───────────────────────────────────────────
const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label}: máximo ${max} caracteres.`).transform(v => v || null);
const optionalLink = (label: string) => z.string().trim().max(BRAND_LIMITS.url)
  .refine(v => !v || safeDestination(v), `${label}: usa una dirección https:// pública válida.`)
  .transform(v => v || null);
const optionalColor = (label: string) => z.string().trim()
  .refine(v => !v || normalizeHexColor(v) !== null, `${label}: usa un color hexadecimal, por ejemplo #2563eb.`)
  .transform(v => (v ? normalizeHexColor(v) : null));

export function locationIdentitySchema(locationId: string) {
  const image = (label: string) => z.string().trim()
    .refine(v => !v || isAllowedBrandImageUrl(v, locationId), `${label}: sube la imagen desde este editor.`)
    .transform(v => v || null);
  return z.object({
    name: z.string().trim().min(2, "Nombre interno: mínimo 2 caracteres.").max(BRAND_LIMITS.name, `Nombre interno: máximo ${BRAND_LIMITS.name} caracteres.`),
    address: optionalText(BRAND_LIMITS.address, "Dirección"),
    displayName: optionalText(BRAND_LIMITS.displayName, "Nombre comercial"),
    shortDescription: optionalText(BRAND_LIMITS.shortDescription, "Descripción"),
    logoUrl: image("Logo"),
    coverImageUrl: image("Portada"),
    primaryColor: optionalColor("Color principal"),
    secondaryColor: optionalColor("Color secundario"),
    phone: z.string().trim().max(30, "Teléfono demasiado largo.")
      .refine(v => !v || normalizePhone(v) !== null, "Teléfono: incluye 9 dígitos o el código de país, por ejemplo +56 9 1234 5678.")
      .transform(v => (v ? normalizePhone(v) : null)),
    websiteUrl: optionalLink("Sitio web"),
    mapsUrl: optionalLink("Ubicación"),
  }).strict();
}
export type LocationIdentityInput = z.input<ReturnType<typeof locationIdentitySchema>>;
export type LocationIdentity = z.output<ReturnType<typeof locationIdentitySchema>>;
export const BRAND_FIELDS = ["displayName", "shortDescription", "logoUrl", "coverImageUrl", "primaryColor", "secondaryColor", "phone", "websiteUrl", "mapsUrl"] as const;

// ── Resolución centralizada con fallback ────────────────────────────────────
export type BrandLocationSource = {
  name?: string | null; address?: string | null; displayName?: string | null; logoUrl?: string | null;
  coverImageUrl?: string | null; shortDescription?: string | null; primaryColor?: string | null;
  secondaryColor?: string | null; phone?: string | null; websiteUrl?: string | null; mapsUrl?: string | null;
};
export type BrandCampaignSource = {
  businessName?: string | null; logoUrl?: string | null; heroImageUrl?: string | null;
  primaryColor?: string | null; secondaryColor?: string | null; address?: string | null;
};
export type BrandSource = "location" | "campaign" | "company" | "default";
export type ResolvedLocalBrand = {
  displayName: string; shortDescription: string | null; logoUrl: string | null; coverImageUrl: string | null;
  primaryColor: string; secondaryColor: string; onPrimary: "#ffffff" | "#0f172a"; address: string | null;
  phone: string | null; websiteUrl: string | null; mapsUrl: string | null; initials: string;
  sources: Record<"displayName" | "logoUrl" | "coverImageUrl" | "primaryColor" | "secondaryColor" | "address", BrandSource>;
};

/** URL HTTPS pública sin credenciales ni caracteres de control (imágenes mostradas públicamente). */
export function isPublicHttpsUrl(value: string): boolean {
  if (value.length > BRAND_LIMITS.url || /[\u0000-\u0020"'<>\\]/.test(value)) return false;
  try { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password; } catch { return false; }
}

function pick<T>(chain: Array<[T | null | undefined, BrandSource]>, fallback: [T, BrandSource]): [T, BrandSource] {
  for (const [value, source] of chain) if (value !== null && value !== undefined && value !== "") return [value, source];
  return fallback;
}
export function brandInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "L") + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
}

/**
 * Única función de resolución de identidad: LocalLocation → LocalCampaign (cuando se entrega) → Company → default.
 * El nombre público nunca usa LocalLocation.name (es el nombre interno del local).
 * La campaña solo aporta los campos que ya tenía (nombre comercial, logo, portada, colores, dirección).
 * Teléfono, web, mapa y descripción son exclusivos del Local.
 */
export function resolveLocalBrand(input: {
  location?: BrandLocationSource | null; campaign?: BrandCampaignSource | null; company?: { name?: string | null } | null;
}): ResolvedLocalBrand {
  const l = input.location ?? {}, c = input.campaign ?? {}, co = input.company ?? {};
  const color = (v?: string | null) => (v ? normalizeHexColor(v) : null);
  // Nombre público: nunca LocalLocation.name (nombre interno/administrativo del local).
  const [displayName, displayNameSrc] = pick<string>([[l.displayName, "location"], [c.businessName, "campaign"], [co.name, "company"]], ["Mi local", "default"]);
  // Imágenes: solo HTTPS (las de campañas antiguas no pasaron por la validación estricta del Bloque 1).
  const img = (v?: string | null) => (v && isPublicHttpsUrl(v) ? v : null);
  const [logoUrl, logoSrc] = pick<string | null>([[img(l.logoUrl), "location"], [img(c.logoUrl), "campaign"]], [null, "default"]);
  const [coverImageUrl, coverSrc] = pick<string | null>([[img(l.coverImageUrl), "location"], [img(c.heroImageUrl), "campaign"]], [null, "default"]);
  const [primaryColor, primarySrc] = pick<string>([[color(l.primaryColor), "location"], [color(c.primaryColor), "campaign"]], [BRAND_DEFAULT_PRIMARY, "default"]);
  const [secondaryColor, secondarySrc] = pick<string>([[color(l.secondaryColor), "location"], [color(c.secondaryColor), "campaign"]], [BRAND_DEFAULT_SECONDARY, "default"]);
  const [address, addressSrc] = pick<string | null>([[l.address, "location"], [c.address, "campaign"]], [null, "default"]);
  return {
    displayName, shortDescription: l.shortDescription || null, logoUrl, coverImageUrl, primaryColor, secondaryColor,
    onPrimary: readableTextColor(primaryColor), address, phone: l.phone || null, websiteUrl: l.websiteUrl || null,
    mapsUrl: l.mapsUrl || null, initials: brandInitials(displayName),
    sources: { displayName: displayNameSrc, logoUrl: logoSrc, coverImageUrl: coverSrc, primaryColor: primarySrc, secondaryColor: secondarySrc, address: addressSrc },
  };
}

type CampaignBrandInput = {
  businessName: string | null; logoUrl: string | null; heroImageUrl: string | null; primaryColor: string; secondaryColor: string;
  address: string | null; localLocation?: BrandLocationSource | null;
};
/** Identidad pública de los puntos de una campaña: Local → Campaña → Empresa (resolveLocalBrand). */
export function campaignPublicBrand(campaign: CampaignBrandInput, companyName: string): ResolvedLocalBrand {
  return resolveLocalBrand({
    location: campaign.localLocation,
    campaign: { businessName: campaign.businessName, logoUrl: campaign.logoUrl, heroImageUrl: campaign.heroImageUrl,
      primaryColor: campaign.primaryColor, secondaryColor: campaign.secondaryColor, address: campaign.address },
    company: { name: companyName },
  });
}
