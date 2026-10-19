// Resultado económico de SmartNFC Locales (F3). Módulo puro: TODOS los montos vienen de F1
// (lib/commercial/public-offers.ts), con IVA incluido. Soportes (pago único) y licencia (mensual) van separados.
import {
  TAX_NOTE, billingComparisonFor, getPublicOffer, priceOf, supportOrderPrice, type SupportLine,
} from "../commercial/public-offers";
import { supportCounts, type LocalesProposal, type SupportSelection } from "./proposal";

export type QuoteSupportLine = SupportLine & { name: string };

export type LocalesQuote = {
  taxNote: typeof TAX_NOTE;
  /** Varios locales: los soportes se calculan solo para un local de referencia (se indica expresamente). */
  referenceLocation: boolean;
  supports: {
    lines: QuoteSupportLine[];
    units: { mini: number; standard: number; xl: number };
    totalClp: number;
    /** Lo que costarían las mismas unidades compradas sueltas. */
    individualClp: number;
    /** Ahorro real por packs Mini; solo > 0 se muestra. */
    savingsClp: number;
    /** Puntos sin tamaño elegido (no se cotizan). */
    undecided: number;
  };
  license: {
    name: string;
    /** "monthly": precio publicado; "quote": más de 10 puntos o varios locales. */
    kind: "monthly" | "quote";
    monthlyClp: number | null;
    quoteReasons: ("points" | "multi-location")[];
    pointLimit: number;
    /** Precio anual aprobado: solo informativo, no se ofrece como contratación mientras D16 esté vigente. */
    annualInfoClp: number | null;
    /** Comparación mensual/anual: siempre null mientras F1 no la habilite (D16). */
    comparison: ReturnType<typeof billingComparisonFor>;
  };
  quoted: { id: "INSTALLATION" | "SHIPPING"; name: string; text: string }[];
};

export function buildLocalesQuote(proposal: LocalesProposal, selection: SupportSelection): LocalesQuote {
  const counts = supportCounts(proposal.points, selection);
  const order = supportOrderPrice({ mini: counts.mini, standard: counts.standard, xl: counts.xl });
  const unit = (id: "LOCAL_MINI" | "LOCAL_STANDARD" | "LOCAL_XL") => priceOf(id, "one_time")!;
  const individualClp = counts.mini * unit("LOCAL_MINI") + counts.standard * unit("LOCAL_STANDARD") + counts.xl * unit("LOCAL_XL");
  const quoteReasons: LocalesQuote["license"]["quoteReasons"] = [];
  if (proposal.exceedsPointLimit) quoteReasons.push("points");
  if (proposal.multiLocation) quoteReasons.push("multi-location");
  const localPro = getPublicOffer("LOCAL_PRO");
  return {
    taxNote: TAX_NOTE,
    referenceLocation: proposal.multiLocation,
    supports: {
      lines: order.lines.map(l => ({ ...l, name: getPublicOffer(l.id).name })),
      units: order.units, totalClp: order.totalClp, individualClp,
      savingsClp: Math.max(0, individualClp - order.totalClp),
      undecided: counts.undecided,
    },
    license: {
      name: localPro.name,
      kind: quoteReasons.length ? "quote" : "monthly",
      monthlyClp: quoteReasons.length ? null : priceOf("LOCAL_PRO", "monthly"),
      quoteReasons, pointLimit: proposal.pointLimit,
      annualInfoClp: priceOf("LOCAL_PRO", "annual"),
      comparison: billingComparisonFor("LOCAL_PRO"),
    },
    quoted: [
      { id: "INSTALLATION", name: getPublicOffer("INSTALLATION").name, text: "Se cotiza aparte" },
      { id: "SHIPPING", name: getPublicOffer("SHIPPING").name, text: "Según destino" },
    ],
  };
}
