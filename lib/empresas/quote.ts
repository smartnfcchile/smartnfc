// Resultado comercial de SmartNFC Empresas (E1). Módulo puro: sin red, almacenamiento ni montos escritos a mano.
// - Plan: exclusivamente teamPlanFor (Equipo 5/10/25; sobre 25, «Empresa 26+» por cotización).
// - Tarjetas: exclusivamente cardOrderPrice (tramos D1; desde 50, cotización).
// - Valores netos: empresasNetReference / netFromGrossClp (decisión 4), siempre junto al total con IVA incluido.
// - Altas de Equipo suspendidas (D16): solicitud, no contratación. Cambios de plan al término del período (D13).
import {
  CARD_VOLUME_TIERS, NET_REFERENCE_LABEL, TAX_NOTE, cardOrderPrice, empresasNetReference, getPublicOffer, netFromGrossClp, priceOf, teamPlanFor,
} from "../commercial/public-offers";
import type { EmpresasAnswersModel } from "./answers";

export type TeamPlanId = "EMPRESAS_TEAM_5" | "EMPRESAS_TEAM_10" | "EMPRESAS_TEAM_25";

export type EmpresasPlanQuote =
  | { kind: "plan"; id: TeamPlanId; name: string; identities: number; monthlyClp: number; monthlyNetClp: number }
  | { kind: "quote"; id: "EMPRESAS_TEAM_26_PLUS"; name: string }
  | { kind: "pending" };

export type EmpresasCardQuote =
  | { kind: "priced"; quantity: number; unitClp: number; totalClp: number; totalNetClp: number; tier: { min: number; max: number } }
  | { kind: "none" }
  | { kind: "quote" }
  | { kind: "pending" };

export type EmpresasQuote = { plan: EmpresasPlanQuote; cards: EmpresasCardQuote };

export type EmpresasPlanRow = { id: TeamPlanId | "EMPRESAS_TEAM_26_PLUS"; name: string; identities: number | null; monthlyClp: number | null; monthlyNetClp: number | null };

export type EmpresasConditions = {
  taxNote: typeof TAX_NOTE;
  netLabel: typeof NET_REFERENCE_LABEL;
  plans: EmpresasPlanRow[];
  tiers: { min: number; max: number | null; unitClp: number | null }[];
  replacementClp: number;
  additionalClp: number;
  shippingNote: string;
  /** Condiciones de los planes Equipo tal como las declara el motor. */
  planConditions: readonly string[];
  /** Altas de planes Equipo suspendidas (D16) según el motor. */
  teamSignupSuspended: boolean;
};

const TEAM_IDS = ["EMPRESAS_TEAM_5", "EMPRESAS_TEAM_10", "EMPRESAS_TEAM_25"] as const;

export function empresasConditions(): EmpresasConditions {
  const plans: EmpresasPlanRow[] = TEAM_IDS.map(id => {
    const offer = getPublicOffer(id);
    const net = empresasNetReference(id, "monthly");
    return { id, name: offer.name, identities: offer.limits?.identities ?? null, monthlyClp: priceOf(id, "monthly"), monthlyNetClp: net?.netClp ?? null };
  });
  const contract = getPublicOffer("EMPRESAS_TEAM_26_PLUS");
  plans.push({ id: "EMPRESAS_TEAM_26_PLUS", name: contract.name, identities: null, monthlyClp: null, monthlyNetClp: null });
  const replacement = priceOf("CARD_REPLACEMENT", "one_time");
  const additional = priceOf("CARD_ADDITIONAL", "one_time");
  if (replacement === null || additional === null) throw new Error("Catálogo sin precio de reposición o tarjeta adicional.");
  const shipping = getPublicOffer("SHIPPING").conditions[0];
  return {
    taxNote: TAX_NOTE,
    netLabel: NET_REFERENCE_LABEL,
    plans,
    tiers: CARD_VOLUME_TIERS.map(t => { const o = cardOrderPrice(t.min); return { min: t.min, max: t.max, unitClp: o.kind === "priced" ? o.unitClp : null }; }),
    replacementClp: replacement,
    additionalClp: additional,
    shippingNote: `Despacho de tarjetas: ${shipping.charAt(0).toLowerCase()}${shipping.slice(1).replace(/\.$/, "")}; se confirma en la propuesta.`,
    planConditions: getPublicOffer("EMPRESAS_TEAM_5").conditions,
    teamSignupSuspended: TEAM_IDS.every(id => getPublicOffer(id).availability === "suspended"),
  };
}

export function buildEmpresasQuote(model: EmpresasAnswersModel): EmpresasQuote {
  let plan: EmpresasPlanQuote = { kind: "pending" };
  if (model.cotizacionPersonas) plan = { kind: "quote", id: "EMPRESAS_TEAM_26_PLUS", name: getPublicOffer("EMPRESAS_TEAM_26_PLUS").name };
  else if (model.personas !== null) {
    const p = teamPlanFor(model.personas);
    if (p.kind === "plan") {
      const net = empresasNetReference(p.id, "monthly");
      plan = { kind: "plan", id: p.id, name: getPublicOffer(p.id).name, identities: p.identities, monthlyClp: p.monthlyClp, monthlyNetClp: net!.netClp };
    } else plan = { kind: "quote", id: p.id, name: getPublicOffer(p.id).name };
  }

  let cards: EmpresasCardQuote = { kind: "pending" };
  if (model.cotizacionPersonas) cards = { kind: "quote" };
  else if (model.tarjetas === 0) cards = { kind: "none" };
  else if (model.tarjetas !== null) {
    const o = cardOrderPrice(model.tarjetas);
    cards = o.kind === "priced"
      ? { kind: "priced", quantity: o.quantity, unitClp: o.unitClp, totalClp: o.totalClp, totalNetClp: netFromGrossClp(o.totalClp), tier: o.tier }
      : { kind: "quote" };
  }
  return { plan, cards };
}
