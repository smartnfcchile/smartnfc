// Fuente única de precios y condiciones comerciales PÚBLICAS (F1).
//
// Reglas:
// - Los montos que ya existen en `lib/entitlements/catalog.ts` se LEEN de allí (no se repiten).
// - Los montos aprobados que el catálogo no tiene (tramos D1, reposición, tarjeta adicional, packs Mini)
//   se declaran aquí como constantes comerciales, con su decisión de origen.
// - Todos los montos son finales en CLP, IVA incluido.
// - Módulo puro: sin base de datos, sin servidor y sin efecto sobre licencias ni entitlements.
//   La autorización sigue resolviéndose solo con capabilities y límites.
// - `availability` y `restrictions` describen qué se puede promover hoy (D2, D5, D6, D9, D10, D15, D16).
//   Este módulo no activa nada: las landing deben respetar estos indicadores.
import { DIGITAL_CATALOG, PHYSICAL_CATALOG, type Capability } from "../entitlements/catalog";

export const TAX_NOTE = "IVA incluido" as const;

export type Billing = "one_time" | "monthly" | "annual" | "quote";
/** available: se puede ofrecer · restricted: se ofrece con límites · suspended: no hay altas nuevas · quote: solo cotización. */
export type Availability = "available" | "restricted" | "suspended" | "quote";
export type DecisionRef = "D1" | "D2" | "D5" | "D6" | "D9" | "D10" | "D13" | "D15" | "D16" | "PAUTA";

export type Restriction = { decision: DecisionRef; note: string };

export type PriceLine = {
  billing: Billing;
  /** null cuando el precio se cotiza. */
  amountClp: number | null;
  /** Unidad del monto: "tarjeta", "soporte", "pack", "mes", "año", etc. */
  unit: string;
  taxNote: typeof TAX_NOTE;
  /** De dónde sale el monto: código del catálogo o decisión aprobada. */
  source: string;
};

export type PublicOffer = {
  id: string;
  name: string;
  kind: "physical" | "digital" | "service";
  prices: readonly PriceLine[];
  availability: Availability;
  restrictions: readonly Restriction[];
  conditions: readonly string[];
  /** Código del catálogo de licencias que la oferta requiere para funcionar (soportes y packs). */
  requiresLicense?: keyof typeof DIGITAL_CATALOG;
  limits?: { identities?: number; locations?: number; pointsPerLocation?: number };
  /** Contenido físico (soportes y packs). */
  physical?: { size?: string; material?: string; includes?: readonly string[]; units?: number; supportId?: string };
  /** Capabilities que el plan otorga pero que hoy NO se deben promover (D6, D9, D10). */
  notPromoted?: readonly Capability[];
};

const price = (billing: Billing, amountClp: number | null, unit: string, source: string): PriceLine =>
  ({ billing, amountClp, unit, taxNote: TAX_NOTE, source });

// ---------- Restricciones vigentes (texto interno, no copia pública) ----------
const R = {
  D2: { decision: "D2", note: "No anunciar el perfil digital permanente hasta validar B4." },
  D5: { decision: "D5", note: "Pago anual gestionado manualmente; sin promesas de renovación automática." },
  D6: { decision: "D6", note: "No promover captura de prospectos ni CRM hasta revisión legal y controles de privacidad." },
  D9: { decision: "D9", note: "Club Local no se promueve ni se habilita para clientes nuevos." },
  D10: { decision: "D10", note: "Equipo se vende limitado: perfiles y administración de equipo, sin CRM." },
  D13: { decision: "D13", note: "Los cambios de plan rigen al término del período; sin prorrateo." },
  D15: { decision: "D15", note: "Venta manual de tarjetas solo a clientes con Pro o Equipo activo." },
  D16: { decision: "D16", note: "Altas comerciales nuevas suspendidas hasta validar B1 y B1-R." },
} as const satisfies Record<string, Restriction>;

// ---------- Constantes aprobadas que el catálogo no contiene ----------
/** D1: el precio del tramo se aplica a TODAS las unidades del pedido. El primer tramo sale del catálogo. */
export const CARD_VOLUME_TIERS = [
  { min: 1, max: 4, unitClp: PHYSICAL_CATALOG.CARD.priceClp },
  { min: 5, max: 19, unitClp: 24990 },
  { min: 20, max: 49, unitClp: 21990 },
  { min: 50, max: null, unitClp: null }, // cotización
] as const;
export const CARD_REPLACEMENT_CLP = 14990; // D1
export const CARD_ADDITIONAL_CLP = 14990; // D1 / pauta
export const PACK_3_MINI_CLP = 49990; // pauta
export const PACK_5_MINI_CLP = 74990; // pauta
/** Máximo de puntos activos por local en Local Pro (del catálogo); sobre esto, cotización. */
export const LOCAL_PRO_POINTS = DIGITAL_CATALOG.LOCAL_PRO.points;

