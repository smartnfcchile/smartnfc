"use client";

// Solicitud «Solicitar propuesta» de SmartNFC Empresas. Mismo patrón que Locales y Personas: consentimiento sin
// marcar, vista previa del mensaje y apertura de WhatsApp por decisión de la persona. Sin fetch, formularios enviados,
// cookies ni almacenamiento local; el mensaje solo existe en esta página.
import { useId, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { PRIVACY_PATH, REQUEST_PERSONAL_FIELDS_ENABLED } from "../../content/legal/privacy";
import { EMPRESAS_CONSENT, EMPRESAS_NOT_A_PURCHASE } from "../../content/empresas/consent";
import type { EmpresasAnswersModel } from "../../lib/empresas/answers";
import type { EmpresasConditions, EmpresasQuote } from "../../lib/empresas/quote";
import { EMPRESAS_FIELD_MAX, buildEmpresasRequestMessage, whatsappRequestUrl } from "../../lib/empresas/request-message";
import styles from "./empresas.module.css";

export default function EmpresasRequest({ model, quote, conditions }: { model: EmpresasAnswersModel; quote: EmpresasQuote; conditions: EmpresasConditions }) {
  const id = useId();
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [consent, setConsent] = useState(false);
  const [stage, setStage] = useState<"form" | "review">("form");
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState<"" | "ok" | "fail">("");
  const message = useMemo(() => buildEmpresasRequestMessage(model, quote, conditions, { company, city }), [model, quote, conditions, company, city]);

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
      <h3 id={`${id}-title`} className={styles.h3}>Solicitar propuesta</h3>
      <p className={styles.notPurchase}>{EMPRESAS_NOT_A_PURCHASE}</p>
      {stage === "form" ? (
        <form onSubmit={prepare} noValidate className={styles.requestForm}>
          <p className={styles.muted}>Prepara un mensaje con esta configuración para enviarlo a SmartNFC por WhatsApp.</p>
          {REQUEST_PERSONAL_FIELDS_ENABLED && (
            <div className={styles.fields}>
              <label htmlFor={`${id}-company`}>Empresa <span>(opcional)</span></label>
              <input id={`${id}-company`} type="text" maxLength={EMPRESAS_FIELD_MAX} autoComplete="organization" value={company} onChange={e => setCompany(e.target.value)} />
              <label htmlFor={`${id}-city`}>Ciudad <span>(opcional)</span></label>
              <input id={`${id}-city`} type="text" maxLength={EMPRESAS_FIELD_MAX} autoComplete="address-level2" value={city} onChange={e => setCity(e.target.value)} />
            </div>
          )}
          <label className={styles.consent} htmlFor={`${id}-consent`}>
            <input id={`${id}-consent`} type="checkbox" checked={consent} aria-describedby={`${id}-consent-details${error ? ` ${id}-error` : ""}`}
              onChange={e => { setConsent(e.target.checked); if (e.target.checked) setError(false); }} />
            <span>{EMPRESAS_CONSENT.label}</span>
          </label>
          <p id={`${id}-consent-details`} className={styles.consentDetails}>{EMPRESAS_CONSENT.details} <Link href={PRIVACY_PATH} prefetch={false} target="_blank" rel="noopener">Leer el aviso de privacidad<span className="sr-only"> (se abre en una pestaña nueva)</span></Link>.</p>
          <p id={`${id}-error`} className="fl-error" role="alert">{error ? EMPRESAS_CONSENT.required : ""}</p>
          <button type="submit" className="fl-next">Solicitar propuesta</button>
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
