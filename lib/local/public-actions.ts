// Núcleo reutilizable de acciones públicas de SmartNFC Local.
// Módulo puro (sin Prisma ni APIs de Node): lo usan la landing pública, la vista previa del editor
// de identidad y la vista previa del formulario de puntos. El futuro Action Builder entregará
// PublicAction[] persistidas y esta misma capa las dibujará sin rehacer la landing.
import { phoneHref, type ResolvedLocalBrand } from "./brand";

export const PUBLIC_ACTION_TYPES = [
  "whatsapp", "instagram", "facebook", "tiktok", "youtube", "linkedin", "x", "threads",
  "google_review", "web", "menu", "promotion", "location", "phone", "link",
] as const;
export type PublicActionType = (typeof PUBLIC_ACTION_TYPES)[number];

export type PublicAction = {
  key: string;
  type: PublicActionType;
  label: string;
  detail?: string | null;
  /** Sin href la acción se dibuja no navegable (vistas previas). */
  href?: string;
  order: number;
  enabled: boolean;
  external: boolean;
  /** "primary": acción protagonista del objetivo; "secondary": otras acciones; "contact": datos del Local. */
  group: "primary" | "secondary" | "contact";
};

/** Textos por defecto: invitan a una acción; no afirman resultados (mensaje enviado, reseña, seguidor). */
export const ACTION_DEFAULT_LABELS: Record<PublicActionType, string> = {
  whatsapp: "Escríbenos por WhatsApp",
  instagram: "Síguenos en Instagram",
  facebook: "Visítanos en Facebook",
  tiktok: "Míranos en TikTok",
  youtube: "Míranos en YouTube",
  linkedin: "Conéctate en LinkedIn",
  x: "Síguenos en X",
  threads: "Síguenos en Threads",
  google_review: "Déjanos tu opinión en Google",
  web: "Visita nuestro sitio web",
  menu: "Ver menú",
  promotion: "Ver promoción",
  location: "Cómo llegar",
  phone: "Llamar",
  link: "Abrir enlace",
};

const HOSTS: Array<[PublicActionType, string[]]> = [
  ["whatsapp", ["wa.me", "api.whatsapp.com", "whatsapp.com"]],
  ["instagram", ["instagram.com"]],
  ["facebook", ["facebook.com", "fb.com", "m.facebook.com"]],
  ["tiktok", ["tiktok.com"]],
  ["youtube", ["youtube.com", "youtu.be", "m.youtube.com"]],
  ["linkedin", ["linkedin.com"]],
  ["x", ["x.com", "twitter.com"]],
  ["threads", ["threads.net", "threads.com"]],
];
const GOOGLE_REVIEW_HOSTS = ["g.page", "search.google.com"];

function hostOf(url: string) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}
const matches = (host: string, domains: string[]) => domains.some(d => host === d || host.endsWith("." + d));

/** Tipo visual deducido del dominio. Solo afecta ícono y texto, nunca el destino. */
export function actionTypeFromUrl(url: string): PublicActionType {
  const host = hostOf(url);
  if (!host) return "link";
  for (const [type, domains] of HOSTS) if (matches(host, domains)) return type;
  if (matches(host, GOOGLE_REVIEW_HOSTS) || (/(^|\.)google\.[a-z.]+$/.test(host) && /review|writereview|lrd=/i.test(url))) return "google_review";
  return "web";
}

type PointObjective = "GOOGLE_REVIEW" | "WHATSAPP" | "SOCIAL" | "CLUB" | "PROMOTION" | "MENU" | "SMART_LANDING";
export function objectiveActionType(objective: PointObjective, destinationUrl: string): PublicActionType {
  switch (objective) {
    case "GOOGLE_REVIEW": return "google_review";
    case "WHATSAPP": return "whatsapp";
    case "MENU": return "menu";
    case "PROMOTION": return "promotion";
    case "SOCIAL": { const t = actionTypeFromUrl(destinationUrl); return t === "web" || t === "google_review" ? "link" : t; }
    default: return "link";
  }
}

export type PointActionSource = {
  code: string; objective: PointObjective; destinationUrl: string | null;
  smartLinks: Array<{ label: string; url: string }>; configurationVersion: number;
};

/**
 * Acciones del objetivo de un punto. Los href apuntan SIEMPRE a /p/<code>/go (el servidor redirige
 * solo a URLs guardadas y registra la salida con los eventos existentes). Con `interactive: false`
 * no se generan href (vista previa).
 */
export function buildPointActions(point: PointActionSource, opts: { interactive: boolean; visitId?: string | null }): PublicAction[] {
  if (point.objective === "CLUB") return [];
  const q = (extra: string) => `/p/${encodeURIComponent(point.code)}/go?${extra}&version=${point.configurationVersion}${opts.visitId ? "&v=" + encodeURIComponent(opts.visitId) : ""}`;
  if (point.objective === "SMART_LANDING") {
    return point.smartLinks.slice(0, 6).map((link, index) => ({
      key: `link-${index}`, type: actionTypeFromUrl(link.url), label: link.label, detail: null,
      href: opts.interactive ? q(`index=${index}`) : undefined, order: index, enabled: true, external: false,
      group: index === 0 ? "primary" : "secondary",
    }));
  }
  if (!point.destinationUrl) return [];
  const type = objectiveActionType(point.objective, point.destinationUrl);
  return [{
    key: "primary", type, label: ACTION_DEFAULT_LABELS[type], detail: null,
    href: opts.interactive ? q("action=primary") : undefined, order: 0, enabled: true, external: false, group: "primary",
  }];
}

function prettyPhone(phone: string) {
  const m = /^\+56(9)(\d{4})(\d{4})$/.exec(phone);
  return m ? `+56 ${m[1]} ${m[2]} ${m[3]}` : phone;
}

/** Acciones de contacto provenientes de la identidad del Local (teléfono, ubicación, web). Sin registro de clics en este bloque. */
export function buildContactActions(brand: ResolvedLocalBrand, opts: { interactive: boolean; startOrder?: number }): PublicAction[] {
  const start = opts.startOrder ?? 100;
  const out: PublicAction[] = [];
  if (brand.phone) out.push({ key: "contact-phone", type: "phone", label: ACTION_DEFAULT_LABELS.phone, detail: prettyPhone(brand.phone),
    href: opts.interactive ? phoneHref(brand.phone) : undefined, order: start, enabled: true, external: false, group: "contact" });
  if (brand.mapsUrl) out.push({ key: "contact-location", type: "location", label: ACTION_DEFAULT_LABELS.location, detail: "Ver en el mapa",
    href: opts.interactive ? brand.mapsUrl : undefined, order: start + 1, enabled: true, external: true, group: "contact" });
  if (brand.websiteUrl) out.push({ key: "contact-web", type: "web", label: "Sitio web", detail: hostOf(brand.websiteUrl) || brand.websiteUrl,
    href: opts.interactive ? brand.websiteUrl : undefined, order: start + 2, enabled: true, external: true, group: "contact" });
  return out;
}

/** Acciones visibles de un grupo, ordenadas. */
export function visibleActions(actions: PublicAction[], group: PublicAction["group"]) {
  return actions.filter(a => a.enabled && a.group === group).sort((a, b) => a.order - b.order);
}
