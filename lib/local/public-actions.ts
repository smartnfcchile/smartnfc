// Núcleo reutilizable de acciones públicas de SmartNFC Local (Action Builder).
// Módulo puro (sin Prisma ni APIs de Node): lo usan el servidor (resolución y /go), la landing pública,
// el Action Builder y todas las vistas previas. Registro único: tipo → nombre → texto por defecto → validación → destino.
// Para agregar un tipo nuevo: sumarlo a PUBLIC_ACTION_TYPES, ACTION_REGISTRY y ACTION_ICONS (components/local/public/action-icons.tsx).
import { z } from "zod";
import { normalizePhone, phoneHref, type ResolvedLocalBrand } from "./brand";
import { safeDestination } from "./safe-url";

export const PUBLIC_ACTION_TYPES = [
  "WHATSAPP", "INSTAGRAM", "FACEBOOK", "TIKTOK", "YOUTUBE", "LINKEDIN", "X", "THREADS",
  "GOOGLE_REVIEW", "WEB", "MENU", "PROMOTION", "LOCATION", "PHONE", "LINK",
] as const;
export type PublicActionType = (typeof PUBLIC_ACTION_TYPES)[number];
export type ActionRole = "primary" | "secondary" | "contact";

type ActionInput = "url" | "phone" | "whatsapp";
type ActionDefinition = {
  /** Nombre del tipo en el editor. */
  name: string;
  /** Texto público por defecto: invita a una acción, nunca afirma un resultado (mensaje enviado, reseña, seguidor, compra). */
  defaultLabel: string;
  input: ActionInput;
  placeholder: string;
  /** Dominios permitidos (tipos de marca): el ícono nunca promete una red distinta del destino real. */
  hosts?: string[];
};

export const ACTION_REGISTRY: Record<PublicActionType, ActionDefinition> = {
  WHATSAPP: { name: "WhatsApp", defaultLabel: "Escríbenos por WhatsApp", input: "whatsapp", placeholder: "+56 9 1234 5678" },
  INSTAGRAM: { name: "Instagram", defaultLabel: "Síguenos en Instagram", input: "url", placeholder: "https://www.instagram.com/tu-local", hosts: ["instagram.com"] },
  FACEBOOK: { name: "Facebook", defaultLabel: "Visítanos en Facebook", input: "url", placeholder: "https://www.facebook.com/tu-local", hosts: ["facebook.com", "fb.com"] },
  TIKTOK: { name: "TikTok", defaultLabel: "Míranos en TikTok", input: "url", placeholder: "https://www.tiktok.com/@tu-local", hosts: ["tiktok.com"] },
  YOUTUBE: { name: "YouTube", defaultLabel: "Míranos en YouTube", input: "url", placeholder: "https://www.youtube.com/@tu-local", hosts: ["youtube.com", "youtu.be"] },
  LINKEDIN: { name: "LinkedIn", defaultLabel: "Conéctate en LinkedIn", input: "url", placeholder: "https://www.linkedin.com/company/tu-local", hosts: ["linkedin.com"] },
  X: { name: "X", defaultLabel: "Síguenos en X", input: "url", placeholder: "https://x.com/tu-local", hosts: ["x.com", "twitter.com"] },
  THREADS: { name: "Threads", defaultLabel: "Síguenos en Threads", input: "url", placeholder: "https://www.threads.net/@tu-local", hosts: ["threads.net", "threads.com"] },
  GOOGLE_REVIEW: { name: "Reseña en Google", defaultLabel: "Déjanos tu opinión en Google", input: "url", placeholder: "https://g.page/r/…/review",
    hosts: ["g.page", "goo.gl", "google.com", "google.cl"] },
  WEB: { name: "Sitio web", defaultLabel: "Visita nuestro sitio web", input: "url", placeholder: "https://www.tu-local.cl" },
  MENU: { name: "Menú o catálogo", defaultLabel: "Ver menú", input: "url", placeholder: "https://… (web o PDF)" },
  PROMOTION: { name: "Promoción", defaultLabel: "Ver promoción", input: "url", placeholder: "https://…" },
  LOCATION: { name: "Ubicación", defaultLabel: "Cómo llegar", input: "url", placeholder: "https://maps.app.goo.gl/…" },
  PHONE: { name: "Llamar", defaultLabel: "Llamar", input: "phone", placeholder: "+56 9 1234 5678" },
  LINK: { name: "Otro enlace", defaultLabel: "Abrir enlace", input: "url", placeholder: "https://…" },
};
/** Compatibilidad: textos por defecto por tipo. */
export const ACTION_DEFAULT_LABELS = Object.fromEntries(PUBLIC_ACTION_TYPES.map(t => [t, ACTION_REGISTRY[t].defaultLabel])) as Record<PublicActionType, string>;

