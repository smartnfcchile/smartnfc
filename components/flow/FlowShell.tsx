"use client";

// Contenedor común de las experiencias conversacionales: progreso, Atrás, salida visible, pregunta,
// vista previa que se actualiza con las respuestas y pantalla de resultado.
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import type { Answers, FlowDefinition } from "../../lib/flow/types";
import QuestionScreen from "./QuestionScreen";
import { useFlow, type FlowController } from "./useFlow";

type Props = {
  flow: FlowDefinition;
  /** Nombre accesible de la experiencia (p. ej. "Configura SmartNFC para tu local"). */
  label: string;
  exitHref: string;
  exitLabel?: string;
  renderPreview?: (effective: Answers, flow: FlowController) => ReactNode;
  renderResult: (effective: Answers, flow: FlowController) => ReactNode;
  /** Mostrar la vista previa también en la pantalla de resultado (por defecto no, para no duplicar). */
  previewOnResult?: boolean;
};

export default function FlowShell({ flow, label, exitHref, exitLabel = "Ver información sin responder", renderPreview, renderResult, previewOnResult = false }: Props) {
  const ctrl = useFlow(flow);
  const heading = useRef<HTMLHeadingElement | null>(null);
  const stepKey = ctrl.state.current;
  const previousStep = useRef(stepKey);

  // Al cambiar de pantalla, el foco va al título nuevo (los lectores de pantalla lo anuncian). No en la carga inicial.
  useEffect(() => {
    if (previousStep.current === stepKey) return;
    previousStep.current = stepKey;
    heading.current?.focus({ preventScroll: true });
  }, [stepKey]);
  const showPreview = !!renderPreview && (!ctrl.isResult || previewOnResult);

  const percent = Math.round(ctrl.progress * 100);
  return (
    <section className="fl" aria-label={label}>
      <header className="fl-bar">
        <button type="button" className="fl-back" onClick={ctrl.goBack} disabled={!ctrl.canGoBack} aria-label="Volver a la pregunta anterior">
          <span aria-hidden="true">←</span> Atrás
        </button>
        <div className="fl-progress" role="progressbar" aria-label="Avance" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={ctrl.isResult ? "Completado" : `Pregunta ${ctrl.step}`}>
          <i style={{ width: `${Math.max(percent, 4)}%` }} />
        </div>
        <Link href={exitHref} className="fl-exit">{exitLabel}</Link>
      </header>

      <div className={`fl-body${showPreview ? " has-preview" : ""}`}>
        <div className={`fl-stage fl-dir-${ctrl.direction}`} key={stepKey}>
          {ctrl.question && (
            <QuestionScreen question={ctrl.question} answers={ctrl.answers} error={ctrl.error}
              onAnswer={ctrl.answer} onNext={ctrl.goNext} headingRef={el => { heading.current = el; }} />
          )}
          {ctrl.isResult && (
            <div className="fl-result">
              <h2 ref={heading} tabIndex={-1} className="fl-title">Tu resultado</h2>
              {renderResult(ctrl.effective, ctrl)}
            </div>
          )}
        </div>
        {showPreview && renderPreview && (
          <aside className="fl-preview" aria-label="Vista previa según tus respuestas">
            {renderPreview(ctrl.effective, ctrl)}
          </aside>
        )}
      </div>
    </section>
  );
}
