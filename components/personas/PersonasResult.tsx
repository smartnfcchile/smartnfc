"use client";

// Pantalla final de SmartNFC Personas: resumen de respuestas, vistas previas grandes y, por `renderOffer`,
// el resultado comercial (P3: precio, condiciones y solicitud por WhatsApp).
import type { ReactNode } from "react";
import { PERSONAS_LABELS } from "../../content/flows/personas";
import { exampleIdentity, type PersonasAnswersModel } from "../../lib/personas/answers";
import { CardFaces, ILLUSTRATIVE_NOTE, ProfileFrame, QR_NOTE } from "./PersonasPreview";
import { previewSummaryText } from "../../lib/personas/preview-data";
import styles from "./personas.module.css";

export type PersonasOfferSlot = (model: PersonasAnswersModel) => ReactNode;

export default function PersonasResult({ model, onChangeAnswers, onRestart, renderOffer }: {
  model: PersonasAnswersModel;
  onChangeAnswers: () => void;
  onRestart: () => void;
  renderOffer?: PersonasOfferSlot;
}) {
  const { role } = exampleIdentity(model);
  const rows: [string, string][] = [
    ["Uso", model.usoLabel ?? "—"],
    ...(role && model.uso !== "personal" ? [["Bajo tu nombre", role] as [string, string]] : []),
    ["Mostrará", [...model.mostrar.map(m => PERSONAS_LABELS.mostrar[m]), "Guardar contacto", "Compartir"].join(", ")],
    ...(model.redes.length ? [["Redes", model.redes.map(r => PERSONAS_LABELS.redes[r]).join(", ")] as [string, string]] : []),
    ["Estilo", `${model.estilo ? PERSONAS_LABELS.estilo[model.estilo] : "—"}${model.color ? ` · ${PERSONAS_LABELS.color[model.color]}` : ""}`],
    ["Tarjetas", model.cotizacionVolumen ? "50 o más · cotización" : model.cantidad !== null ? String(model.cantidad) : "—"],
  ];

  return (
    <div className={styles.result}>
      <p className={styles.resultLead}>Así se vería tu SmartNFC. Puedes cambiar cualquier respuesta antes de seguir.</p>
      <dl className={styles.summary}>
        {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>

      {model.notices.length > 0 && (
        <ul className={styles.notices}>{model.notices.map(n => <li key={n.id}>{n.text}</li>)}</ul>
      )}

      <section className={styles.resultPreviews} aria-labelledby="personas-result-previews">
        <h3 id="personas-result-previews" className={styles.h3}>Tu perfil y tu tarjeta <span className={styles.badge}>Ejemplo</span></h3>
        <p className={styles.srOnly}>{previewSummaryText(model)}</p>
        <div className={styles.resultGrid}>
          <figure className={styles.figure}>
            <ProfileFrame model={model} size="large" />
            <figcaption>Perfil digital: se abre al acercar la tarjeta al teléfono.</figcaption>
          </figure>
          <figure className={styles.figure}>
            <CardFaces model={model} />
            <figcaption>{QR_NOTE}</figcaption>
          </figure>
        </div>
        <p className={styles.note}>{ILLUSTRATIVE_NOTE}</p>
      </section>

      {renderOffer?.(model)}

      <div className={styles.resultActions}>
        <button type="button" className="fl-secondary" onClick={onChangeAnswers}>Cambiar respuestas</button>
        <button type="button" className="fl-secondary" onClick={onRestart}>Empezar de nuevo</button>
      </div>
    </div>
  );
}