const SUPPORT_INCLUDES = ["Personalización gráfica estándar", "NFC", "QR", "Configuración inicial"] as const;
const SUPPORT_CONDITIONS = [
  "Pago único.",
  "Requiere una licencia Local Pro activa para funcionar.",
  "Instalación: se cotiza aparte.",
  "Despacho: se cobra según destino.",
] as const;

const C = DIGITAL_CATALOG;
const P = PHYSICAL_CATALOG;

export const PUBLIC_OFFERS = [
  // ===== Tarjetas =====
  {
    id: "CARD", name: "Tarjeta NFC", kind: "physical",
    prices: [price("one_time", P.CARD.priceClp, "tarjeta", "catalog:PHYSICAL_CATALOG.CARD")],
    availability: "restricted", restrictions: [R.D15, R.D2],
    conditions: [
      "Pago único por tarjeta.",
      "Por volumen, el precio del tramo se aplica a todas las unidades (ver CARD_VOLUME_TIERS).",
      "Desde 50 tarjetas: cotización.",
    ],
  },
  {
    id: "CARD_REPLACEMENT", name: "Reposición de tarjeta", kind: "physical",
    prices: [price("one_time", CARD_REPLACEMENT_CLP, "tarjeta", "decision:D1")],
    availability: "available", restrictions: [],
    conditions: ["Pago único por tarjeta."],
  },
  {
    id: "CARD_ADDITIONAL", name: "Tarjeta adicional", kind: "physical",
    prices: [price("one_time", CARD_ADDITIONAL_CLP, "tarjeta", "decision:D1")],
    availability: "available", restrictions: [],
    conditions: ["Pago único por tarjeta.", "Se vincula a un perfil existente.", "No crea una identidad digital nueva."],
  },

  // ===== Soportes Local =====
  ...([
    ["LOCAL_MINI", "Soporte Mini", "10 × 15 cm"],
    ["LOCAL_STANDARD", "Soporte Standard", "15 × 20 cm"],
    ["LOCAL_XL", "Soporte XL", "20 × 30 cm"],
  ] as const).map(([id, name, size]) => ({
    id, name, kind: "physical" as const,
    prices: [price("one_time", P[id].priceClp, "soporte", `catalog:PHYSICAL_CATALOG.${id}`)],
    availability: "available" as const, restrictions: [] as Restriction[],
    conditions: SUPPORT_CONDITIONS,
    requiresLicense: "LOCAL_PRO" as const,
    physical: { size, material: "Acrílico personalizado", includes: SUPPORT_INCLUDES },
  })),
  {
    id: "PACK_3_MINI", name: "Pack 3 Mini", kind: "physical",
    prices: [price("one_time", PACK_3_MINI_CLP, "pack", "pauta")],
    availability: "available", restrictions: [],
    conditions: [...SUPPORT_CONDITIONS, "Solo soportes físicos: no incluye meses de licencia."],
    requiresLicense: "LOCAL_PRO",
    physical: { size: "10 × 15 cm", material: "Acrílico personalizado", includes: SUPPORT_INCLUDES, units: 3, supportId: "LOCAL_MINI" },
  },
  {
    id: "PACK_5_MINI", name: "Pack 5 Mini", kind: "physical",
    prices: [price("one_time", PACK_5_MINI_CLP, "pack", "pauta")],
    availability: "available", restrictions: [],
    conditions: [...SUPPORT_CONDITIONS, "Solo soportes físicos: no incluye meses de licencia."],
    requiresLicense: "LOCAL_PRO",
    physical: { size: "10 × 15 cm", material: "Acrílico personalizado", includes: SUPPORT_INCLUDES, units: 5, supportId: "LOCAL_MINI" },
  },

  // ===== Planes digitales =====
  {
    id: "EMPRESAS_PRO", name: C.EMPRESAS_PRO.name, kind: "digital",
    prices: [
      price("monthly", C.EMPRESAS_PRO.monthlyClp, "mes", "catalog:EMPRESAS_PRO.monthlyClp"),
      price("annual", C.EMPRESAS_PRO.annualClp, "año", "catalog:EMPRESAS_PRO.annualClp"),
    ],
    availability: "restricted", restrictions: [R.D6, R.D5, R.D13],
    conditions: ["Suscripción mensual o anual.", "Pago anual gestionado manualmente."],
    notPromoted: ["LEAD_CAPTURE", "CRM"],
  },
  ...(["EMPRESAS_TEAM_5", "EMPRESAS_TEAM_10", "EMPRESAS_TEAM_25"] as const).map(id => ({
    id, name: C[id].name, kind: "digital" as const,
    prices: [price("monthly", C[id].monthlyClp, "mes", `catalog:${id}.monthlyClp`)],
    availability: "suspended" as const, restrictions: [R.D16, R.D10, R.D13],
    conditions: ["Suscripción mensual.", "Sin plan anual para Empresas.", "Las tarjetas físicas se cobran aparte."],
    limits: { identities: C[id].identities },
    notPromoted: ["CRM", "LEAD_CAPTURE"] as Capability[],
  })),
  {
    id: "EMPRESAS_TEAM_26_PLUS", name: "Empresa 26+", kind: "digital",
    prices: [price("quote", null, "plan", "pauta (catálogo: EMPRESAS_TEAM_CONTRACT)")],
    availability: "quote", restrictions: [R.D16, R.D10],
    conditions: ["Más de 25 identidades: cotización."],
  },
  {
    id: "LOCAL_PRO", name: C.LOCAL_PRO.name, kind: "digital",
    prices: [
      price("monthly", C.LOCAL_PRO.monthlyClp, "mes", "catalog:LOCAL_PRO.monthlyClp"),
      price("annual", C.LOCAL_PRO.annualClp, "año", "catalog:LOCAL_PRO.annualClp"),
    ],
    availability: "suspended", restrictions: [R.D16, R.D9, R.D5, R.D13],
    conditions: [
      "Suscripción mensual o anual.",
      "Pago anual gestionado manualmente.",
      "El cobro comienza desde la entrega operativa.",
      `Más de ${LOCAL_PRO_POINTS} puntos activos: cotización.`,
      "Varios locales: cotización.",
      "Los soportes físicos se cobran aparte.",
    ],
    limits: { locations: C.LOCAL_PRO.locations, pointsPerLocation: C.LOCAL_PRO.points },
    notPromoted: ["LOCAL_CLUB"],
  },

  // ===== Servicios que siempre se cotizan =====
  {
    id: "INSTALLATION", name: "Instalación", kind: "service",
    prices: [price("quote", null, "servicio", "pauta")],
    availability: "quote", restrictions: [], conditions: ["Se cotiza aparte."],
  },
  {
    id: "SHIPPING", name: "Despacho", kind: "service",
    prices: [price("quote", null, "envío", "pauta")],
    availability: "quote", restrictions: [], conditions: ["Se cobra según destino."],
  },
] as const satisfies readonly PublicOffer[];

