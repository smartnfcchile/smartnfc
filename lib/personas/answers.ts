// Modelo de respuestas de SmartNFC Personas (P1): de las respuestas EFECTIVAS del flujo a un modelo tipado.
// Módulo puro: sin React, red, almacenamiento ni montos. Precios y solicitud se resuelven en P3 con
// lib/commercial/public-offers.ts; la vista previa visual (P2) consume este modelo.
import type { Answers } from "../flow/types";
import type { NormalizedTemplate } from "../templates";
import { CANTIDAD_COTIZACION, CANTIDAD_MAX, CANTIDAD_MIN, OCUPACION_MAX, PERSONAS_LABELS } from "../../content/flows/personas";

export type Uso = keyof typeof PERSONAS_LABELS.uso;
export type Mostrar = keyof typeof PERSONAS_LABELS.mostrar;
export type Red = keyof typeof PERSONAS_LABELS.redes;
export type ContenidoDonde = keyof typeof PERSONAS_LABELS.contenidoDonde;
export type Estilo = keyof typeof PERSONAS_LABELS.estilo;
export type ColorId = keyof typeof PERSONAS_LABELS.color;

/** Formatos del perfil real (lib/templates.ts) por estilo. Solo formatos personales: sin «Ficha Corporativa». */
export const ESTILO_TEMPLATE: Record<Estilo, NormalizedTemplate> = {
  oscuro: "classic-dark", claro: "classic-light", diagonal: "split-diagonal", llamativo: "neobrutalist",
};

/** Colores de muestra (themeColor del perfil). */
export const COLOR_HEX: Record<ColorId, string> = {
  azul: "#2563EB", verde: "#059669", rojo: "#DC2626", morado: "#7C3AED", naranjo: "#EA580C", grafito: "#334155",
};
export const DEFAULT_ESTILO: Estilo = "oscuro";
export const DEFAULT_COLOR: ColorId = "azul";

/** Ejemplos ficticios aprobados por segmento (17-10-2026). El cargo de ejemplo se reemplaza por P1a si se responde. */
export const PERSONAS_EXAMPLES: Record<Uso, { name: string; role: string | null }> = {
  personal: { name: "Camila Vega", role: null },
  oficio: { name: "Miguel Rojas", role: "Maestro soldador" },
  emprende: { name: "Fernanda Soto", role: "Emprendedora" },
  profesional: { name: "Diego Torres", role: "Arquitecto" },
};

/** Acciones de contacto directas: la primera elegida es la acción principal del perfil. */
const DIRECT_ACTIONS: readonly Mostrar[] = ["whatsapp", "llamada", "correo"];
/** «Guardar contacto» y «Compartir» existen siempre en el perfil real; no se preguntan. */
export const ALWAYS_INCLUDED = ["guardar", "compartir"] as const;

export type PersonasNotice = { id: "content-not-online"; text: string };

export type PersonasAnswersModel = {
  uso: Uso | null;
  usoLabel: string | null;
  /** P1a, recortada; null en uso personal o si se dejó vacía. */
  ocupacion: string | null;
  /** Lo que mostrará el perfil, en el orden de las opciones (no en el orden en que se marcó). */
  mostrar: Mostrar[];
  primaryAction: Mostrar | null;
  redes: Red[];
  contenidoDonde: ContenidoDonde | null;
  estilo: Estilo | null;
  color: ColorId | null;
  /** Tarjetas entre 1 y 49 (con precio por tramo en P3). null si no se respondió o si se pidió cotización. */
  cantidad: number | null;
  /** «50 o más: solicitar cotización»: sin precio automático. */
  cotizacionVolumen: boolean;
  notices: PersonasNotice[];
};

const str = (a: Answers, id: string) => (typeof a[id] === "string" ? (a[id] as string) : null);
const list = (a: Answers, id: string) => (Array.isArray(a[id]) ? (a[id] as string[]) : []);
const inOrder = <K extends string>(labels: Record<K, string>, values: string[]) =>
  (Object.keys(labels) as K[]).filter(k => values.includes(k));
const oneOf = <K extends string>(labels: Record<K, string>, value: string | null) =>
  value !== null && Object.prototype.hasOwnProperty.call(labels, value) ? (value as K) : null;

/** Construye el modelo desde effectiveAnswers(PERSONAS_FLOW, respuestas): lo que dejó de aplicar ya no está. */
export function readPersonasAnswers(a: Answers): PersonasAnswersModel {
  const uso = oneOf(PERSONAS_LABELS.uso, str(a, "uso"));
  const mostrar = inOrder(PERSONAS_LABELS.mostrar, list(a, "mostrar"));
  const ocupacion = uso && uso !== "personal" ? str(a, "ocupacion")?.trim().slice(0, OCUPACION_MAX) || null : null;
  const muestraContenido = mostrar.includes("trabajos") || mostrar.includes("catalogo");
  const contenidoDonde = muestraContenido ? oneOf(PERSONAS_LABELS.contenidoDonde, str(a, "contenidoDonde")) : null;
  const rawCantidad = typeof a.cantidad === "number" ? a.cantidad : null;
  const cantidad = rawCantidad !== null && Number.isInteger(rawCantidad) && rawCantidad >= CANTIDAD_MIN && rawCantidad <= CANTIDAD_MAX ? rawCantidad : null;

  const notices: PersonasNotice[] = [];
  if (contenidoDonde === "none")
    notices.push({ id: "content-not-online", text: "Tus trabajos o tu catálogo deben estar publicados en internet antes de activar ese enlace: SmartNFC lo enlaza, no lo aloja." });

  return {
    uso, usoLabel: uso ? PERSONAS_LABELS.uso[uso] : null,
    ocupacion,
    mostrar,
    primaryAction: DIRECT_ACTIONS.find(x => mostrar.includes(x)) ?? null,
    redes: mostrar.includes("redes") ? inOrder(PERSONAS_LABELS.redes, list(a, "redes")) : [],
    contenidoDonde,
    estilo: oneOf(PERSONAS_LABELS.estilo, str(a, "estilo")),
    color: oneOf(PERSONAS_LABELS.color, str(a, "color")),
    cantidad,
    cotizacionVolumen: a.cantidad === CANTIDAD_COTIZACION,
    notices,
  };
}

/** Identidad de ejemplo de la vista previa: nombre ficticio del segmento y cargo de P1a (o el de ejemplo). */
export function exampleIdentity(model: PersonasAnswersModel): { name: string; role: string | null } {
  const example = PERSONAS_EXAMPLES[model.uso ?? "personal"];
  return { name: example.name, role: model.ocupacion ?? example.role };
}

/** Formato y color del perfil; mientras no se responda P3/P3a se usan los valores por defecto. */
export function profileStyle(model: PersonasAnswersModel): { template: NormalizedTemplate; themeColor: string } {
  return { template: ESTILO_TEMPLATE[model.estilo ?? DEFAULT_ESTILO], themeColor: COLOR_HEX[model.color ?? DEFAULT_COLOR] };
}
