"use client";

// Une el motor puro con React y con el historial del navegador.
// Privacidad: la URL solo lleva el identificador del paso (?paso=…), nunca respuestas. No hay red ni almacenamiento.
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { effectiveAnswers, flowReducer, getQuestion, initialState, progress, validate } from "../../lib/flow/engine";
import { RESULT, type AnswerValue, type FlowAction, type FlowDefinition, type FlowState } from "../../lib/flow/types";

const PARAM = "paso";

/** El primer paso no lleva parámetro: la URL de entrada queda limpia (p. ej. /local). */
function setStepInUrl(step: string, mode: "push" | "replace", start: string) {
  const url = new URL(window.location.href);
  if (step === start) url.searchParams.delete(PARAM); else url.searchParams.set(PARAM, step);
  if (url.href === window.location.href && mode === "replace") return;
  if (mode === "push") window.history.pushState(null, "", url.toString());
  else window.history.replaceState(null, "", url.toString());
}

export function useFlow(flow: FlowDefinition) {
  const [state, dispatch] = useReducer((s: FlowState, a: FlowAction) => flowReducer(flow, s, a), flow, f => initialState(f));
  const stateRef = useRef(state);
  useLayoutEffect(() => { stateRef.current = state; }, [state]);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const start = useMemo(() => initialState(flow).current, [flow]);

  // Al entrar: URL limpia (sin ?paso=). Si alguien llega con ?paso=… (recarga o enlace), vuelve al inicio:
  // las respuestas no se guardan, así que no se puede reconstruir un paso intermedio.
  useEffect(() => { setStepInUrl(start, "replace", start); }, [start]);

  // Botones Atrás / Adelante del navegador.
  useEffect(() => {
    const onPop = () => {
      // Sin parámetro = primer paso.
      const target = new URL(window.location.href).searchParams.get(PARAM) ?? start;
      const s = stateRef.current;
      if (!target || target === s.current) return;
      if (s.history.includes(target)) { setDirection("back"); dispatch({ type: "goto", step: target }); return; }
      // Adelante del navegador: solo si coincide con el paso siguiente válido; si no, se mantiene la pantalla actual.
      const question = getQuestion(flow, s.current);
      const next = flowReducer(flow, s, { type: "next" });
      if (question && validate(question, s.answers) === null && next.current === target) { setDirection("forward"); dispatch({ type: "next" }); }
      else setStepInUrl(s.current, "replace", start);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [flow, start]);

  const answer = useCallback((questionId: string, value: AnswerValue | undefined) => dispatch({ type: "answer", questionId, value }), []);

  const goNext = useCallback(() => {
    const s = stateRef.current;
    const after = flowReducer(flow, s, { type: "next" });
    if (after.current === s.current) return false;
    setDirection("forward");
    dispatch({ type: "next" });
    setStepInUrl(after.current, "push", start);
    return true;
  }, [flow, start]);

  // El botón "Atrás" de la interfaz usa el historial del navegador para que ambos queden sincronizados.
  const goBack = useCallback(() => {
    if (!stateRef.current.history.length) return;
    window.history.back();
  }, []);

  const restart = useCallback(() => {
    setDirection("back");
    dispatch({ type: "reset" });
    setStepInUrl(start, "replace", start);
  }, [start]);

  const question = getQuestion(flow, state.current);
  const effective = useMemo(() => effectiveAnswers(flow, state.answers), [flow, state.answers]);

  return {
    state, question, isResult: state.current === RESULT,
    answers: state.answers, effective,
    progress: progress(flow, state),
    step: state.history.length + 1,
    canGoBack: state.history.length > 0,
    direction,
    error: question ? validate(question, state.answers) : null,
    answer, goNext, goBack, restart,
  };
}

export type FlowController = ReturnType<typeof useFlow>;