export type PublicOfferId = typeof PUBLIC_OFFERS[number]["id"];

export function getPublicOffer(id: PublicOfferId): PublicOffer {
  const offer = (PUBLIC_OFFERS as readonly PublicOffer[]).find(o => o.id === id);
  if (!offer) throw new Error(`Oferta pública inexistente: ${id}`);
  return offer;
}

export function priceOf(id: PublicOfferId, billing: Billing): number | null {
  return getPublicOffer(id).prices.find(p => p.billing === billing)?.amountClp ?? null;
}

// ---------- Cálculos ----------
export type CardOrder =
  | { kind: "priced"; quantity: number; unitClp: number; totalClp: number; tier: { min: number; max: number } }
  | { kind: "quote"; quantity: number };

/** Precio de un pedido de tarjetas NUEVAS según D1 (todas las unidades al precio del tramo). */
export function cardOrderPrice(quantity: number): CardOrder {
  if (!Number.isInteger(quantity) || quantity < 1) throw new RangeError("La cantidad de tarjetas debe ser un entero mayor o igual a 1.");
  const tier = CARD_VOLUME_TIERS.find(t => quantity >= t.min && (t.max === null || quantity <= t.max))!;
  if (tier.unitClp === null || tier.max === null) return { kind: "quote", quantity };
  return { kind: "priced", quantity, unitClp: tier.unitClp, totalClp: tier.unitClp * quantity, tier: { min: tier.min, max: tier.max } };
}

export type TeamPlan = { kind: "plan"; id: "EMPRESAS_TEAM_5" | "EMPRESAS_TEAM_10" | "EMPRESAS_TEAM_25"; identities: number; monthlyClp: number } | { kind: "quote"; id: "EMPRESAS_TEAM_26_PLUS" };

/** Plan Equipo más pequeño que cubre la cantidad de identidades; sobre 25, cotización. */
export function teamPlanFor(identities: number): TeamPlan {
  if (!Number.isInteger(identities) || identities < 1) throw new RangeError("La cantidad de identidades debe ser un entero mayor o igual a 1.");
  for (const id of ["EMPRESAS_TEAM_5", "EMPRESAS_TEAM_10", "EMPRESAS_TEAM_25"] as const) {
    if (identities <= C[id].identities) return { kind: "plan", id, identities: C[id].identities, monthlyClp: C[id].monthlyClp };
  }
  return { kind: "quote", id: "EMPRESAS_TEAM_26_PLUS" };
}

const clp = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });
/** Formato público único: 14990 → "$14.990". */
export function formatCLP(amount: number): string {
  if (!Number.isInteger(amount) || amount < 0) throw new RangeError("Monto CLP inválido.");
  return `$${clp.format(amount)}`;
}
