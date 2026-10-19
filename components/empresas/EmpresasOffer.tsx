"use client";

// Resultado comercial de SmartNFC Empresas: dos componentes independientes y bien separados.
// 1) Suscripción mensual de la plataforma (teamPlanFor; sobre 25, cotización). 2) Tarjetas físicas, pago único
// (cardOrderPrice; desde 50, cotización). Total con IVA incluido y valor neto referencial (+ IVA) para empresas.
import { useId } from "react";
import { formatCLP } from "../../lib/commercial/public-offers";
import type { EmpresasConditions, EmpresasQuote } from "../../lib/empresas/quote";
import { EMPRESAS_NOT_A_PURCHASE } from "../../content/empresas/consent";
import styles from "./empresas.module.css";

const cardsLabel = (n: number) => `${n} ${n === 1 ? "tarjeta" : "tarjetas"}`;

export default function EmpresasOffer({ quote, conditions }: { quote: EmpresasQuote; conditions: EmpresasConditions }) {
  const id = useId();
  const { plan, cards } = quote;
  return (
    <section className={styles.offer} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className={styles.h3}>Tu estimación</h3>
      <div className={styles.offerParts}>
        <div className={`${styles.part} ${styles.partSubscription}`} data-part="suscripcion">
          <p className={styles.partKind}>Suscripción mensual · plataforma</p>
          {plan.kind === "plan" && <>
            <p className={styles.partName}>{plan.name} <span>hasta {plan.identities} personas</span></p>
            <p className={styles.partPrice}>{formatCLP(plan.monthlyClp)}<small>/mes</small></p>
            <p className={styles.partDetail}>{conditions.taxNote} · {conditions.netLabel}: {formatCLP(plan.monthlyNetClp)}</p>
          </>}
          {plan.kind === "quote" && <>
            <p className={styles.partName}>{plan.name}</p>
            <p className={styles.partQuote}>Cotización personalizada</p>
            <p className={styles.partDetail}>Más de 25 personas: preparamos una propuesta para tu equipo.</p>
          </>}
          {plan.kind === "pending" && <p className={styles.partDetail}>Responde cuántas personas tendrán perfil.</p>}
        </div>
        <div className={`${styles.part} ${styles.partCards}`} data-part="tarjetas">
          <p className={styles.partKind}>Pago único · tarjetas físicas</p>
          {cards.kind === "priced" && <>
            <p className={styles.partName}>{cardsLabel(cards.quantity)} <span>{formatCLP(cards.unitClp)} c/u</span></p>
            <p className={styles.partPrice}>{formatCLP(cards.totalClp)}</p>
            <p className={styles.partDetail}>{conditions.taxNote} · {conditions.netLabel}: {formatCLP(cards.totalNetClp)}</p>
          </>}
          {cards.kind === "none" && <><p className={styles.partName}>Sin tarjetas por ahora</p><p className={styles.partDetail}>Los perfiles se comparten por QR o enlace. Puedes sumar tarjetas después.</p></>}
          {cards.kind === "quote" && <><p className={styles.partQuote}>Cotización personalizada</p><p className={styles.partDetail}>Para equipos de más de 25 personas o desde 50 tarjetas, el precio se cotiza.</p></>}
          {cards.kind === "pending" && <p className={styles.partDetail}>Responde cuántas tarjetas necesitan.</p>}
        </div>
      </div>
      <p className={styles.offerNote}>La suscripción y las tarjetas se pagan por separado: el plan no incluye tarjetas físicas.</p>
      <ul className={styles.conditions}>
        {conditions.planConditions.map(c => <li key={c}>{c}</li>)}
        <li>Los cambios de plan rigen al término del período, sin prorrateo.</li>
        <li>Reposición de una tarjeta: {formatCLP(conditions.replacementClp)}. Tarjeta adicional para un perfil existente: {formatCLP(conditions.additionalClp)}. {conditions.taxNote}.</li>
        <li>{conditions.shippingNote}</li>
        <li>{EMPRESAS_NOT_A_PURCHASE}</li>
      </ul>
    </section>
  );
}
