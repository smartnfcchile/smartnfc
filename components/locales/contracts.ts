// Contratos del resultado de SmartNFC Locales. Definidos en F2; implementados en F3 por LocalesQuote
// (resultado económico) y LocalesRequest (solicitud), como componentes separados y reemplazables.
import type { ReactNode } from "react";
import type { LocalesProposal, SupportSelection, supportCounts } from "../../lib/locales/proposal";

export type LocalesResultInput = {
  /** Propuesta construida desde las respuestas efectivas (lib/locales/proposal.ts). */
  proposal: LocalesProposal;
  /** Tamaños elegidos por la persona (sugerencias editables). */
  selection: SupportSelection;
  /** Cantidades por tamaño; `undecided` > 0 significa que aún falta elegir tamaños. */
  supports: ReturnType<typeof supportCounts>;
};

/**
 * F3 · Resultado económico. Requisitos:
 * - Todos los montos desde lib/commercial/public-offers.ts (priceOf, supportOrderPrice, formatCLP), IVA incluido.
 * - Licencia (Local Pro, mensual) separada de los soportes (pago único). Sin comparación anual mientras
 *   billingComparisonFor("LOCAL_PRO") devuelva null (D16).
 * - `proposal.exceedsPointLimit` o `proposal.multiLocation` → cotización personalizada, sin total cerrado.
 * - Instalación y despacho siempre como "se cotiza" / "según destino"; nunca un total "final" que los omita en silencio.
 */
export type LocalesQuoteSlot = (input: LocalesResultInput) => ReactNode;

/**
 * F3 · Solicitud comercial. Requisitos:
 * - Botón "Solicitar mi propuesta" (D16: no es una contratación ni un alta).
 * - Consentimiento explícito (borrador sujeto a revisión legal), sin almacenamiento en servidor.
 * - El mensaje solo incluye lo que la persona ve en su propuesta.
 */
export type LocalesRequestSlot = (input: LocalesResultInput) => ReactNode;
