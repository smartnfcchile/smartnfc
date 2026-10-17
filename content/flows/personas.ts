// Árbol de preguntas de SmartNFC Personas (P1), según el diseño F1 aprobado el 17-10-2026 (claude/personas-f1.md).
// P1 uso → P1a ocupación → P2 qué mostrar (máx. 4) → P2a redes · P2b dónde está el contenido · P2c aviso
// → P3 estilo → P3a color → P4 cantidad de tarjetas → resultado.
// Solo contenido: el motor (lib/flow) decide el recorrido; el modelo de respuestas vive en lib/personas/answers.ts.
// Sin Pro, captura de datos, CRM ni métricas (D6); sin perfil permanente (D2); sin compra (D15); sin Equipo ni Local (D16).
import type { Answers, FlowDefinition } from "../../lib/flow/types";

const has = (a: Answers, id: string, value: string) => Array.isArray(a[id]) && (a[id] as string[]).includes(value);
const is = (a: Answers, id: string, ...values: string[]) => typeof a[id] === "string" && values.includes(a[id] as string);

export const PERSONAS_LABELS = {
  uso: {
    personal: "Uso personal",
    oficio: "Mi oficio o trabajo independiente",
    emprende: "Mi emprendimiento o contenido",
    profesional: "Mi profesión",
  },
  mostrar: {
    whatsapp: "WhatsApp",
    llamada: "Llamada",
    correo: "Correo",
    redes: "Redes sociales",
    trabajos: "Mis trabajos",
    catalogo: "Catálogo o tienda",
    agenda: "Agenda o sitio web",
    zona: "Zona o ubicación",
  },
  // Solo las redes que el perfil real admite hoy (CardProfileView): sin X ni Threads.
  redes: { INSTAGRAM: "Instagram", FACEBOOK: "Facebook", LINKEDIN: "LinkedIn", TIKTOK: "TikTok", YOUTUBE: "YouTube" },
  contenidoDonde: {
    instagram: "En Instagram",
    web: "En un sitio, carpeta o PDF en línea",
    youtube: "En videos de YouTube",
    none: "Aún no están en internet",
  },
  estilo: { oscuro: "Oscuro", claro: "Claro", diagonal: "Diagonal", llamativo: "Llamativo" },
  color: { azul: "Azul", verde: "Verde", rojo: "Rojo", morado: "Morado", naranjo: "Naranjo", grafito: "Grafito" },
} as const satisfies Record<string, Record<string, string>>;

const options = <K extends keyof typeof PERSONAS_LABELS>(key: K) =>
  Object.entries(PERSONAS_LABELS[key]).map(([value, label]) => ({ value, label }));

export const MAX_MOSTRAR = 4;
export const OCUPACION_MAX = 40;
/** Cantidad de tarjetas en el configurador (F1). Desde 50 tarjetas se cotiza aparte. */
export const CANTIDAD_MIN = 1;
export const CANTIDAD_MAX = 49;

/** Segmentos donde se ofrece cada opción de P2 (F1 §2). */
export const USOS_CON_TRABAJOS = ["oficio", "emprende", "profesional"] as const;
export const USOS_CON_CATALOGO = ["oficio", "emprende"] as const;
export const USOS_CON_AGENDA = ["oficio", "profesional"] as const;

/**
 * ¿El perfil mostrará este elemento? Exige que siga disponible para el uso elegido: si la persona cambia de uso,
 * una opción marcada antes (p. ej. «Mis trabajos» en uso personal) deja de abrir sus preguntas derivadas.
 */
const AVAILABLE_FOR: Partial<Record<keyof typeof PERSONAS_LABELS.mostrar, readonly string[]>> = {
  trabajos: USOS_CON_TRABAJOS, catalogo: USOS_CON_CATALOGO, agenda: USOS_CON_AGENDA,
};
type MostrarId = keyof typeof PERSONAS_LABELS.mostrar;
const disponible = (a: Answers, value: MostrarId) => {
  const usos = AVAILABLE_FOR[value];
  return !usos || is(a, "uso", ...usos);
};
const muestra = (a: Answers, value: MostrarId) => has(a, "mostrar", value) && disponible(a, value);
const muestraContenido = (a: Answers) => muestra(a, "trabajos") || muestra(a, "catalogo");

export const PERSONAS_FLOW: FlowDefinition = {
  id: "personas",
  questions: [
    { id: "uso", kind: "single", title: "¿Para qué quieres tu SmartNFC?", options: options("uso"), autoAdvance: true },
    { id: "ocupacion", kind: "text", title: "¿A qué te dedicas?",
      help: "Opcional. Aparecerá bajo tu nombre en el perfil.",
      when: a => !is(a, "uso", "personal"), optional: true, maxLength: OCUPACION_MAX,
      placeholder: "Por ejemplo: maestro soldador, repostería, arquitecta" },
    { id: "mostrar", kind: "multi", title: "¿Qué quieres que vean al acercar el teléfono?",
      help: `Elige hasta ${MAX_MOSTRAR}. «Guardar contacto» y «Compartir» siempre están incluidos.`,
      maxSelections: MAX_MOSTRAR,
      options: [
        { value: "whatsapp", label: PERSONAS_LABELS.mostrar.whatsapp },
        { value: "llamada", label: PERSONAS_LABELS.mostrar.llamada },
        { value: "correo", label: PERSONAS_LABELS.mostrar.correo },
        { value: "redes", label: PERSONAS_LABELS.mostrar.redes },
        { value: "trabajos", label: PERSONAS_LABELS.mostrar.trabajos, showIf: a => disponible(a, "trabajos") },
        { value: "catalogo", label: PERSONAS_LABELS.mostrar.catalogo, showIf: a => disponible(a, "catalogo") },
        { value: "agenda", label: PERSONAS_LABELS.mostrar.agenda, showIf: a => disponible(a, "agenda") },
        { value: "zona", label: PERSONAS_LABELS.mostrar.zona },
      ] },
    { id: "redes", kind: "multi", title: "¿Qué redes usas?", help: "Elige todas las que quieras mostrar.",
      when: a => muestra(a, "redes"), options: options("redes") },
    { id: "contenidoDonde", kind: "single", title: "¿Dónde están hoy tus trabajos o tu catálogo?",
      when: muestraContenido,
      options: options("contenidoDonde"), autoAdvance: true },
    { id: "contenidoAviso", kind: "info", title: "SmartNFC enlaza tu contenido; no lo aloja",
      help: "Tu perfil abre los trabajos o el catálogo que tengas publicados en internet. Antes de activar ese enlace, necesitarás publicarlos en una red social, un sitio, una carpeta o un PDF en línea.",
      when: a => muestraContenido(a) && is(a, "contenidoDonde", "none") },
    { id: "estilo", kind: "single", title: "¿Qué estilo prefieres para tu perfil?", options: options("estilo"), autoAdvance: true },
    { id: "color", kind: "single", title: "Elige un color", options: options("color"), autoAdvance: true },
    { id: "cantidad", kind: "number", title: "¿Cuántas tarjetas necesitas?",
      help: `Entre ${CANTIDAD_MIN} y ${CANTIDAD_MAX}. Para 50 o más, preparamos una cotización.`,
      min: CANTIDAD_MIN, max: CANTIDAD_MAX, step: 1, unit: "tarjetas" },
  ],
};