export const MAX_POINT_ACTIONS = 12;
export const ACTION_LIMITS = { label: 60, message: 300, value: 2048 } as const;
/** Ids generados por el editor: minúsculas y dígitos. Los ids reservados del sistema ("primary", "link-N", "contact-*") no calzan con este patrón. */
export const ACTION_ID_PATTERN = /^[a-z0-9]{8,24}$/;
/** Ids que pueden llegar a /go: generados, acción principal, enlaces heredados de Smart Landing y contacto del Local. */
export const PUBLIC_ACTION_ID_PATTERN = /^([a-z0-9]{8,24}|primary|link-[0-5]|contact-(phone|location|web))$/;

function hostOf(url: string) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}
const matches = (host: string, domains: string[]) => domains.some(d => host === d || host.endsWith("." + d));

/** Tipo visual deducido del dominio (enlaces heredados). Solo afecta ícono y texto, nunca el destino. */
export function actionTypeFromUrl(url: string): PublicActionType {
  const host = hostOf(url);
  if (!host) return "LINK";
  if (host === "wa.me" || matches(host, ["api.whatsapp.com", "whatsapp.com"])) return "WHATSAPP";
  for (const type of ["INSTAGRAM", "FACEBOOK", "TIKTOK", "YOUTUBE", "LINKEDIN", "X", "THREADS"] as const) {
    if (matches(host, ACTION_REGISTRY[type].hosts!)) return type;
  }
  if (matches(host, ["g.page", "search.google.com"]) || (/(^|\.)google\.[a-z.]+$/.test(host) && /review|writereview|lrd=/i.test(url))) return "GOOGLE_REVIEW";
  return "WEB";
}

/** Dígitos de WhatsApp desde un teléfono o un enlace wa.me/api.whatsapp.com pegado por el usuario. */
function whatsappDigits(value: string): string | null {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) {
    try {
      const u = new URL(v);
      const host = u.hostname.toLowerCase().replace(/^www\./, "");
      const digits = host === "wa.me" ? u.pathname.slice(1) : host === "api.whatsapp.com" ? (u.searchParams.get("phone") || "") : "";
      return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
    } catch { return null; }
  }
  const phone = normalizePhone(v);
  return phone ? phone.slice(1) : null;
}
/** Enlace de WhatsApp construido en el servidor desde datos estructurados (nunca una URL libre). */
export function whatsappUrl(phoneOrDigits: string, message?: string | null) {
  const digits = phoneOrDigits.replace(/^\+/, "");
  const text = message?.trim();
  return `https://wa.me/${digits}${text ? "?text=" + encodeURIComponent(text) : ""}`;
}

/** Valida y normaliza el valor de una acción según su tipo. */
export function normalizeActionValue(type: PublicActionType, value: string): { ok: true; value: string } | { ok: false; error: string } {
  const def = ACTION_REGISTRY[type];
  const v = value.trim();
  if (!v) return { ok: false, error: def.input === "url" ? "agrega el enlace." : "agrega el número." };
  if (def.input === "whatsapp") {
    const digits = whatsappDigits(v);
    return digits ? { ok: true, value: "+" + digits } : { ok: false, error: "usa un número con código de país, por ejemplo +56 9 1234 5678." };
  }
  if (def.input === "phone") {
    const phone = normalizePhone(v);
    return phone ? { ok: true, value: phone } : { ok: false, error: "usa un teléfono válido, por ejemplo +56 9 1234 5678." };
  }
  if (v.length > ACTION_LIMITS.value || !safeDestination(v)) return { ok: false, error: "usa una dirección https:// pública válida." };
  if (def.hosts && !matches(hostOf(v), def.hosts)) return { ok: false, error: `el enlace debe ser de ${def.name}.` };
  return { ok: true, value: v };
}

