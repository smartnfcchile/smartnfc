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
import { BASE, DIGITAL_CATALOG, PHYSICAL_CATALOG, type Capability } from "../entitlements/catalog";

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

// ================= Complementos F1 (decisiones 3 a 6, 16-10-2026) =================

// ---------- Decisión 3: soportes Mini con packs ----------
export type SupportLine = { id: "PACK_5_MINI" | "PACK_3_MINI" | "LOCAL_MINI" | "LOCAL_STANDARD" | "LOCAL_XL"; quantity: number; unitClp: number; totalClp: number };
export type SupportOrder = { lines: SupportLine[]; totalClp: number; units: { mini: number; standard: number; xl: number } };

const MINI_OPTIONS = [
  { id: "PACK_5_MINI", units: 5, clp: PACK_5_MINI_CLP },
  { id: "PACK_3_MINI", units: 3, clp: PACK_3_MINI_CLP },
  { id: "LOCAL_MINI", units: 1, clp: PHYSICAL_CATALOG.LOCAL_MINI.priceClp },
] as const;

const count = (n: number, label: string) => {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`Cantidad de ${label} inválida: debe ser un entero mayor o igual a 0.`);
  return n;
};

/**
 * Combinación de menor costo para la cantidad EXACTA de soportes Mini (sin unidades extra ni packs fraccionados),
 * usando Pack 5, Pack 3 y unidades individuales. Standard y XL no tienen packs.
 * Son productos físicos: no incluyen meses de licencia ni equivalen a las licencias LOCAL_PACK_3/5.
 */
export function supportOrderPrice(quantities: { mini?: number; standard?: number; xl?: number }): SupportOrder {
  const mini = count(quantities.mini ?? 0, "soportes Mini");
  const standard = count(quantities.standard ?? 0, "soportes Standard");
  const xl = count(quantities.xl ?? 0, "soportes XL");
  // best[n] = { costo mínimo, combinación } para n unidades Mini exactas.
  const best: { clp: number; pick: number[] }[] = [{ clp: 0, pick: [0, 0, 0] }];
  for (let n = 1; n <= mini; n++) {
    let choice: { clp: number; pick: number[] } | null = null;
    MINI_OPTIONS.forEach((o, i) => {
      if (o.units > n) return;
      const prev = best[n - o.units];
      const clp = prev.clp + o.clp;
      // Empate: se prefiere la combinación con menos ítems (más packs).
      const items = prev.pick.reduce((a, b) => a + b, 0) + 1;
      if (!choice || clp < choice.clp || (clp === choice.clp && items < choice.pick.reduce((a, b) => a + b, 0))) {
        const pick = [...prev.pick]; pick[i]++;
        choice = { clp, pick };
      }
    });
    best.push(choice!);
  }
  const lines: SupportLine[] = [];
  best[mini].pick.forEach((q, i) => { if (q) lines.push({ id: MINI_OPTIONS[i].id, quantity: q, unitClp: MINI_OPTIONS[i].clp, totalClp: q * MINI_OPTIONS[i].clp }); });
  if (standard) lines.push({ id: "LOCAL_STANDARD", quantity: standard, unitClp: P.LOCAL_STANDARD.priceClp, totalClp: standard * P.LOCAL_STANDARD.priceClp });
  if (xl) lines.push({ id: "LOCAL_XL", quantity: xl, unitClp: P.LOCAL_XL.priceClp, totalClp: xl * P.LOCAL_XL.priceClp });
  return { lines, totalClp: lines.reduce((a, l) => a + l.totalClp, 0), units: { mini, standard, xl } };
}

// ---------- Decisión 4: valor neto referencial (solo Empresas) ----------
export const IVA_RATE = 0.19;
export const NET_REFERENCE_LABEL = "Valor neto referencial (+ IVA)" as const;
/** Neto desde un total con IVA incluido, redondeado al peso. Complementa (nunca reemplaza) el total con IVA. */
export function netFromGrossClp(grossClp: number): number {
  if (!Number.isInteger(grossClp) || grossClp < 0) throw new RangeError("Monto CLP inválido.");
  return Math.round(grossClp / (1 + IVA_RATE));
}
const EMPRESAS_NET_OFFERS = ["EMPRESAS_TEAM_5", "EMPRESAS_TEAM_10", "EMPRESAS_TEAM_25", "CARD", "CARD_REPLACEMENT", "CARD_ADDITIONAL"] as const;
/** Valor neto referencial para mostrar en Empresas junto al total con IVA. null fuera de Empresas o en cotizaciones. */
export function empresasNetReference(id: PublicOfferId, billing: Billing): { grossClp: number; netClp: number; label: typeof NET_REFERENCE_LABEL } | null {
  if (!(EMPRESAS_NET_OFFERS as readonly string[]).includes(id)) return null;
  const gross = priceOf(id, billing);
  return gross === null ? null : { grossClp: gross, netClp: netFromGrossClp(gross), label: NET_REFERENCE_LABEL };
}

// ---------- Decisión 5: comparación mensual / anual ----------
export type BillingComparison = { monthlyClp: number; annualClp: number; twelveMonthsClp: number; differenceClp: number };
/**
 * Solo compara cuando ambas modalidades existen y la oferta está comercialmente habilitada (`available`).
 * Las restricciones (D6, D16) prevalecen sobre los precios del catálogo: restricted o suspended → null.
 * No implica renovación automática (D5).
 */
export function compareBilling(offer: Pick<PublicOffer, "prices" | "availability">): BillingComparison | null {
  if (offer.availability !== "available") return null;
  const monthly = offer.prices.find(p => p.billing === "monthly")?.amountClp;
  const annual = offer.prices.find(p => p.billing === "annual")?.amountClp;
  if (monthly == null || annual == null) return null;
  return { monthlyClp: monthly, annualClp: annual, twelveMonthsClp: monthly * 12, differenceClp: monthly * 12 - annual };
}
export function billingComparisonFor(id: PublicOfferId): BillingComparison | null {
  return compareBilling(getPublicOffer(id));
}

// ---------- Decisión 6: prestaciones verificadas para Personas ----------
/**
 * Texto público de las capabilities BASE (perfil básico) y de la tarjeta física. Sin permanencia (D2),
 * sin activación inmediata y sin funciones Pro (D6). Cada texto está respaldado por una capability BASE o por la tarjeta.
 */
export const PERSONAS_VERIFIED_FEATURES = [
  { source: "PROFILE", label: "Perfil digital con tus datos profesionales" },
  { source: "PROFILE_EDIT", label: "Puedes editar tu perfil cuando lo necesites" },
  { source: "CONTACT_AND_SOCIAL", label: "Botones de contacto y redes sociales" },
  { source: "CUSTOM_LINKS", label: "Enlaces personalizados" },
  { source: "CONTACT_SHARING", label: "Compartir tu perfil y guardar tu contacto en el teléfono" },
  { source: "CARD", label: "Tarjeta física que abre tu perfil por NFC o código QR" },
] as const satisfies readonly { source: (typeof BASE)[number] | "CARD"; label: string }[];
