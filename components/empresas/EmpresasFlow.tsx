"use client";

// Configurador de SmartNFC Empresas sobre el motor de preguntas compartido (lib/flow): una pregunta por pantalla,
// vista previa del panel con datos ficticios y resultado con plan, tarjetas y solicitud por WhatsApp.
import { useMemo } from "react";
import FlowShell from "../flow/FlowShell";
import { EMPRESAS_FLOW, EMPRESAS_LABELS } from "../../content/flows/empresas";
import { readEmpresasAnswers, type EmpresasAnswersModel } from "../../lib/empresas/answers";
import { buildEmpresasQuote, empresasConditions } from "../../lib/empresas/quote";
import type { Answers } from "../../lib/flow/types";
import EmpresasPreview, { EMPRESAS_PREVIEW_NOTE } from "./EmpresasPreview";
import EmpresasOffer from "./EmpresasOffer";
import EmpresasRequest from "./EmpresasRequest";
import styles from "./empresas.module.css";

function Preview({ answers }: { answers: Answers }) {
  const model = useMemo(() => readEmpresasAnswers(answers), [answers]);
  const quote = useMemo(() => buildEmpresasQuote(model), [model]);
  return <div className={styles.previewWrap}><EmpresasPreview model={model} quote={quote} /><p className={styles.note}>{EMPRESAS_PREVIEW_NOTE}</p></div>;
}

export function EmpresasResult({ model, onChangeAnswers, onRestart }: { model: EmpresasAnswersModel; onChangeAnswers: () => void; onRestart: () => void }) {
  const quote = useMemo(() => buildEmpresasQuote(model), [model]);
  const conditions = useMemo(() => empresasConditions(), []);
  const rows: [string, string][] = [
    ["Personas con perfil", model.cotizacionPersonas ? "Más de 25" : model.personas !== null ? String(model.personas) : "—"],
    ["Tarjetas físicas", model.cotizacionPersonas ? "Por cotizar" : model.tarjetas === null ? "—" : model.tarjetas === 0 ? "Ninguna por ahora" : `${model.tarjetas}${model.tarjetasPorPersona ? " (una por persona)" : ""}`],
    ["Administración", model.administra ? EMPRESAS_LABELS.administra[model.administra] : "—"],
    ["Edición de perfiles", model.control ? EMPRESAS_LABELS.control[model.control] : "—"],
    ["Cambios en el equipo", model.rotacion ? EMPRESAS_LABELS.rotacion[model.rotacion] : "—"],
  ];
  return (
    <div className={styles.result}>
      <p className={styles.resultLead}>Esta es la configuración de tu equipo. Puedes cambiar cualquier respuesta antes de seguir.</p>
      <dl className={styles.summary}>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      {model.notices.length > 0 && <ul className={styles.notices}>{model.notices.map(n => <li key={n.id}>{n.text}</li>)}</ul>}
      <div className={styles.commercial}>
        <EmpresasOffer quote={quote} conditions={conditions} />
        <EmpresasRequest model={model} quote={quote} conditions={conditions} />
      </div>
      <div className={styles.resultActions}>
        <button type="button" className="fl-secondary" onClick={onChangeAnswers}>Cambiar respuestas</button>
        <button type="button" className="fl-secondary" onClick={onRestart}>Empezar de nuevo</button>
      </div>
    </div>
  );
}

export default function EmpresasFlow({ exitHref }: { exitHref: string }) {
  return (
    <FlowShell
      flow={EMPRESAS_FLOW}
      label="Arma la propuesta de tu equipo"
      exitHref={exitHref}
      exitLabel="Ver planes sin responder"
      renderPreview={answers => <Preview answers={answers} />}
      renderResult={(answers, flow) => <EmpresasResult model={readEmpresasAnswers(answers)} onChangeAnswers={flow.goBack} onRestart={flow.restart} />}
    />
  );
}
