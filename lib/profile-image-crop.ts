/**
 * Geometría de recorte de las imágenes del perfil, replicando las reglas de
 * components/card-profile/CardProfileView.tsx. Todo en px CSS; sin DOM.
 *
 * Portada: alto fijo 192 px (h-48), object-cover centrado.
 * Hero: franja móvil de 220 px (cover, center top) con la tarjeta subiendo 48 px;
 *       en escritorio, fondo a pantalla completa (cover, center top) oscurecido.
 */

import { PROFILE_IMAGE_SPECS, type ImageSize } from "./profile-image-specs";
import {
  normalizeBannerStyle, normalizePhotoStyle, normalizeTemplate,
  type NormalizedPhotoStyle,
} from "./templates";

export interface Rect { x: number; y: number; width: number; height: number }

export interface CoverCrop {
  scale: number;
  /** Tamaño de la imagen ya escalada y su desplazamiento dentro del marco (negativo = recortada). */
  rendered: Rect;
  /** Parte de la imagen original que queda visible, en px de la imagen. */
  visible: Rect;
  /** Porcentaje del ancho / alto de la imagen que queda fuera del marco. */
  croppedX: number;
  croppedY: number;
}

/** object-fit / background-size: cover con posición (0..1). Centro = 0.5; "top" = 0. */
export function computeCoverCrop(image: ImageSize, frame: ImageSize, position = { x: 0.5, y: 0.5 }): CoverCrop {
  const scale = Math.max(frame.width / image.width, frame.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (frame.width - width) * position.x;
  const y = (frame.height - height) * position.y;
  const visible = { x: -x / scale, y: -y / scale, width: frame.width / scale, height: frame.height / scale };
  return {
    scale,
    rendered: { x, y, width, height },
    visible,
    croppedX: 1 - visible.width / image.width,
    croppedY: 1 - visible.height / image.height,
  };
}

// ── Portada (Banner) ────────────────────────────────────────────────────────

export const BANNER_HEIGHT = 192;

export interface BannerFrame { id: "desktop" | "mobile-narrow" | "mobile"; label: string; hint: string; width: number }

/** Anchos reales de la portada: tarjeta max-w-md (448) y pantallas con 16 px de margen lateral. */
export const BANNER_FRAMES: readonly BannerFrame[] = [
  { id: "desktop", label: "Escritorio", hint: "448 × 192 px", width: 448 },
  { id: "mobile-narrow", label: "Móvil estrecho", hint: "288 × 192 px", width: 288 },
  { id: "mobile", label: "Móvil habitual", hint: "358 × 192 px", width: 358 },
];

/** La imagen recomendada (1344 × 576) se muestra a escala 1/3 en los 192 px de alto. */
const BANNER_REFERENCE_SCALE = BANNER_HEIGHT / PROFILE_IMAGE_SPECS.cover.variants[0].height;
/** Margen superior de la zona segura en la imagen de referencia (px): 24 → 8 px en pantalla. */
export const BANNER_SAFE_ZONE_TOP = 24;
export const BANNER_SAFE_MARGIN_TOP = BANNER_SAFE_ZONE_TOP * BANNER_REFERENCE_SCALE;
/** Por debajo de este tamaño (px en pantalla, en cualquiera de las vistas) la zona no es útil. */
export const BANNER_SAFE_MIN = { width: 96, height: 48 } as const;

export type BannerOverlayKind = "avatar" | "logo-badge" | "curve";

export interface BannerOverlay {
  kind: BannerOverlayKind;
  label: string;
  /** Área cubierta dentro de la portada (px CSS, x relativo al centro: se calcula por marco). */
  width: number | "full";
  height: number;
  /** Tamaño total del elemento (puede sobresalir por debajo de la portada). */
  elementSize?: number;
  shape?: NormalizedPhotoStyle | "circle";
  curve?: "arc" | "wave";
}

/** Alturas de las curvas SVG (h-10 / h-8) que CardProfileView dibuja al pie de la portada. */
export const BANNER_CURVE_HEIGHT = { arc: 40, wave: 32 } as const;

/**
 * Elementos del perfil que se superponen a la portada según la plantilla, curva y marco
 * realmente elegidos (mismas reglas que CardProfileView).
 */
export function getBannerOverlays(input: { template: string | null | undefined; bannerStyle: string | null | undefined; photoStyle: string | null | undefined }): BannerOverlay[] {
  const template = normalizeTemplate(input.template);
  const banner = normalizeBannerStyle(input.bannerStyle, input.template);
  const overlays: BannerOverlay[] = [];

  if (banner === "arc" || banner === "wave") {
    overlays.push({ kind: "curve", label: banner === "arc" ? "Curva en arco" : "Curva en ola", width: "full", height: BANNER_CURVE_HEIGHT[banner], curve: banner });
  }

  if (template === "company-dark" || template === "company-light") {
    // Insignia circular w-16 (64 px) con bottom -32 px: cubre los 32 px inferiores.
    overlays.push({ kind: "logo-badge", label: "Logo circular", width: 64, height: 32, elementSize: 64, shape: "circle" });
  } else {
    // Avatar h-32 (128 px); contenedor pt-4 (16) y -mt-20 (-80): sube 64 px sobre la portada.
    overlays.push({ kind: "avatar", label: "Foto de perfil", width: 128, height: 64, elementSize: 128, shape: normalizePhotoStyle(input.photoStyle) });
  }

  return overlays;
}

/** Rectángulo cubierto por un overlay dentro de un marco de ancho dado. */
export function overlayRect(overlay: BannerOverlay, frameWidth: number): Rect {
  const width = overlay.width === "full" ? frameWidth : overlay.width;
  return { x: (frameWidth - width) / 2, y: BANNER_HEIGHT - overlay.height, width, height: overlay.height };
}

export interface BannerSafeZoneResult {
  /** La zona segura, en px de la imagen original: la misma región para todas las vistas. */
  image: Rect;
  /** Esa misma región proyectada en cada vista (px CSS del marco). */
  frames: Record<BannerFrame["id"], Rect>;
}

/**
 * Zona segura real de una imagen concreta: la región de la imagen que se ve en las tres
 * vistas y que ningún elemento superpuesto tapa.
 *
 * En cada vista, la parte utilizable de la pantalla es la franja [margen superior, borde
 * superior del overlay más alto] a todo el ancho (restricción conservadora: el avatar y el
 * logo solo ocupan el centro, pero la zona debe ser un único rectángulo). Esa franja se lleva
 * a coordenadas de la imagen con el mismo object-cover centrado de la landing y se intersectan
 * las tres. Devuelve null si el resultado no es útil en alguna vista.
 */
export function computeBannerSafeZone(image: ImageSize, overlays: readonly BannerOverlay[], frames: readonly BannerFrame[] = BANNER_FRAMES): BannerSafeZoneResult | null {
  if (!(image.width > 0) || !(image.height > 0)) return null;
  const top = BANNER_SAFE_MARGIN_TOP;
  const bottom = Math.min(BANNER_HEIGHT, ...overlays.map((o) => BANNER_HEIGHT - o.height));

  let x0 = 0, y0 = 0, x1 = image.width, y1 = image.height;
  for (const frame of frames) {
    const { scale, rendered } = computeCoverCrop(image, { width: frame.width, height: BANNER_HEIGHT });
    x0 = Math.max(x0, (0 - rendered.x) / scale);
    x1 = Math.min(x1, (frame.width - rendered.x) / scale);
    y0 = Math.max(y0, (top - rendered.y) / scale);
    y1 = Math.min(y1, (bottom - rendered.y) / scale);
  }
  if (x1 <= x0 || y1 <= y0) return null;

  const region: Rect = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  const projected = {} as Record<BannerFrame["id"], Rect>;
  for (const frame of frames) {
    const { scale, rendered } = computeCoverCrop(image, { width: frame.width, height: BANNER_HEIGHT });
    const r = { x: region.x * scale + rendered.x, y: region.y * scale + rendered.y, width: region.width * scale, height: region.height * scale };
    if (r.width < BANNER_SAFE_MIN.width || r.height < BANNER_SAFE_MIN.height) return null;
    projected[frame.id] = r;
  }
  return { image: region, frames: projected };
}

// ── Hero / Fondo ────────────────────────────────────────────────────────────

export const HERO_MOBILE = { width: 390, stripHeight: 220, cardOverlap: 48, cardInset: 16 } as const;
export const HERO_DESKTOP = { width: 1440, height: 900, cardWidth: 448, paddingY: 32 } as const;
/** Oscurecimiento aplicado por CardProfileView (idéntico en ambos modos). */
export const HERO_DESKTOP_GRADIENT = "linear-gradient(180deg, rgba(3, 7, 18, 0.48) 0%, rgba(3, 7, 18, 0.82) 55%, rgba(3, 7, 18, 0.96) 100%)";
export const HERO_MOBILE_GRADIENT = "linear-gradient(180deg, rgba(3, 7, 18, 0.3) 0%, rgba(3, 7, 18, 0.6) 100%)";
/** background-position: center top */
export const HERO_POSITION = { x: 0.5, y: 0 } as const;

/** Trazados SVG (viewBox 0 0 1200 120, preserveAspectRatio="none") de las curvas de la portada. */
export const BANNER_CURVE_PATHS = {
  arc: "M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0C26.9,4.75,55.05,16.32,80,29.35,140.75,61,207.77,77.51,321.39,56.44Z",
  wave: "M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86C207.77,77.51,140.75,61,80,29.35,55.05,16.32,26.9,4.75,0,0V120H1200V95.83C1132.19,118.92,1055.71,111.31,985.66,92.83Z",
} as const;
