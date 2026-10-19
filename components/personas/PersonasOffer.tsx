"use client";

// P3 · Resultado comercial de SmartNFC Personas: precio por cardOrderPrice (tramos vigentes, IVA incluido),
// cotización sin monto para 50 o más, condiciones del catálogo y prestaciones verificadas (sin Pro ni permanencia).
import { useId } from "react";
import { formatCLP } from "../../lib/commercial/public-offers";
import { PERSONAS_LANDING_FEATURES } from "../../content/personas/features";
import type { PersonasConditions, PersonasQuote } from "../../lib/personas/quote";
import { PERSONAS_NOT_A_PURCHASE } from "../../content/personas/consent";
import styles from "./personas.module.css";

const range = (min: number, max: number | null) => (max === null ? `${min} o más` : min === max ? `${min}` : `${min} a ${max}`);
const cards = (n: number) => `${n} ${n === 1 ? "tarjeta" : "tarjetas"}`;

export default function PersonasOffer({ quote, conditions }: { quote: PersonasQuote; conditions: PersonasConditions }) {
  const id = useId();
  const currentMin = quote.kind === "priced" ? quote.tier.min : quote.kind === "volume-quote" ? conditions.tiers.find(t => t.unitClp === null)?.min : undefined;
  return (
    <section className={styles.offer} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className={styles.h3}>Tu precio</h3>

      {quote.kind === "priced" && (
        <div className={styles.priceBox}>
          <p className={styles.priceTotal}>{formatCLP(quote.totalClp)}</p>
          <p className={styles.priceDetail}>{cards(quote.quantity)} × {formatCLP(quote.unitClp)} · {conditions.taxNote} · pago único</p>
          {quote.nextTier && <p className={styles.priceHint}>Desde {cards(quote.nextTier.min)}, cada una queda en {formatCLP(quote.nextTier.unitClp)}.</p>}
        </div>
      )}
      {quote.kind === "volume-quote" && (
        <div className={styles.priceBox}>
          <p className={styles.priceQuote}>Solicitar cotización</p>
          <p className={styles.priceDetail}>Para 50 o más tarjetas preparamos una cotización. No hay un precio automático.</p>
        </div>
      )}

      <table className={styles.tiers}>
        <caption>Precio por tarjeta según la cantidad ({conditions.taxNote}). El precio del tramo se aplica a todas las tarjetas del pedido.</caption>
        <thead><tr><th scope="col">Cantidad</th><th scope="col">Por tarjeta</th></tr></thead>
        <tbody>
          {conditions.tiers.map(t => (
            <tr key={t.min} className={t.min === currentMin ? styles.tierCurrent : undefined} aria-current={t.min === currentMin ? "true" : undefined}>
              <td>{range(t.min, t.max)}</td>
              <td>{t.unitClp === null ? "Cotización" : formatCLP(t.unitClp)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className={styles.conditions}>
        <li>{conditions.shippingNote}</li>
        <li>Reposición de una tarjeta: {formatCLP(conditions.replacementClp)}. Tarjeta adicional para tu mismo perfil: {formatCLP(conditions.additionalClp)}.</li>
        <li>{PERSONAS_NOT_A_PURCHASE}</li>
      </ul>

      <h4 className={styles.h4}>Qué incluye</h4>
      <ul className={styles.included}>
        {PERSONAS_LANDING_FEATURES.map(f => <li key={f.source}>{f.label}</li>)}
      </ul>
    </section>
  );
}
