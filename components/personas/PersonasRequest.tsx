"use client";

// P3 · «Solicitar mi tarjeta» (o «Solicitar cotización» desde 50 tarjetas). Consentimiento explícito sin marcar
// (borrador funcional sujeto a revisión legal), vista previa del mensaje, copia y apertura de WhatsApp por decisión
// de la persona. Sin almacenamiento ni envío a servidores de SmartNFC: no hay fetch, formularios enviados, cookies
// ni almacenamiento local; el mensaje solo existe en esta página hasta que la persona abre WhatsApp.
import { useId, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { PRIVACY_PATH, REQUEST_PERSONAL_FIELDS_ENABLED } from "../../content/legal/privacy";
import { PERSONAS_CONSENT, PERSONAS_NOT_A_PURCHASE } from "../../content/personas/consent";
import type { PersonasAnswersModel } from "../../lib/personas/answers";
import type { PersonasConditions, PersonasQuote } from "../../lib/personas/quote";
import { PERSONAS_FIELD_MAX, buildPersonasRequestMessage, whatsappRequestUrl } from "../../lib/personas/request-message";
import styles from "./personas.module.css";

export default function PersonasRequest({ model, quote, conditions }: { model: PersonasAnswersModel; quote: PersonasQuote; conditions: PersonasConditions }) {
  const id = useId();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [consent, setConsent] = useState(false);
  const [stage, setStage] = useState<"form" | "review">("form");
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState<"" | "ok" | "fail">("");
  const message = useMemo(() => buildPersonasRequestMessage(model, quote, conditions, { name, city }), [model, quote, conditions, name, city]);
  const action = quote.kind === "volume-quote" ? "Solicitar cotización" : "Solicitar mi tarjeta";

  const prepare = (e: FormEvent) => {
    e.preventDefault();
    if (!consent) { setError(true); return; }
    setError(false); setStage("review");
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(message); setCopied("ok"); } catch { setCopied("fail"); }
  };

  return (
    <section aria-labelledby={`${id}-title`} className={styles.request}>
      <h3 id={`${id}-title`} className={styles.h3}>{action}</h3>
      <p className={styles.notPurchase}>{PERSONAS_NOT_A_PURCHASE}</p>

      {stage === "form" ? (
        <form onSubmit={prepare} noValidate className={styles.requestForm}>
          <p className={styles.muted}>Prepara un mensaje con tu configuración para enviarlo a SmartNFC por WhatsApp.</p>
          {REQUEST_PERSONAL_FIELDS_ENABLED && (
            <div className={styles.fields}>
              <label htmlFor={`${id}-name`}>Tu nombre <span>(opcional)</span></label>
              <input id={`${id}-name`} type="text" maxLength={PERSONAS_FIELD_MAX} autoComplete="name" value={name} onChange={e => setName(e.target.value)} />
              <label htmlFor={`${id}-city`}>Ciudad <span>(opcional)</span></label>
              <input id={`${id}-city`} type="text" maxLength={PERSONAS_FIELD_MAX} autoComplete="address-level2" value={city} onChange={e => setCity(e.target.value)} />
            </div>
          )}
          <label className={styles.consent} htmlFor={`${id}-consent`}>
            <input id={`${id}-consent`} type="checkbox" checked={consent} aria-describedby={`${id}-consent-details${error ? ` ${id}-error` : ""}`}
              onChange={e => { setConsent(e.target.checked); if (e.target.checked) setError(false); }} />
            <span>{PERSONAS_CONSENT.label}</span>
          </label>
          <p id={`${id}-consent-details`} className={styles.consentDetails}>{PERSONAS_CONSENT.details} <Link href={PRIVACY_PATH} prefetch={false} target="_blank" rel="noopener">Leer el aviso de privacidad<span className="sr-only"> (se abre en una pestaña nueva)</span></Link>.</p>
          <p id={`${id}-error`} className="fl-error" role="alert">{error ? PERSONAS_CONSENT.required : ""}</p>
          <button type="submit" className="fl-next">{action}</button>
        </form>
      ) : (
        <div className={styles.review}>
          <p className={styles.muted}>Revisa el mensaje. Se abrirá en WhatsApp y podrás editarlo antes de enviarlo.</p>
          <pre className={styles.message} aria-label="Mensaje que se enviará" tabIndex={0}>{message}</pre>
          <div className={styles.reviewActions}>
            <a className="fl-next" href={whatsappRequestUrl(message)} target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>
            <button type="button" className="fl-secondary" onClick={copy}>Copiar mensaje</button>
            <button type="button" className="fl-secondary" onClick={() => { setStage("form"); setCopied(""); }}>Editar datos</button>
          </div>
          <p className={styles.copyStatus} role="status">{copied === "ok" ? "Mensaje copiado." : copied === "fail" ? "No se pudo copiar: selecciona el texto del mensaje." : ""}</p>
        </div>
      )}
    </section>
  );
}
