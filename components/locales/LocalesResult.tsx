"use client";

// Resultado de F2: propuesta visual (puntos, acciones y soportes sugeridos y editables) y condiciones.
// Sin montos: el resultado económico y la solicitud final llegan en F3 por `renderQuote` y `renderRequest`.
import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { getPublicOffer } from "../../lib/commercial/public-offers";
import { LOCALES_LABELS } from "../../content/flows/locales";
import {
  SUPPORT_LABELS, initialSupportSelection, supportCounts,
  type LocalesProposal, type SupportSelection, type SupportSize, type Ubicacion,
} from "../../lib/locales/proposal";
import type { LocalesQuoteSlot, LocalesRequestSlot } from "./contracts";
import { PhoneFrame } from "./LocalesPreview";
import styles from "./locales.module.css";

const PROMO_FREQUENCY_TEXT = { weekly: "cada semana", monthly: "cada mes", season: "por temporada" } as const;
const SIZES: SupportSize[] = ["LOCAL_MINI", "LOCAL_STANDARD", "LOCAL_XL"];
const sizeText = (s: SupportSize) => `${SUPPORT_LABELS[s]} · ${getPublicOffer(s).physical?.size}`;

type Props = {
  proposal: LocalesProposal;
  onChangeAnswers: () => void;
  onRestart: () => void;
  pricesHref: string;
  renderQuote?: LocalesQuoteSlot;
  renderRequest?: LocalesRequestSlot;
};

function SupportPicker({ location, label, quantity, suggested, value, onChange }: {
  location: Ubicacion; label: string; quantity: number; suggested: SupportSize | null; value: SupportSize | undefined; onChange: (s: SupportSize) => void;
}) {
  const id = useId();
  return (
    <li className={styles.pointRow}>
      <div className={styles.pointName}>
        <b>{label}</b>
        <span>{quantity} {quantity === 1 ? "punto" : "puntos"}{suggested ? ` · sugerido: ${SUPPORT_LABELS[suggested]}` : " · sin sugerencia"}</span>
      </div>
      <label className={styles.srOnly} htmlFor={id}>Tamaño del soporte para {label}</label>
      <select id={id} className={styles.select} value={value ?? ""} data-location={location}
        onChange={e => onChange(e.target.value as SupportSize)}>
        {!value && <option value="" disabled>Elegir tamaño</option>}
        {SIZES.map(s => <option key={s} value={s}>{sizeText(s)}</option>)}
      </select>
    </li>
  );
}

export default function LocalesResult({ proposal, onChangeAnswers, onRestart, pricesHref, renderQuote, renderRequest }: Props) {
  const [selection, setSelection] = useState<SupportSelection>(() => initialSupportSelection(proposal.points));
  const supports = useMemo(() => supportCounts(proposal.points, selection), [proposal.points, selection]);
  const localPro = getPublicOffer("LOCAL_PRO");
  const input = { proposal, selection, supports };
  const pickNotice = proposal.notices.find(n => n.id === "pick-support");
  const otherNotices = proposal.notices.filter(n => n.id !== "pick-support");

  return (
    <div className={styles.result}>
      <p className={styles.resultLead}>
        Propuesta para {proposal.rubroLabel ? proposal.rubroLabel.toLowerCase() : "tu negocio"}
        {proposal.otherDescription ? ` (${proposal.otherDescription})` : ""}
        {proposal.locations ? ` · ${LOCALES_LABELS.locales[proposal.locations]}` : ""}.
        Es una propuesta de referencia: nada se guardó ni se envió.
      </p>

      <div className={styles.resultGrid}>
        <div className={styles.resultPhone}>
          <PhoneFrame proposal={proposal} />
          <p className={styles.caption}>Ejemplo de la página que abre cada punto. Tu marca, colores y enlaces reales se configuran después.</p>
        </div>

        <div className={styles.resultBody}>
          <section aria-labelledby="loc-points">
            <h3 id="loc-points" className={styles.h3}>Tus puntos NFC y QR</h3>
            <p className={styles.muted}>Los tamaños son sugerencias: puedes cambiarlos.</p>
            <ul className={styles.points}>
              {proposal.points.map(p => (
                <SupportPicker key={p.location} location={p.location} label={p.label} quantity={p.quantity}
                  suggested={p.suggestedSupport} value={selection[p.location]}
                  onChange={s => setSelection(prev => ({ ...prev, [p.location]: s }))} />
              ))}
            </ul>
            <p className={styles.total} aria-live="polite">
              Total: <b>{proposal.totalPoints} {proposal.totalPoints === 1 ? "punto" : "puntos"}</b>
              {supports.mini ? ` · ${supports.mini} Mini` : ""}{supports.standard ? ` · ${supports.standard} Standard` : ""}{supports.xl ? ` · ${supports.xl} XL` : ""}
              {supports.undecided ? ` · ${supports.undecided} por definir` : ""}
            </p>
            {pickNotice && supports.undecided > 0 && <p className={styles.hint}>{pickNotice.text}</p>}
          </section>

          <section aria-labelledby="loc-actions">
            <h3 id="loc-actions" className={styles.h3}>Qué abrirá cada punto</h3>
            <ol className={styles.actions}>
              {proposal.actions.map((a, i) => <li key={`${a.type}-${i}`}>{a.label}{i === 0 ? <span className={styles.tag}>Principal</span> : null}</li>)}
            </ol>
            {proposal.promoFrequency && (
              <p className={styles.muted}>Cambias tus promociones {PROMO_FREQUENCY_TEXT[proposal.promoFrequency]}: cada una puede tener fecha de inicio y de término.</p>
            )}
          </section>

          {otherNotices.length > 0 && (
            <section aria-labelledby="loc-notes" className={styles.notes}>
              <h3 id="loc-notes" className={styles.h3}>Antes de activar</h3>
              <ul>{otherNotices.map(n => <li key={n.id}>{n.text}</li>)}</ul>
            </section>
          )}

          <section aria-labelledby="loc-conditions" className={styles.conditions}>
            <h3 id="loc-conditions" className={styles.h3}>Cómo se compone</h3>
            <ul>
              <li><b>Licencia {localPro.name}:</b> {localPro.limits?.locations} local y hasta {localPro.limits?.pointsPerLocation} puntos activos. Sin ella, los soportes no funcionan.</li>
              <li><b>Soportes:</b> se compran aparte, en pago único. Los packs Mini son solo soportes y no incluyen meses de licencia.</li>
              <li><b>Se cotizan:</b> la instalación, el despacho según destino, más de {localPro.limits?.pointsPerLocation} puntos y varios locales.</li>
            </ul>
          </section>

          {renderQuote ? renderQuote(input) : (
            <p className={styles.muted}>Revisa los <Link href={pricesHref} className={styles.link}>precios y condiciones vigentes</Link> de licencia y soportes.</p>
          )}
          {renderRequest?.(input)}

          <div className={styles.resultActions}>
            <button type="button" className="fl-secondary" onClick={onChangeAnswers}>Cambiar respuestas</button>
            <button type="button" className="fl-secondary" onClick={onRestart}>Empezar de nuevo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
