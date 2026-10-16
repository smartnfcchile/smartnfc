// Propuesta de SmartNFC Locales (F2): de las respuestas efectivas del flujo a una propuesta visual.
// Módulo puro: sin red, almacenamiento ni montos. Los costos los calcula F3 con lib/commercial/public-offers.ts.
import type { Answers } from "../flow/types";
import { LOCALES_LABELS } from "../../content/flows/locales";
import { LOCAL_PRO_POINTS } from "../commercial/public-offers";
import { ACTION_REGISTRY, SOCIAL_ACTION_TYPES, type PublicActionType } from "../local/public-actions";

export type Rubro = keyof typeof LOCALES_LABELS.rubro;
export type Objetivo = keyof typeof LOCALES_LABELS.objetivos;
export type Ubicacion = keyof typeof LOCALES_LABELS.ubicaciones;
export type SupportSize = "LOCAL_MINI" | "LOCAL_STANDARD" | "LOCAL_XL";

/**
 * Sugerencias aprobadas (editables, nunca impuestas): Mesa → Mini; Mesón → Standard; Entrada o vitrina → XL;
 * Recepción y "otro lugar" → Standard (16-10-2026).
 */
export const SUPPORT_SUGGESTION: Record<Ubicacion, SupportSize | null> = {
  tables: "LOCAL_MINI", counter: "LOCAL_STANDARD", entrance: "LOCAL_XL", waiting: "LOCAL_STANDARD", other: "LOCAL_STANDARD",
};
export const SUPPORT_LABELS: Record<SupportSize, string> = { LOCAL_MINI: "Mini", LOCAL_STANDARD: "Standard", LOCAL_XL: "XL" };

export type ProposalPoint = { location: Ubicacion; label: string; quantity: number; suggestedSupport: SupportSize | null };
export type ProposalAction = { type: PublicActionType; label: string; objective: Objetivo };
export type ProposalNotice = { id: "menu-not-published" | "google-profile" | "points-over-limit" | "multi-location" | "pick-support"; text: string };

export type LocalesProposal = {
  rubro: Rubro | null;
  rubroLabel: string | null;
  /** Descripción breve opcional cuando el rubro es "Otro". */
  otherDescription: string | null;
  objectives: Objetivo[];
  actions: ProposalAction[];
  points: ProposalPoint[];
  totalPoints: number;
  pointLimit: number;
  exceedsPointLimit: boolean;
  locations: keyof typeof LOCALES_LABELS.locales | null;
  /** Varios locales: cotización personalizada. */
  multiLocation: boolean;
  promoFrequency: keyof typeof LOCALES_LABELS.frecuenciaPromo | null;
  notices: ProposalNotice[];
};

const str = (a: Answers, id: string) => (typeof a[id] === "string" ? (a[id] as string) : null);
const list = (a: Answers, id: string) => (Array.isArray(a[id]) ? (a[id] as string[]) : []);
const actionLabel = (type: PublicActionType) => ACTION_REGISTRY[type].defaultLabel;

/** Acciones que abriría el punto, en el orden de los objetivos elegidos (el primero es la acción principal). */
function actionsFor(objectives: Objetivo[], networks: string[]): ProposalAction[] {
  const out: ProposalAction[] = [];
  for (const objective of objectives) {
    const types: PublicActionType[] =
      objective === "reviews" ? ["GOOGLE_REVIEW"]
      : objective === "whatsapp" ? ["WHATSAPP"]
      : objective === "social" ? (SOCIAL_ACTION_TYPES as readonly PublicActionType[]).filter(t => networks.includes(t))
      : objective === "menu" ? ["MENU"]
      : objective === "promo" ? ["PROMOTION"]
      : ["LOCATION", "PHONE"];
    for (const type of types) out.push({ type, label: actionLabel(type), objective });
  }
  return out;
}

/** Construye la propuesta desde las respuestas EFECTIVAS (effectiveAnswers): lo que dejó de aplicar ya no está. */
export function buildProposal(a: Answers): LocalesProposal {
  const rubro = str(a, "rubro") as Rubro | null;
  const objectives = list(a, "objetivos") as Objetivo[];
  const ubicaciones = list(a, "ubicaciones") as Ubicacion[];
  const mesas = typeof a.mesas === "number" ? a.mesas : null;
  const points: ProposalPoint[] = ubicaciones
    .filter(u => u !== "tables" || mesas !== null)
    .map(u => ({ location: u, label: LOCALES_LABELS.ubicaciones[u], quantity: u === "tables" ? mesas! : 1, suggestedSupport: SUPPORT_SUGGESTION[u] }));
  const totalPoints = points.reduce((n, p) => n + p.quantity, 0);
  const locations = str(a, "locales") as LocalesProposal["locations"];
  const multiLocation = locations === "few" || locations === "many";

  const notices: ProposalNotice[] = [];
  if (objectives.includes("menu") && str(a, "cartaPublicada") === "no")
    notices.push({ id: "menu-not-published", text: "Tu carta o catálogo debe estar publicado en internet antes de activar esa acción: SmartNFC lo enlaza, no lo aloja." });
  if (objectives.includes("reviews") && ["no", "unknown"].includes(str(a, "perfilGoogle") ?? ""))
    notices.push({ id: "google-profile", text: "Para pedir reseñas hay que crear o verificar el perfil de tu negocio en Google antes de activar esa acción." });
  if (totalPoints > LOCAL_PRO_POINTS)
    notices.push({ id: "points-over-limit", text: `Local Pro incluye hasta ${LOCAL_PRO_POINTS} puntos activos por local. Con ${totalPoints} puntos, la propuesta se cotiza de forma personalizada.` });
  if (multiLocation)
    notices.push({ id: "multi-location", text: "Con varios locales preparamos una cotización personalizada." });
  if (points.some(p => p.suggestedSupport === null))
    notices.push({ id: "pick-support", text: "Elige el tamaño del soporte para los lugares sin sugerencia." });

  return {
    rubro, rubroLabel: rubro ? LOCALES_LABELS.rubro[rubro] : null,
    otherDescription: rubro === "other" ? str(a, "rubroOtro")?.trim() || null : null,
    objectives, actions: actionsFor(objectives, list(a, "redes")),
    points, totalPoints, pointLimit: LOCAL_PRO_POINTS, exceedsPointLimit: totalPoints > LOCAL_PRO_POINTS,
    locations, multiLocation,
    promoFrequency: objectives.includes("promo") ? (str(a, "frecuenciaPromo") as LocalesProposal["promoFrequency"]) : null,
    notices,
  };
}

/** Tamaño elegido por la persona para cada lugar (parte editable de la propuesta). */
export type SupportSelection = Partial<Record<Ubicacion, SupportSize>>;

export function initialSupportSelection(points: ProposalPoint[]): SupportSelection {
  const selection: SupportSelection = {};
  for (const p of points) if (p.suggestedSupport) selection[p.location] = p.suggestedSupport;
  return selection;
}

/** Cantidades de soportes por tamaño (entrada de F3: supportOrderPrice). `undecided`: puntos sin tamaño elegido. */
export function supportCounts(points: ProposalPoint[], selection: SupportSelection) {
  const counts = { mini: 0, standard: 0, xl: 0, undecided: 0 };
  for (const p of points) {
    const size = selection[p.location];
    if (size === "LOCAL_MINI") counts.mini += p.quantity;
    else if (size === "LOCAL_STANDARD") counts.standard += p.quantity;
    else if (size === "LOCAL_XL") counts.xl += p.quantity;
    else counts.undecided += p.quantity;
  }
  return counts;
}