export const storedActionSchema = z.object({
  id: z.string().regex(ACTION_ID_PATTERN, "Acción inválida."),
  type: z.enum(PUBLIC_ACTION_TYPES),
  label: z.string().trim().max(ACTION_LIMITS.label, `Texto del botón: máximo ${ACTION_LIMITS.label} caracteres.`).default(""),
  value: z.string().max(ACTION_LIMITS.value),
  message: z.string().trim().max(ACTION_LIMITS.message, `Mensaje: máximo ${ACTION_LIMITS.message} caracteres.`).default(""),
  enabled: z.boolean().default(true),
}).strict().transform((action, ctx) => {
  const result = normalizeActionValue(action.type, action.value);
  if (!result.ok) { ctx.addIssue({ code: "custom", message: `${ACTION_REGISTRY[action.type].name}: ${result.error}`, path: ["value"] }); return z.NEVER; }
  return { ...action, value: result.value, message: action.type === "WHATSAPP" ? action.message : "" };
});
export type StoredAction = z.output<typeof storedActionSchema>;
export type StoredActionInput = z.input<typeof storedActionSchema>;
export const pointActionsSchema = z.array(storedActionSchema).max(MAX_POINT_ACTIONS, `Máximo ${MAX_POINT_ACTIONS} acciones.`)
  .refine(list => new Set(list.map(a => a.id)).size === list.length, "Hay acciones duplicadas. Recarga la página.");

/**
 * Lectura tolerante desde la base: descarta solo las acciones que ya no sean válidas (p. ej. si una regla se endurece)
 * sin invalidar el punto. Ningún NFC/QR entregado debe quedar inutilizable por un cambio de validación.
 */
export function readStoredActions(value: unknown): StoredAction[] {
  if (!Array.isArray(value)) return [];
  const out: StoredAction[] = [];
  for (const item of value.slice(0, MAX_POINT_ACTIONS)) {
    const parsed = storedActionSchema.safeParse(item);
    if (parsed.success && !out.some(a => a.id === parsed.data.id)) out.push(parsed.data);
  }
  return out;
}

/** Destino final de una acción guardada (https o tel:). */
export function storedActionDestination(action: StoredAction): string {
  if (action.type === "WHATSAPP") return whatsappUrl(action.value, action.message);
  if (action.type === "PHONE") return phoneHref(action.value);
  return action.value;
}
export const actionLabel = (action: { type: PublicActionType; label?: string | null }) => action.label?.trim() || ACTION_REGISTRY[action.type].defaultLabel;

// ── Resolución: la misma función para servidor, landing y vistas previas ────────────────────────
type PointObjective = "GOOGLE_REVIEW" | "WHATSAPP" | "SOCIAL" | "CLUB" | "PROMOTION" | "MENU" | "SMART_LANDING";
export function objectiveActionType(objective: PointObjective, destinationUrl: string): PublicActionType {
  switch (objective) {
    case "GOOGLE_REVIEW": return "GOOGLE_REVIEW";
    case "WHATSAPP": return "WHATSAPP";
    case "MENU": return "MENU";
    case "PROMOTION": return "PROMOTION";
    case "SOCIAL": { const t = actionTypeFromUrl(destinationUrl); return t === "WEB" || t === "GOOGLE_REVIEW" ? "LINK" : t; }
    default: return "LINK";
  }
}

export type ResolvedAction = {
  id: string; type: PublicActionType; label: string; detail?: string | null;
  /** Destino validado (https o tel:). Solo el servidor redirige a él; el navegador nunca lo elige. */
  destination: string; role: ActionRole;
};
export type PointActionSource = {
  objective: PointObjective; destinationUrl: string | null;
  smartLinks: Array<{ label: string; url: string }>; actions: StoredAction[];
};

/**
 * Acciones de un punto en orden público.
 * - SMART_LANDING: acciones guardadas; si aún no tiene, sus smartLinks heredados (ids "link-N").
 * - Objetivos de acción única: acción principal (destino del objetivo, id "primary") + acciones adicionales.
 * - CLUB: ninguna (usa su propia página).
 */
export function resolvePointActions(point: PointActionSource): ResolvedAction[] {
  if (point.objective === "CLUB") return [];
  const stored = point.actions.filter(a => a.enabled).map(a => ({ id: a.id, type: a.type, label: actionLabel(a), destination: storedActionDestination(a) }));
  if (point.objective === "SMART_LANDING") {
    const list = point.actions.length ? stored
      : point.smartLinks.slice(0, 6).map((l, i) => ({ id: `link-${i}`, type: actionTypeFromUrl(l.url), label: l.label, destination: l.url }));
    return list.map((a, i) => ({ ...a, role: i === 0 ? "primary" as const : "secondary" as const }));
  }
  const out: ResolvedAction[] = [];
  if (point.destinationUrl) {
    const type = objectiveActionType(point.objective, point.destinationUrl);
    out.push({ id: "primary", type, label: ACTION_REGISTRY[type].defaultLabel, destination: point.destinationUrl, role: "primary" });
  }
  return [...out, ...stored.map(a => ({ ...a, role: "secondary" as const }))];
}

