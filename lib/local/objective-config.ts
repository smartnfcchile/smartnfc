// Configuración estructurada del objetivo de un Punto Inteligente (LocalTouchpoint.objectiveConfig).
// Módulo puro. El destino principal sigue en destinationUrl (DIRECT y versiones anteriores lo leen tal cual);
// aquí vive lo que el destino no expresa: el texto del botón principal y, en promociones, su contenido y vigencia.
import { z } from "zod";
import { REPORT_TIMEZONE } from "./report-period";
import { isPublicHttpsUrl } from "./brand";

export const OBJECTIVE_CTA_MAX = 60;
export const PROMOTION_LIMITS = { title: 80, description: 400, url: 2048 } as const;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isRealDay = (v: string) => { if (!DAY.test(v)) return false; const d = new Date(v + "T12:00:00Z"); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v; };
const optionalDay = (label: string) => z.string().trim().refine(v => !v || isRealDay(v), `${label}: usa una fecha válida.`).default("");

/** Contenido de una promoción. Las fechas son días (AAAA-MM-DD) en la hora de Chile, inicio y término inclusivos. */
export const promotionSchema = z.object({
  title: z.string().trim().max(PROMOTION_LIMITS.title, `Título: máximo ${PROMOTION_LIMITS.title} caracteres.`).default(""),
  description: z.string().trim().max(PROMOTION_LIMITS.description, `Descripción: máximo ${PROMOTION_LIMITS.description} caracteres.`).default(""),
  /** Imagen subida desde el editor a la carpeta del Local (se valida contra el Local del punto al guardar). */
  imageUrl: z.string().trim().max(PROMOTION_LIMITS.url).default(""),
  startDate: optionalDay("Fecha de inicio"),
  endDate: optionalDay("Fecha de término"),
}).strict().refine(p => !p.startDate || !p.endDate || p.startDate <= p.endDate, { message: "La fecha de término debe ser igual o posterior a la de inicio.", path: ["endDate"] });
export type Promotion = z.output<typeof promotionSchema>;

export const objectiveConfigSchema = z.object({
  ctaLabel: z.string().trim().max(OBJECTIVE_CTA_MAX, `Texto del botón: máximo ${OBJECTIVE_CTA_MAX} caracteres.`).default(""),
  promotion: promotionSchema.optional(),
}).strict();
export type ObjectiveConfig = z.output<typeof objectiveConfigSchema>;
export const EMPTY_OBJECTIVE_CONFIG: ObjectiveConfig = { ctaLabel: "" };

/**
 * Lectura tolerante desde la base, por partes: un texto o una promoción que no validen se omiten sin afectar
 * lo demás ni invalidar el punto (ningún NFC/QR entregado queda inutilizable por un cambio de reglas).
 */
export function readObjectiveConfig(value: unknown): ObjectiveConfig {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const cta = objectiveConfigSchema.shape.ctaLabel.safeParse(raw.ctaLabel ?? "");
  const promotion = raw.promotion === undefined ? undefined : promotionSchema.safeParse(raw.promotion);
  return { ctaLabel: cta.success ? cta.data : "", ...(promotion?.success ? { promotion: promotion.data } : {}) };
}

// ── Vigencia ──────────────────────────────────────────────────────────────────
export type PromotionStatus = "scheduled" | "active" | "ended";
/** Día actual (AAAA-MM-DD) en la hora de Chile. */
export function todayInChile(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: REPORT_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function promotionStatus(promotion: Pick<Promotion, "startDate" | "endDate"> | undefined, now = new Date()): PromotionStatus {
  if (!promotion) return "active";
  const today = todayInChile(now);
  if (promotion.startDate && today < promotion.startDate) return "scheduled";
  if (promotion.endDate && today > promotion.endDate) return "ended";
  return "active";
}
/** "30 de septiembre de 2026". */
export function formatPromotionDay(day: string) {
  return new Intl.DateTimeFormat("es-CL", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(day + "T12:00:00Z"));
}
/** Texto público de vigencia según el estado. Nunca menciona licencias ni datos administrativos. */
export function promotionPeriodText(promotion: Pick<Promotion, "startDate" | "endDate">, status: PromotionStatus) {
  if (status === "scheduled") return `Esta promoción comienza el ${formatPromotionDay(promotion.startDate)}.`;
  if (status === "ended") return "Esta promoción terminó.";
  if (promotion.endDate) return `Válida hasta el ${formatPromotionDay(promotion.endDate)}.`;
  return null;
}

/** Contenido público de una promoción (solo texto e imagen validada; nunca datos administrativos). */
export type PromotionView = { title: string; description: string; imageUrl: string | null; status: PromotionStatus; periodText: string | null };
export function promotionView(promotion: Promotion | undefined, status: PromotionStatus): PromotionView | null {
  if (!promotion && status === "active") return null;
  const p = promotion ?? { title: "", description: "", imageUrl: "", startDate: "", endDate: "" };
  return { title: p.title, description: p.description, imageUrl: p.imageUrl && isPublicHttpsUrl(p.imageUrl) ? p.imageUrl : null,
    status, periodText: promotionPeriodText(p, status) };
}
