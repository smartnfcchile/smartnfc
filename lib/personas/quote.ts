// Resultado comercial de SmartNFC Personas (P3). Módulo puro: sin red, almacenamiento ni montos escritos a mano.
// - Tarjetas: exclusivamente cardOrderPrice (tramos D1, el precio del tramo aplica a todas las unidades, IVA incluido).
// - 50 o más tarjetas («solicitar cotización»): sin precio automático.
// - Reposición y tarjeta adicional: catálogo público (priceOf). Despacho: condición del catálogo, sin monto.
// - Solicitud, no compra (D15). Sin Pro ni captura (D6), sin perfil permanente (D2), sin Equipo ni Local (D16).
import { CARD_VOLUME_TIERS, TAX_NOTE, cardOrderPrice, getPublicOffer, priceOf, type CardOrder } from "../commercial/public-offers";
import { CANTIDAD_MAX } from "../../content/flows/personas";
import type { PersonasAnswersModel } from "./answers";

export type PersonasTier = { min: number; max: number | null; unitClp: number | null };

export type PersonasQuote =
  | { kind: "priced"; quantity: number; unitClp: number; totalClp: number; tier: { min: number; max: number }; nextTier: { min: number; unitClp: number } | null }
  | { kind: "volume-quote" }
  | { kind: "pending" };

export type PersonasConditions = {
  taxNote: typeof TAX_NOTE;
  replacementClp: number;
  additionalClp: number;
  /** Texto del catálogo para el despacho (sin monto). */
  shipping: string;
  /** Frase pública del despacho: condición del catálogo + confirmación según destino. */
  shippingNote: string;
  /** Tramos vigentes, calculados con cardOrderPrice en el mínimo de cada tramo. */
  tiers: PersonasTier[];
};

/** Tramos públicos a partir de cardOrderPrice: el valor por tarjeta de cada tramo es el que cobra el motor. */
export function personasTiers(): PersonasTier[] {
  return CARD_VOLUME_TIERS.map(t => {
    const order = cardOrderPrice(t.min);
    return { min: t.min, max: t.max, unitClp: order.kind === "priced" ? order.unitClp : null };
  });
}

export function buildPersonasQuote(model: PersonasAnswersModel): PersonasQuote {
  if (model.cotizacionVolumen) return { kind: "volume-quote" };
  if (model.cantidad === null) return { kind: "pending" };
  const order: CardOrder = cardOrderPrice(model.cantidad);
  // El configurador limita a 1–49; si el motor dijera cotización, se respeta sin inventar un monto.
  if (order.kind !== "priced") return { kind: "volume-quote" };
  const next = personasTiers().find(t => t.min > order.quantity && t.unitClp !== null && t.min <= CANTIDAD_MAX);
  return {
    kind: "priced", quantity: order.quantity, unitClp: order.unitClp, totalClp: order.totalClp, tier: order.tier,
    nextTier: next && next.unitClp !== null ? { min: next.min, unitClp: next.unitClp } : null,
  };
}

export function personasConditions(): PersonasConditions {
  const replacement = priceOf("CARD_REPLACEMENT", "one_time");
  const additional = priceOf("CARD_ADDITIONAL", "one_time");
  if (replacement === null || additional === null) throw new Error("Catálogo sin precio de reposición o tarjeta adicional.");
  const shipping = getPublicOffer("SHIPPING").conditions[0];
  return {
    taxNote: TAX_NOTE,
    replacementClp: replacement,
    additionalClp: additional,
    shipping,
    shippingNote: `Despacho: ${shipping.charAt(0).toLowerCase()}${shipping.slice(1).replace(/\.$/, "")}; se confirma al coordinar tu solicitud.`,
    tiers: personasTiers(),
  };
}