function prettyPhone(phone: string) {
  const m = /^\+56(9)(\d{4})(\d{4})$/.exec(phone);
  return m ? `+56 ${m[1]} ${m[2]} ${m[3]}` : phone;
}
/** Acciones de contacto de la identidad del Local (teléfono, ubicación, web). */
export function resolveContactActions(brand: ResolvedLocalBrand): ResolvedAction[] {
  const out: ResolvedAction[] = [];
  if (brand.phone) out.push({ id: "contact-phone", type: "PHONE", label: ACTION_REGISTRY.PHONE.defaultLabel, detail: prettyPhone(brand.phone), destination: phoneHref(brand.phone), role: "contact" });
  if (brand.mapsUrl) out.push({ id: "contact-location", type: "LOCATION", label: ACTION_REGISTRY.LOCATION.defaultLabel, detail: "Ver en el mapa", destination: brand.mapsUrl, role: "contact" });
  if (brand.websiteUrl) out.push({ id: "contact-web", type: "WEB", label: "Sitio web", detail: hostOf(brand.websiteUrl) || brand.websiteUrl, destination: brand.websiteUrl, role: "contact" });
  return out;
}

// ── Presentación ────────────────────────────────────────────────────────────
export type PublicAction = {
  key: string;
  type: PublicActionType;
  label: string;
  detail?: string | null;
  /** Sin href la acción se dibuja no navegable (vistas previas). */
  href?: string;
  /** Registro del clic para enlaces tel: (atributo HTML `ping`, sin JavaScript). */
  ping?: string;
  order: number;
  enabled: boolean;
  external: boolean;
  group: ActionRole;
};

/**
 * Convierte acciones resueltas en botones. Con `code`, los enlaces pasan por /p/<code>/go?action=<id>
 * (el servidor redirige solo a destinos guardados y registra el clic); los tel: se abren directo y
 * registran el clic con `ping`. Sin `code` enlazan directo al destino; con `interactive: false` no enlazan (vista previa).
 */
export function toPublicActions(actions: ResolvedAction[], opts: { interactive: boolean; code?: string; version?: number; visitId?: string | null }): PublicAction[] {
  const go = (id: string) => `/p/${encodeURIComponent(opts.code!)}/go?action=${encodeURIComponent(id)}&version=${opts.version ?? 0}${opts.visitId ? "&v=" + encodeURIComponent(opts.visitId) : ""}`;
  return actions.map((a, index) => {
    const tel = a.destination.startsWith("tel:");
    const href = !opts.interactive ? undefined : !opts.code || tel ? a.destination : go(a.id);
    return {
      key: a.id, type: a.type, label: a.label, detail: a.detail ?? null, href,
      ping: opts.interactive && opts.code && tel ? go(a.id) : undefined,
      order: (a.role === "contact" ? 100 : 0) + index, enabled: true, external: a.role === "contact" && !tel, group: a.role,
    };
  });
}

/** Atajo compatible: contacto del Local como botones. */
export function buildContactActions(brand: ResolvedLocalBrand, opts: { interactive: boolean }): PublicAction[] {
  return toPublicActions(resolveContactActions(brand), { interactive: opts.interactive });
}

/** Acciones visibles de un grupo, ordenadas. */
export function visibleActions(actions: PublicAction[], group: PublicAction["group"]) {
  return actions.filter(a => a.enabled && a.group === group).sort((a, b) => a.order - b.order);
}

/**
 * Convierte un enlace heredado de Smart Landing (smartLinks) en datos de acción para el editor.
 * Conserva el mensaje de wa.me?text= y cae a LINK si el tipo deducido no valida (el enlace sigue siendo el mismo).
 */
export function legacyLinkToAction(link: { label: string; url: string }): { type: PublicActionType; label: string; value: string; message: string } {
  const type = actionTypeFromUrl(link.url);
  let message = "";
  if (type === "WHATSAPP") { try { message = new URL(link.url).searchParams.get("text")?.slice(0, ACTION_LIMITS.message) || ""; } catch { /* sin mensaje */ } }
  const normalized = normalizeActionValue(type, link.url);
  return normalized.ok ? { type, label: link.label, value: normalized.value, message } : { type: "LINK", label: link.label, value: link.url, message: "" };
}

/** Id nuevo para una acción creada en el editor. */
export function newActionId() {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, b => (b % 36).toString(36)).join("") + Date.now().toString(36).slice(-4);
}
