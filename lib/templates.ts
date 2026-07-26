/**
 * Centralized utility functions to normalize templates, photo styles,
 * and banner styles from legacy values to the simplified production formats.
 */

export type NormalizedTemplate =
  | "classic-dark"
  | "classic-light"
  | "neobrutalist"
  | "split-diagonal"
  | "company-dark"
  | "company-light";

export type NormalizedPhotoStyle =
  | "circle"
  | "rounded-square"
  | "hexagon"
  | "no-frame";

export type NormalizedBannerStyle =
  | "straight"
  | "arc"
  | "wave";

/**
 * Maps a legacy or current template name to one of the 6 definitive formats.
 */
export function normalizeTemplate(template: string | null | undefined): NormalizedTemplate {
  if (!template) return "classic-dark";

  const t = template.trim().toLowerCase();

  switch (t) {
    // 1. Clásico Corporativo Oscuro
    case "corporate-1":
    case "corporate-2":
    case "corporate-3":
    case "corporate-5":
    case "comercial-3":
    case "comercial-5":
    case "creator-1":
    case "creator-5":
    case "classic-dark":
      return "classic-dark";

    // 2. Clásico Corporativo Claro
    case "corporate-4":
    case "personal-5":
    case "creator-3":
    case "classic-light":
      return "classic-light";

    // 3. Neobrutalista
    case "personal-1":
    case "neobrutalist":
      return "neobrutalist";

    // 4. Split Diagonal
    case "personal-2":
    case "personal-4":
    case "comercial-4":
    case "creator-4":
    case "split-diagonal":
      return "split-diagonal";

    // 5. Ficha Empresa Oscuro
    case "business-1":
    case "business-2":
    case "business-5":
    case "creator-2":
    case "company-dark":
      return "company-dark";

    // 6. Ficha Empresa Claro
    case "business-3":
    case "business-4":
    case "personal-3":
    case "comercial-1":
    case "comercial-2":
    case "company-light":
      return "company-light";

    default:
      return "classic-dark";
  }
}

/**
 * Maps a legacy or current photo style to one of the 4 definitive frames.
 */
export function normalizePhotoStyle(photoStyle: string | null | undefined): NormalizedPhotoStyle {
  if (!photoStyle) return "circle";

  const p = photoStyle.trim().toLowerCase();

  switch (p) {
    // 1. Círculo
    case "circle":
    case "rounded-border":
    case "floating":
    case "luxury":
    case "premium-black":
    case "double-ring":
    case "neon":
      return "circle";

    // 2. Cuadrado Redondeado
    case "soft-square":
    case "corporate":
    case "slanted":
    case "shadow":
    case "rounded-square":
      return "rounded-square";

    // 3. Hexágono
    case "hexagon":
    case "diamond":
    case "shield":
    case "tech":
      return "hexagon";

    // 4. Sin Marco / Cuadrado Puro
    case "no-frame":
    case "minimalist":
    case "gamer":
    case "industrial":
    case "custom-ia":
    case "polaroid":
      return "no-frame";

    default:
      return "circle";
  }
}

/**
 * Maps a legacy or current banner style to one of the 3 definitive formats.
 * Takes the raw template into account to provide legacy-compatible defaults.
 */
export function normalizeBannerStyle(
  bannerStyle: string | null | undefined,
  template: string | null | undefined
): NormalizedBannerStyle {
  if (!bannerStyle || bannerStyle === "classic") {
    const rawTemplate = template ? template.trim().toLowerCase() : "";
    if (rawTemplate === "business-1") return "arc";
    if (rawTemplate === "business-3" || rawTemplate === "business-4") return "arc";
    return "straight";
  }

  const b = bannerStyle.trim().toLowerCase();

  switch (b) {
    case "straight":
    case "classic":
      return "straight";

    case "arc":
    case "arch":
      return "arc";

    case "wave":
    case "diagonal":
      return "wave";

    default:
      return "straight";
  }
}
