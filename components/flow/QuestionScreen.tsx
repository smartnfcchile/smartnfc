"use client";

// Una pregunta por pantalla. Controles nativos (radio, checkbox, number, text) para máxima accesibilidad.
import { useId, useState, type FormEvent, type MouseEvent } from "react";
import { optionsFor } from "../../lib/flow/engine";
import type { Answers, AnswerValue, FlowQuestion } from "../../lib/flow/types";

type Props = {
  question: FlowQuestion;
  answers: Answers;
  error: string | null;
  onAnswer: (questionId: string, value: AnswerValue | undefined) => void;
  onNext: () => boolean;
  headingRef: (el: HTMLHeadingElement | null) => void;
  nextLabel?: string;
};

export default function QuestionScreen({ question, answers, error, onAnswer, onNext, headingRef, nextLabel = "Siguiente" }: Props) {
  const baseId = useId();
  const [showError, setShowError] = useState(false);
  const value = answers[question.id];
  const options = optionsFor(question, answers);
  const headingId = `${baseId}-title`, helpId = `${baseId}-help`, errorId = `${baseId}-error`;
  const describedBy = [question.help ? helpId : null, showError && error ? errorId : null].filter(Boolean).join(" ") || undefined;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!onNext()) setShowError(true);
  };

  // Avance automático solo con clic o toque (detail > 0). Con teclado (flechas o espacio) nunca avanza solo,
  // para que se pueda recorrer las opciones sin saltar de pantalla.
  const autoAdvance = (event: MouseEvent, optionValue: string) => {
    if (!question.autoAdvance || event.detail === 0) return;
    onAnswer(question.id, optionValue);
    setTimeout(onNext, 140);
  };

  const selected = Array.isArray(value) ? value : [];
  const maxReached = question.kind === "multi" && !!question.maxSelections && selected.length >= question.maxSelections;
  const numberValue = typeof value === "number" ? value : undefined;
  const stepBy = (delta: number) => {
    const base = numberValue ?? question.min ?? 0;
    const n = Math.min(question.max ?? Infinity, Math.max(question.min ?? -Infinity, base + delta * (question.step ?? 1)));
    onAnswer(question.id, n);
  };

  return (
    <form className="fl-question" onSubmit={submit} noValidate>
      <h2 id={headingId} ref={headingRef} tabIndex={-1} className="fl-title">{question.title}</h2>
      {question.help && <p id={helpId} className="fl-help">{question.help}</p>}

      {(question.kind === "single" || question.kind === "multi") && (
        <fieldset className="fl-options" aria-labelledby={headingId} aria-describedby={describedBy}>
          {options.map(option => {
            const id = `${baseId}-${option.value}`;
            const checked = question.kind === "single" ? value === option.value : selected.includes(option.value);
            const disabled = question.kind === "multi" && maxReached && !checked;
            return (
              <label key={option.value} htmlFor={id} className={`fl-option${checked ? " is-checked" : ""}${disabled ? " is-disabled" : ""}`}
                onClick={question.kind === "single" ? e => autoAdvance(e, option.value) : undefined}>
                <input id={id} type={question.kind === "single" ? "radio" : "checkbox"} name={question.id} value={option.value}
                  checked={checked} disabled={disabled}
                  onChange={() => {
                    setShowError(false);
                    if (question.kind === "single") onAnswer(question.id, option.value);
                    else onAnswer(question.id, checked ? selected.filter(v => v !== option.value) : [...selected, option.value]);
                  }} />
                <span className="fl-option-mark" aria-hidden="true" />
                <span className="fl-option-text"><b>{option.label}</b>{option.description && <small>{option.description}</small>}</span>
              </label>
            );
          })}
        </fieldset>
      )}

      {question.kind === "number" && (
        <div className="fl-number">
          <button type="button" className="fl-step" onClick={() => stepBy(-1)} aria-label="Disminuir" disabled={numberValue !== undefined && question.min !== undefined && numberValue <= question.min}>−</button>
          <input type="number" inputMode="numeric" aria-labelledby={headingId} aria-describedby={describedBy}
            min={question.min} max={question.max} step={question.step ?? 1}
            value={numberValue ?? ""} placeholder={question.min !== undefined ? String(question.min) : undefined}
            onChange={e => { setShowError(false); const n = e.target.value === "" ? undefined : Number(e.target.value); onAnswer(question.id, n); }} />
          <button type="button" className="fl-step" onClick={() => stepBy(1)} aria-label="Aumentar" disabled={numberValue !== undefined && question.max !== undefined && numberValue >= question.max}>+</button>
          {question.unit && <span className="fl-unit">{question.unit}</span>}
        </div>
      )}

      {question.kind === "text" && (
        <div className="fl-text">
          <input type="text" aria-labelledby={headingId} aria-describedby={describedBy} maxLength={question.maxLength} placeholder={question.placeholder}
            value={typeof value === "string" ? value : ""} autoComplete="off"
            onChange={e => { setShowError(false); onAnswer(question.id, e.target.value === "" ? undefined : e.target.value); }} />
          {question.maxLength && <small className="fl-count" aria-live="polite">{(typeof value === "string" ? value.length : 0)}/{question.maxLength}</small>}
        </div>
      )}

      <p id={errorId} className="fl-error" role="alert">{showError && error ? error : ""}</p>

      <div className="fl-actions">
        <button type="submit" className="fl-next">{question.optional && (value === undefined || value === "") ? "Omitir" : nextLabel}</button>
      </div>
    </form>
  );
}
