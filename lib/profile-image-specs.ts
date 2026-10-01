/**
 * Especificaciones de las imágenes del perfil digital (SmartNFC Empresas).
 *
 * Derivadas de las medidas reales de components/card-profile/CardProfileView.tsx:
 * - Avatar: marco de 128 × 128 px (círculo, cuadrado redondeado, hexágono o sin marco).
 * - Logo: cabecera de hasta 48 px de alto y círculo de 52 px en plantillas Ficha Empresa.
 * - Portada: alto fijo de 192 px y ancho de 288 a 448 px (1,5:1 a 2,33:1), object-cover centrado.
 * - Hero: franja de 220 px en móvil y fondo a pantalla completa en escritorio.
 * Las recomendaciones apuntan a pantallas de densidad 3x.
 *
 * Las advertencias de dimensiones son informativas: nunca bloquean una carga.
 */

export type ProfileImageKind = "avatar" | "logo" | "cover" | "hero";

/** Formatos aceptados por el navegador y por /api/blob/upload. */
export const PROFILE_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PROFILE_IMAGE_ACCEPT = PROFILE_IMAGE_MIME_TYPES.join(",");
export const PROFILE_IMAGE_FORMATS_LABEL = "JPG, PNG o WebP";

/** Límite efectivo: el editor corta en 4 MB (el token de Blob admite hasta 5 MB). */
export const PROFILE_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const PROFILE_IMAGE_MAX_SIZE_LABEL = "4 MB";

export interface ImageSize {
  width: number;
  height: number;
}

export interface ProfileImageVariant extends ImageSize {
  label?: string;
  ratioLabel: string;
}

export interface ProfileImageSpec {
  kind: ProfileImageKind;
  label: string;
  variants: ProfileImageVariant[];
  minimum: ImageSize;
  safeZone: string;
  /** Mensaje destacado bajo el campo (p. ej. zona segura del banner). */
  highlight?: string;
}

export const BANNER_SAFE_ZONE: ImageSize = { width: 864, height: 360 };

export const PROFILE_IMAGE_SPECS: Record<ProfileImageKind, ProfileImageSpec> = {
  avatar: {
    kind: "avatar",
    label: "Fotografía de perfil",
    variants: [{ width: 800, height: 800, ratioLabel: "1:1" }],
    minimum: { width: 400, height: 400 },
    safeZone: "Mantén el rostro centrado, dentro del 70 % central de la imagen: según el marco elegido se recorta como círculo, hexágono o cuadrado.",
  },
  logo: {
    kind: "logo",
    label: "Logo de empresa",
    variants: [
      { label: "Horizontal", width: 900, height: 300, ratioLabel: "3:1" },
      { label: "Cuadrado", width: 600, height: 600, ratioLabel: "1:1" },
    ],
    minimum: { width: 144, height: 144 },
    safeZone: "Usa fondo transparente (PNG o WebP) y deja un margen libre cercano al 10 %. En las plantillas Ficha Empresa también se muestra dentro de un círculo pequeño.",
  },
  cover: {
    kind: "cover",
    label: "Portada superior (Banner)",
    variants: [{ width: 1344, height: 576, ratioLabel: "7:3" }],
    minimum: { width: 896, height: 384 },
    safeZone: `Zona segura central de ${BANNER_SAFE_ZONE.width} × ${BANNER_SAFE_ZONE.height} px.`,
    highlight: `Mantén los textos y logotipos importantes dentro de la zona segura central de ${BANNER_SAFE_ZONE.width} × ${BANNER_SAFE_ZONE.height} px. Los extremos pueden recortarse en teléfonos móviles y la parte inferior puede quedar cubierta por elementos del perfil.`,
  },
  hero: {
    kind: "hero",
    label: "Imagen hero / Fondo de la landing",
    variants: [{ width: 1920, height: 1080, ratioLabel: "16:9" }],
    minimum: { width: 1600, height: 900 },
    safeZone: "Imagen decorativa, sin textos. Ubica el motivo principal en la mitad superior y al centro: en móvil se muestra como franja superior y en escritorio queda detrás de la tarjeta, oscurecida.",
  },
};

export function isAcceptedProfileImageType(mimeType: string): boolean {
  return (PROFILE_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType);
}

const formatRatio = (ratio: number) => `${ratio.toFixed(2).replace(".", ",")}:1`;

/**
 * Advertencias informativas según las dimensiones reales de la imagen.
 * Una lista vacía significa que la imagen se ajusta a lo recomendado.
 */
export function getProfileImageWarnings(kind: ProfileImageKind, size: ImageSize): string[] {
  const { width, height } = size;
  if (!(width > 0) || !(height > 0)) return [];

  const spec = PROFILE_IMAGE_SPECS[kind];
  const ratio = width / height;
  const dims = `${width} × ${height} px`;
  const recommended = spec.variants.map((v) => `${v.width} × ${v.height} px`).join(" o ");
  const warnings: string[] = [];

  if (kind === "avatar") {
    if (Math.abs(ratio - 1) > 0.1) {
      warnings.push(`La imagen no es cuadrada (${dims}). Se recortará al centro para el marco del perfil; revisa que el rostro quede centrado.`);
    }
  } else if (kind === "logo") {
    if (ratio > 3.2) {
      warnings.push(`El logo es muy alargado (${formatRatio(ratio)}). En las plantillas Ficha Empresa se reduce dentro de un círculo pequeño y puede quedar ilegible. Recomendado: hasta 3:1.`);
    } else if (ratio < 0.8) {
      warnings.push(`El logo es vertical (${formatRatio(ratio)}) y se verá pequeño en la cabecera. Prefiere una versión horizontal o cuadrada.`);
    }
  } else if (kind === "cover") {
    if (ratio < 1) {
      warnings.push(`La imagen es vertical (${dims}). La portada es horizontal: se perderá gran parte de la parte superior e inferior.`);
    } else if (ratio < 1.5) {
      warnings.push(`La imagen es más alta que el área visible (${formatRatio(ratio)}). Se recortará arriba y abajo en todos los dispositivos. Recomendado: 7:3.`);
    } else if (ratio > 2.7) {
      warnings.push(`La imagen es muy panorámica (${formatRatio(ratio)}). Sus extremos se recortarán incluso en escritorio, y más en teléfonos. Recomendado: 7:3.`);
    }
  } else if (kind === "hero") {
    if (ratio < 1) {
      warnings.push(`La imagen es vertical (${dims}). El fondo es horizontal y se recortará considerablemente. Recomendado: 16:9.`);
    } else if (ratio < 1.5 || ratio > 2.2) {
      warnings.push(`La proporción (${formatRatio(ratio)}) difiere de 16:9; parte de la imagen puede recortarse.`);
    }
  }

  if (width < spec.minimum.width || height < spec.minimum.height) {
    warnings.push(`Resolución baja (${dims}); puede verse borrosa en pantallas de alta densidad. Recomendado: ${recommended}.`);
  }

  return warnings;
}
