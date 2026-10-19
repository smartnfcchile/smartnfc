// Flujo FICTICIO de demostración del motor (F0). No representa ningún producto ni promete funciones.
// Muestra: avance automático, rama explícita, pregunta condicional, opción condicional, máximo de selección,
// número con rango y texto opcional.
import type { FlowDefinition } from "../../lib/flow/types";

export const DEMO_FLOW: FlowDefinition = {
  id: "demo",
  questions: [
    {
      id: "ocasion", kind: "single", autoAdvance: true,
      title: "¿Qué tipo de reunión quieres organizar?",
      help: "Ejemplo ficticio para probar el motor de preguntas.",
      options: [
        { value: "desayuno", label: "Desayuno", description: "Algo breve por la mañana" },
        { value: "almuerzo", label: "Almuerzo", description: "Una pausa al mediodía" },
        { value: "celebracion", label: "Celebración", description: "Un cumpleaños o un logro" },
      ],
      next: a => (a.ocasion === "celebracion" ? "motivo" : "ambiente"),
    },
    {
      id: "motivo", kind: "single", autoAdvance: true,
      title: "¿Qué se celebra?",
      options: [
        { value: "cumple", label: "Un cumpleaños" },
        { value: "logro", label: "Un logro del equipo" },
        { value: "otro", label: "Otra cosa" },
      ],
    },
    {
      id: "ambiente", kind: "multi", maxSelections: 2,
      title: "¿Qué ambiente imaginas?",
      help: "Elige hasta 2.",
      options: [
        { value: "musica", label: "Con música" },
        { value: "aire-libre", label: "Al aire libre" },
        { value: "tranquilo", label: "Tranquilo" },
        { value: "juegos", label: "Con juegos", showIf: a => a.ocasion === "celebracion" },
      ],
    },
    {
      id: "musica", kind: "single", autoAdvance: true,
      when: a => Array.isArray(a.ambiente) && a.ambiente.includes("musica"),
      title: "¿Qué música prefieres?",
      options: [
        { value: "acustica", label: "Acústica" },
        { value: "jazz", label: "Jazz" },
        { value: "pop", label: "Pop" },
      ],
    },
    { id: "personas", kind: "number", min: 2, max: 40, step: 1, unit: "personas", title: "¿Cuántas personas asistirán?" },
    { id: "nota", kind: "text", optional: true, maxLength: 80, placeholder: "Ej.: alguien no come gluten", title: "¿Algo más que debamos considerar?", help: "Opcional. No se guarda ni se envía." },
  ],
};

export const DEMO_LABELS: Record<string, Record<string, string>> = Object.fromEntries(
  DEMO_FLOW.questions.map(q => [q.id, Object.fromEntries((q.options ?? []).map(o => [o.value, o.label]))]),
);
