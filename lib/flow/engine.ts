// Motor de preguntas progresivas (F0): lógica pura y determinista, sin efectos.
import { RESULT, type AnswerValue, type Answers, type FlowAction, type FlowDefinition, type FlowOption, type FlowQuestion, type FlowState, type StepId } from "./types";

export function getQuestion(flow: FlowDefinition, id: StepId): FlowQuestion | undefined {
  return id === RESULT ? undefined : flow.questions.find(q => q.id === id);
}

export function isVisible(question: FlowQuestion, answers: Answers): boolean {
  return question.when ? question.when(answers) : true;
}

/** Opciones disponibles para las respuestas actuales (aplica `showIf`). */
export function optionsFor(question: FlowQuestion, answers: Answers): FlowOption[] {
  return (question.options ?? []).filter(o => !o.showIf || o.showIf(answers));
}

/** Primera pregunta visible a partir de un índice de la lista; RESULT si no quedan. */
function firstVisibleFrom(flow: FlowDefinition, index: number, answers: Answers): StepId {
  for (let i = index; i < flow.questions.length; i++) if (isVisible(flow.questions[i], answers)) return flow.questions[i].id;
  return RESULT;
}

export function startStep(flow: FlowDefinition, answers: Answers = {}): StepId {
  return firstVisibleFrom(flow, 0, answers);
}

/** Paso siguiente según las respuestas: ramificación explícita, o la siguiente pregunta visible de la lista. */
export function nextStep(flow: FlowDefinition, currentId: StepId, answers: Answers): StepId {
  if (currentId === RESULT) return RESULT;
  const index = flow.questions.findIndex(q => q.id === currentId);
  if (index < 0) return RESULT;
  const question = flow.questions[index];
  if (question.next) {
    const target = question.next(answers);
    if (target === null) return RESULT;
    const targetIndex = flow.questions.findIndex(q => q.id === target);
    if (targetIndex < 0) throw new Error(`Flujo ${flow.id}: la pregunta "${currentId}" apunta a "${target}", que no existe.`);
    return firstVisibleFrom(flow, targetIndex, answers);
  }
  return firstVisibleFrom(flow, index + 1, answers);
}

/** Valor efectivo de una respuesta: descarta opciones que ya no están disponibles. */
export function effectiveValue(question: FlowQuestion, answers: Answers): AnswerValue | undefined {
  const value = answers[question.id];
  if (value === undefined) return undefined;
  if (question.kind === "single") return typeof value === "string" && optionsFor(question, answers).some(o => o.value === value) ? value : undefined;
  if (question.kind === "multi") {
    if (!Array.isArray(value)) return undefined;
    const allowed = new Set(optionsFor(question, answers).map(o => o.value));
    const kept = value.filter(v => allowed.has(v));
    return kept.length ? kept : undefined;
  }
  return value;
}

/** Devuelve un mensaje de error o null si la respuesta permite avanzar. */
export function validate(question: FlowQuestion, answers: Answers): string | null {
  if (question.kind === "info") return null;
  const value = effectiveValue(question, answers);
  const empty = value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
  if (empty) return question.optional ? null : "Elige una opción para continuar.";
  switch (question.kind) {
    case "single": return null;
    case "multi": {
      const n = (value as string[]).length;
      if (question.minSelections && n < question.minSelections) return `Elige al menos ${question.minSelections}.`;
      if (question.maxSelections && n > question.maxSelections) return `Elige hasta ${question.maxSelections}.`;
      return null;
    }
    case "number": {
      if (question.alternative && value === question.alternative.value) return null;
      const n = value as number;
      if (typeof n !== "number" || !Number.isFinite(n)) return "Ingresa un número.";
      if (!Number.isInteger(n)) return "Ingresa un número entero.";
      if (question.min !== undefined && n < question.min) return `El mínimo es ${question.min}.`;
      if (question.max !== undefined && n > question.max) return `El máximo es ${question.max}.`;
      return null;
    }
    case "text": {
      if (typeof value !== "string") return "Respuesta no válida.";
      if (question.maxLength && value.length > question.maxLength) return `Máximo ${question.maxLength} caracteres.`;
      return null;
    }
  }
}

