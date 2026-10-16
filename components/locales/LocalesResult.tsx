"use client";

// Resultado de SmartNFC Locales (F2 + F3): resumen, mapa del local, soportes editables, vista previa por lugar,
// resultado económico (licencia y soportes por separado) y solicitud por WhatsApp. Todo reacciona en el momento.
import { useMemo, useState } from "react";
import { LOCALES_LABELS } from "../../content/flows/locales";
import { initialSupportSelection, supportCounts, type LocalesProposal, type SupportSelection, type Ubicacion } from "../../lib/locales/proposal";
import { suggestedPrimaryIndex } from "../../lib/locales/primary-action";
import type { LocalesQuoteSlot, LocalesRequestSlot } from "./contracts";
import LocalVisualMap from "./LocalVisualMap";
import { PhoneFrame } from "./LocalesPreview";
import SupportPicker from "./SupportPicker";
import styles from "./locales.module.css";

const PROMO_FREQUENCY_TEXT = { weekly: "cada semana", monthly: "cada mes", season: "por temporada" } as const;

type Props = {
  proposal: LocalesProposal;
  onChangeAnswers: () => void;
  onRestart: () => void;
  renderQuote: LocalesQuoteSlot;
  renderRequest: LocalesRequestSlot;
};

export default function LocalesResult({ proposal, onChangeAnswers, onRestart, renderQuote, renderRequest }: Props) {
  const [selection, setSelection] = useState<SupportSelection>(() => initialSupportSelection(proposal.points));
  const [active, setActive] = useState<Ubicacion | null>(proposal.points[0]?.location ?? null);
  const supports = useMemo(() => supportCounts(proposal.points, selection), [proposal.points, selection]);
  const input = { proposal, selection, supports };
  const activePoint = proposal.points.find(p => p.location === active) ?? null;
  const primaryIndex = activePoint ? suggestedPrimaryIndex(activePoint.location, proposal.actions) : -1;
  const primary = primaryIndex >= 0 ? proposal.actions[primaryIndex] : null;

  return (
    <div className={styles.result}>
      <div className={styles.summary}>
        <p className={styles.resultLead}>
          Propuesta para {proposal.rubroLabel ? proposal.rubroLabel.toLowerCase() : "tu negocio"}
          {proposal.otherDescription ? ` (${proposal.otherDescription})` : ""}
          {proposal.locations ? ` · ${LOCALES_LABELS.locales[proposal.locations]}` : ""}.
        </p>
        <ul className={styles.objectives} aria-label="Objetivos elegidos">
          {proposal.objectives.map(o => <li key={o}>{LOCALES_LABELS.objetivos[o]}</li>)}
        </ul>
      </div>

      <div className={styles.resultGrid}>
        <div className={styles.resultVisual}>
          <LocalVisualMap proposal={proposal} selection={selection} active={active} onSelect={setActive} />
          <div className={styles.resultPhone}>
            <PhoneFrame proposal={proposal} primaryIndex={primaryIndex} />
            <p className={styles.caption} aria-live="polite">
              {activePoint && primary
                ? <>En <b>{activePoint.label.toLowerCase()}</b> destacamos <b>{primary.label}</b>. Todos los puntos abren la misma página; es una sugerencia.</>
                : "Ejemplo de la página que abre cada punto."}
            </p>
          </div>
        </div>

        <div className={styles.resultBody}>
          <section aria-labelledby="loc-points">
            <h3 id="loc-points" className={styles.h3}>Tamaño de cada soporte</h3>
            <p className={styles.muted}>Son sugerencias: puedes cambiar cualquiera.</p>
            <div className={styles.points}>
              {proposal.points.map(p => (
                <SupportPicker key={p.location} point={p} value={selection[p.location]}
                  onChange={size => { setSelection(prev => ({ ...prev, [p.location]: size })); setActive(p.location); }} />
              ))}
            </div>
          </section>

          <section aria-labelledby="loc-actions">
            <h3 id="loc-actions" className={styles.h3}>Qué abrirá cada punto</h3>
            <ol className={styles.actions}>
              {proposal.actions.map((a, i) => <li key={`${a.type}-${i}`}>{a.label}{i === primaryIndex ? <span className={styles.tag}>Destacada</span> : null}</li>)}
            </ol>
            {proposal.promoFrequency && (
              <p className={styles.muted}>Cambias tus promociones {PROMO_FREQUENCY_TEXT[proposal.promoFrequency]}: cada una puede tener fecha de inicio y de término.</p>
            )}
          </section>

          {renderQuote(input)}

          {proposal.notices.length > 0 && (
            <section aria-labelledby="loc-notes" className={styles.notes}>
              <h3 id="loc-notes" className={styles.h3}>Antes de activar</h3>
              <ul>{proposal.notices.map(n => <li key={n.id}>{n.text}</li>)}</ul>
            </section>
          )}

          {renderRequest(input)}

          <div className={styles.resultActions}>
            <button type="button" className="fl-secondary" onClick={onChangeAnswers}>Cambiar respuestas</button>
            <button type="button" className="fl-secondary" onClick={onRestart}>Empezar de nuevo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
