"use client";

// F3 · Resultado económico. Soportes físicos (pago único) y licencia mensual en secciones separadas.
// Todos los montos desde F1 (vía lib/locales/quote.ts), con IVA incluido.
import { formatCLP } from "../../lib/commercial/public-offers";
import { buildLocalesQuote } from "../../lib/locales/quote";
import type { LocalesResultInput } from "./contracts";
import styles from "./locales.module.css";

export default function LocalesQuote({ proposal, selection }: LocalesResultInput) {
  const q = buildLocalesQuote(proposal, selection);
  const s = q.supports, l = q.license;
  return (
    <div className={styles.quote}>
      <section aria-labelledby="loc-q-supports" className={styles.quoteCard}>
        <p className={styles.quoteKicker}>Pago único</p>
        <h3 id="loc-q-supports" className={styles.h3}>Soportes físicos</h3>
        {q.referenceLocation && <p className={styles.reference}>Calculado para <b>un local de referencia</b>. Los demás locales se cotizan.</p>}
        {s.lines.length ? (
          <>
            <ul className={styles.lines}>
              {s.lines.map(line => (
                <li key={line.id}><span>{line.quantity} × {line.name}</span><b>{formatCLP(line.totalClp)}</b></li>
              ))}
            </ul>
            <p className={styles.subtotal} aria-live="polite"><span>Subtotal soportes</span><b>{formatCLP(s.totalClp)}</b></p>
            {s.lines.some(line => line.id.startsWith("PACK_")) && <p className={styles.muted}>Los packs Mini son solo soportes: no incluyen meses de licencia.</p>}
            {s.savingsClp > 0 && (
              <p className={styles.savings}>Ahorras {formatCLP(s.savingsClp)} con packs Mini frente a comprar las unidades sueltas ({formatCLP(s.individualClp)}).</p>
            )}
          </>
        ) : <p className={styles.muted}>Elige el tamaño de tus soportes para calcular este valor.</p>}
        <ul className={styles.quoted}>
          {q.quoted.map(item => <li key={item.id}><span>{item.name}</span><span>{item.text}</span></li>)}
        </ul>
      </section>

      <section aria-labelledby="loc-q-license" className={`${styles.quoteCard} ${styles.quoteDark}`}>
        <p className={styles.quoteKicker}>Licencia mensual</p>
        <h3 id="loc-q-license" className={styles.h3}>{l.name}</h3>
        {l.kind === "monthly" && l.monthlyClp !== null ? (
          <p className={styles.quotePrice}>{formatCLP(l.monthlyClp)}<span>/mes</span></p>
        ) : (
          <p className={styles.quotePrice}>Cotización<span> personalizada</span></p>
        )}
        <ul className={styles.licenseNotes}>
          <li>1 local y hasta {l.pointLimit} puntos activos.</li>
          {l.quoteReasons.includes("points") && <li>Tu propuesta tiene {proposal.totalPoints} puntos: sobre {l.pointLimit}, la licencia se cotiza.</li>}
          {l.quoteReasons.includes("multi-location") && <li>Con varios locales, la licencia y la implementación multilocal se cotizan.</li>}
          <li>Sin licencia activa, los soportes no funcionan. El cobro comienza desde la entrega operativa.</li>
        </ul>
        {l.annualInfoClp !== null && (
          <p className={styles.annualInfo}>Valor anual informado: {formatCLP(l.annualInfoClp)}. Es una referencia comercial: esta página no ofrece contratación.</p>
        )}
      </section>
      <p className={styles.taxNote}>Valores en pesos chilenos, {q.taxNote}. Propuesta de referencia: no es una contratación.</p>
    </div>
  );
}
