"use client";

// F3 · Solicitud "Solicitar mi propuesta". Consentimiento explícito (borrador funcional, sujeto a revisión legal),
// vista previa del mensaje y apertura de WhatsApp por decisión de la persona. Sin almacenamiento en servidor:
// no hay fetch, formularios enviados, cookies ni almacenamiento local; el mensaje solo existe en esta página.
import { useId, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { PRIVACY_PATH, REQUEST_PERSONAL_FIELDS_ENABLED } from "../../content/legal/privacy";
import { REQUEST_CONSENT } from "../../content/locales/consent";
import { buildLocalesQuote } from "../../lib/locales/quote";
import { REQUEST_FIELD_MAX, buildRequestMessage, whatsappRequestUrl } from "../../lib/locales/request-message";
import type { LocalesResultInput } from "./contracts";
import styles from "./locales.module.css";

export default function LocalesRequest({ proposal, selection }: LocalesResultInput) {
  const id = useId();
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [consent, setConsent] = useState(false);
  const [stage, setStage] = useState<"form" | "review">("form");
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState<"" | "ok" | "fail">("");
  const quote = useMemo(() => buildLocalesQuote(proposal, selection), [proposal, selection]);
  const message = useMemo(() => buildRequestMessage(proposal, selection, quote, { businessName, city }), [proposal, selection, quote, businessName, city]);

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
      <h3 id={`${id}-title`} className={styles.h3}>Solicitar mi propuesta</h3>
      <p className={styles.muted}>Prepara un mensaje con tu propuesta para enviarlo a SmartNFC por WhatsApp. No se contrata ni se cobra nada desde esta página.</p>

      {stage === "form" ? (
        <form onSubmit={prepare} noValidate className={styles.requestForm}>
          {REQUEST_PERSONAL_FIELDS_ENABLED && (
            <div className={styles.fields}>
              <label htmlFor={`${id}-business`}>Nombre del negocio <span>(opcional)</span></label>
              <input id={`${id}-business`} type="text" maxLength={REQUEST_FIELD_MAX} autoComplete="organization" value={businessName} onChange={e => setBusinessName(e.target.value)} />
              <label htmlFor={`${id}-city`}>Ciudad <span>(opcional)</span></label>
              <input id={`${id}-city`} type="text" maxLength={REQUEST_FIELD_MAX} autoComplete="address-level2" value={city} onChange={e => setCity(e.target.value)} />
            </div>
          )}
          <label className={styles.consent} htmlFor={`${id}-consent`}>
            <input id={`${id}-consent`} type="checkbox" checked={consent} aria-describedby={`${id}-consent-details${error ? ` ${id}-error` : ""}`}
              onChange={e => { setConsent(e.target.checked); if (e.target.checked) setError(false); }} />
            <span>{REQUEST_CONSENT.label}</span>
          </label>
          <p id={`${id}-consent-details`} className={styles.consentDetails}>{REQUEST_CONSENT.details} <Link href={PRIVACY_PATH} prefetch={false} target="_blank" rel="noopener">Leer el aviso de privacidad<span className="sr-only"> (se abre en una pestaña nueva)</span></Link>.</p>
          <p id={`${id}-error`} className="fl-error" role="alert">{error ? REQUEST_CONSENT.required : ""}</p>
          <button type="submit" className="fl-next">Solicitar mi propuesta</button>
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