/**
 * Recorrido efectivo desde el inicio con las respuestas actuales, hasta la primera pregunta sin responder.
 * Sirve para saber qué respuestas siguen vigentes después de retroceder y cambiar una rama.
 */
export function activePath(flow: FlowDefinition, answers: Answers): StepId[] {
  const path: StepId[] = [];
  let step = startStep(flow, answers);
  const seen = new Set<StepId>();
  while (step !== RESULT && !seen.has(step)) {
    seen.add(step); path.push(step);
    const question = getQuestion(flow, step)!;
    if (validate(question, answers) !== null) return path; // primera pendiente
    step = nextStep(flow, step, answers);
  }
  path.push(RESULT);
  return path;
}

/** Respuestas vigentes: solo las del recorrido activo y con opciones todavía disponibles. */
export function effectiveAnswers(flow: FlowDefinition, answers: Answers): Answers {
  const result: Record<string, AnswerValue> = {};
  for (const step of activePath(flow, answers)) {
    const question = getQuestion(flow, step);
    if (!question || question.kind === "info") continue;
    if (validate(question, answers) !== null) continue; // respuesta incompleta o inválida: no cuenta todavía
    const value = effectiveValue(question, answers);
    if (value !== undefined) result[question.id] = value;
  }
  return result;
}

/** Progreso estimado (0–1): pasos recorridos sobre el total del recorrido probable. */
export function progress(flow: FlowDefinition, state: FlowState): number {
  if (state.current === RESULT) return 1;
  const done = state.history.length;
  // Pasos restantes: se sigue el recorrido con las respuestas actuales; lo no respondido sigue el orden por defecto.
  let remaining = 0;
  let step: StepId = state.current;
  const seen = new Set<StepId>();
  while (step !== RESULT && !seen.has(step)) { seen.add(step); remaining++; step = nextStep(flow, step, state.answers); }
  return Math.min(1, done / (done + remaining));
}

export function initialState(flow: FlowDefinition, answers: Answers = {}): FlowState {
  return { current: startStep(flow, answers), history: [], answers };
}

export function flowReducer(flow: FlowDefinition, state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "answer": {
      const answers = { ...state.answers };
      if (action.value === undefined) delete answers[action.questionId]; else answers[action.questionId] = action.value;
      return { ...state, answers };
    }
    case "next": {
      const question = getQuestion(flow, state.current);
      if (!question || validate(question, state.answers) !== null) return state;
      return { ...state, history: [...state.history, state.current], current: nextStep(flow, state.current, state.answers) };
    }
    case "back": {
      if (!state.history.length) return state;
      const history = state.history.slice(0, -1);
      return { ...state, history, current: state.history[state.history.length - 1] };
    }
    case "goto": {
      // Solo se permite volver a un paso ya recorrido (navegación del navegador o del resumen).
      const index = state.history.indexOf(action.step);
      if (index < 0) return state;
      return { ...state, history: state.history.slice(0, index), current: action.step };
    }
    case "reset":
      return initialState(flow);
  }
}

/** Verificación estática de un flujo: ids únicos, opciones presentes y saltos válidos (usada en pruebas). */
export function checkFlowDefinition(flow: FlowDefinition): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const q of flow.questions) {
    if (ids.has(q.id)) problems.push(`id duplicado: ${q.id}`);
    if (q.id === RESULT) problems.push(`id reservado: ${q.id}`);
    ids.add(q.id);
    if ((q.kind === "single" || q.kind === "multi") && !q.options?.length) problems.push(`${q.id}: sin opciones`);
    const values = new Set<string>();
    for (const o of q.options ?? []) { if (values.has(o.value)) problems.push(`${q.id}: opción duplicada ${o.value}`); values.add(o.value); }
  }
  return problems;
}
