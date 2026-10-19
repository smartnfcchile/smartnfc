// Motor de preguntas progresivas (F0). Tipos compartidos por el motor, la interfaz y los contenidos.
// El motor es puro: no usa React, red, almacenamiento ni servidor. Las respuestas solo viven en memoria.

export type AnswerValue = string | string[] | number;
export type Answers = Readonly<Record<string, AnswerValue | undefined>>;

export type QuestionKind = "single" | "multi" | "number" | "text" | "info";

export type FlowOption = {
  value: string;
  label: string;
  description?: string;
  /** La opción solo se ofrece si se cumple la condición (p. ej. "Mesas" solo para restaurantes). */
  showIf?: (answers: Answers) => boolean;
};

export type FlowQuestion = {
  id: string;
  kind: QuestionKind;
  title: string;
  help?: string;
  options?: FlowOption[];
  /** La pregunta solo aparece si se cumple la condición. */
  when?: (answers: Answers) => boolean;
  /** Siguiente pregunta explícita (ramificación). Si no se define, sigue el orden de la lista. `null` termina el flujo. */
  next?: (answers: Answers) => string | null;
  optional?: boolean;
  /** multi: mínimo y máximo de opciones. */
  minSelections?: number;
  maxSelections?: number;
  /** number: rango y paso. */
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /**
   * number: alternativa independiente al campo numérico (p. ej. «50 o más: solicitar cotización»).
   * Elegirla guarda `value` (texto) como respuesta y avanza; no pasa por la validación de rango.
   */
  alternative?: { value: string; label: string };
  /** number: valor que la pantalla carga al mostrarse si la pregunta aún no tiene respuesta. */
  defaultValue?: number;
  /** text: largo máximo. */
  maxLength?: number;
  placeholder?: string;
  /** single: avanzar al elegir, sin botón "Siguiente". */
  autoAdvance?: boolean;
};

export type FlowDefinition = {
  id: string;
  questions: FlowQuestion[];
};

/** "result" representa la pantalla final de cada segmento. */
export const RESULT = "result" as const;
export type StepId = string | typeof RESULT;

export type FlowState = {
  /** Pantalla actual. */
  current: StepId;
  /** Pantallas ya recorridas, en orden, para retroceder. */
  history: StepId[];
  /** Todas las respuestas dadas en la sesión (se conservan al retroceder). */
  answers: Answers;
};

export type FlowAction =
  | { type: "answer"; questionId: string; value: AnswerValue | undefined }
  | { type: "next" }
  | { type: "back" }
  | { type: "goto"; step: StepId }
  | { type: "reset" };
