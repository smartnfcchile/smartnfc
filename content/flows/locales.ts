// Árbol de preguntas de SmartNFC Locales (F2), aprobado el 16-10-2026.
// L1 rubro → L2 objetivos (máx. 3) → L2a redes · L2b carta · L2c perfil de Google · L2d promociones
// → L3 ubicación de puntos (L3a mesas) → L4 número de locales → resultado.
// Solo contenido: el motor (lib/flow) decide el recorrido y la lógica de la propuesta vive en lib/locales/proposal.ts.
import type { Answers, FlowDefinition } from "../../lib/flow/types";

const has = (a: Answers, id: string, value: string) => Array.isArray(a[id]) && (a[id] as string[]).includes(value);
const is = (a: Answers, id: string, ...values: string[]) => typeof a[id] === "string" && values.includes(a[id] as string);

/** Rubros donde tiene sentido ofrecer cada ubicación. */
export const RUBROS_CON_MESAS = ["cafe", "bar"] as const;
export const RUBROS_CON_RECEPCION = ["gym", "beauty", "clinic", "lodging"] as const;

export const LOCALES_LABELS = {
  rubro: {
    cafe: "Cafetería o restaurante", bar: "Bar", gym: "Gimnasio o estudio", beauty: "Peluquería, barbería o estética",
    clinic: "Consulta o clínica", store: "Tienda", lodging: "Alojamiento o turismo", other: "Otro",
  },
  objetivos: {
    reviews: "Reseñas en Google", whatsapp: "Conversaciones por WhatsApp", social: "Seguidores en redes sociales",
    menu: "Mostrar carta o catálogo", promo: "Promociones", contact: "Ubicación y contacto",
  },
  redes: { INSTAGRAM: "Instagram", FACEBOOK: "Facebook", TIKTOK: "TikTok", YOUTUBE: "YouTube", LINKEDIN: "LinkedIn", X: "X", THREADS: "Threads" },
  cartaPublicada: { yes: "Sí, ya está publicada", no: "Todavía no" },
  perfilGoogle: { yes: "Sí", no: "No", unknown: "No sé" },
  frecuenciaPromo: { weekly: "Semanal", monthly: "Mensual", season: "Por temporada" },
  ubicaciones: { counter: "Mesón o caja", tables: "Mesas", entrance: "Entrada o vitrina", waiting: "Sala de espera o recepción", other: "Otro lugar" },
  locales: { one: "1 local", few: "2 a 5 locales", many: "Más de 5 locales" },
} as const satisfies Record<string, Record<string, string>>;

const options = <K extends keyof typeof LOCALES_LABELS>(key: K) =>
  Object.entries(LOCALES_LABELS[key]).map(([value, label]) => ({ value, label }));

export const MAX_OBJETIVOS = 3;
export const MESAS_MIN = 1;
export const MESAS_MAX = 40;

export const LOCALES_FLOW: FlowDefinition = {
  id: "locales",
  questions: [
    { id: "rubro", kind: "single", title: "¿Qué tipo de negocio tienes?", options: options("rubro"), autoAdvance: true },
    { id: "rubroOtro", kind: "text", title: "Cuéntanos brevemente qué negocio es", help: "Opcional. Nos ayuda a preparar una propuesta adecuada.",
      when: a => is(a, "rubro", "other"), optional: true, maxLength: 60, placeholder: "Por ejemplo: florería, taller, librería" },
    { id: "objetivos", kind: "multi", title: "¿Qué quieres lograr con tus clientes?", help: `Elige hasta ${MAX_OBJETIVOS}.`,
      maxSelections: MAX_OBJETIVOS, options: options("objetivos") },
    { id: "redes", kind: "multi", title: "¿Qué redes sociales usa tu negocio?", help: "Elige todas las que quieras mostrar.",
      when: a => has(a, "objetivos", "social"), options: options("redes") },
    { id: "cartaPublicada", kind: "single", title: "¿Tu carta o catálogo ya está publicado en internet?",
      help: "Por ejemplo, en tu sitio web, en un PDF en línea o en una plataforma de pedidos.",
      when: a => has(a, "objetivos", "menu"), options: options("cartaPublicada"), autoAdvance: true },
    { id: "cartaAviso", kind: "info", title: "SmartNFC enlaza tu carta, no la aloja",
      help: "El punto abre la carta o catálogo que ya tengas publicado en internet. Antes de activarlo, necesitarás publicarlo en un sitio, un PDF en línea o una plataforma.",
      when: a => has(a, "objetivos", "menu") && is(a, "cartaPublicada", "no") },
    { id: "perfilGoogle", kind: "single", title: "¿Tu negocio tiene perfil en Google?",
      help: "Es la ficha que aparece en Google Maps y en la búsqueda, donde los clientes dejan reseñas.",
      when: a => has(a, "objetivos", "reviews"), options: options("perfilGoogle"), autoAdvance: true },
    { id: "googleAviso", kind: "info", title: "Para pedir reseñas se necesita un perfil de Google activo",
      help: "La acción de reseñas abre tu perfil de empresa en Google. Si no existe o no estás seguro, habrá que crearlo o verificarlo antes de activar esa acción. Lo indicaremos en tu propuesta.",
      when: a => has(a, "objetivos", "reviews") && is(a, "perfilGoogle", "no", "unknown") },
    { id: "frecuenciaPromo", kind: "single", title: "¿Cada cuánto cambias tus promociones?",
      when: a => has(a, "objetivos", "promo"), options: options("frecuenciaPromo"), autoAdvance: true },
    { id: "ubicaciones", kind: "multi", title: "¿Dónde pondrías los puntos NFC?", help: "Elige todos los lugares que quieras.",
      options: [
        { value: "counter", label: LOCALES_LABELS.ubicaciones.counter },
        { value: "tables", label: LOCALES_LABELS.ubicaciones.tables, showIf: a => is(a, "rubro", ...RUBROS_CON_MESAS) },
        { value: "entrance", label: LOCALES_LABELS.ubicaciones.entrance },
        { value: "waiting", label: LOCALES_LABELS.ubicaciones.waiting, showIf: a => is(a, "rubro", ...RUBROS_CON_RECEPCION) },
        { value: "other", label: LOCALES_LABELS.ubicaciones.other },
      ] },
    { id: "mesas", kind: "number", title: "¿Cuántas mesas tendrían un punto?", help: `Entre ${MESAS_MIN} y ${MESAS_MAX}.`,
      when: a => has(a, "ubicaciones", "tables") && is(a, "rubro", ...RUBROS_CON_MESAS), min: MESAS_MIN, max: MESAS_MAX, unit: "mesas" },
    { id: "locales", kind: "single", title: "¿Cuántos locales tienes?", options: options("locales"), autoAdvance: true },
  ],
};
