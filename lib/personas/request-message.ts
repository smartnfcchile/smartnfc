// Mensaje de «Solicitar mi tarjeta» (SmartNFC Personas, P3). Se arma en el navegador con la configuración
// y los datos opcionales que escribió la persona. Nada se envía ni se guarda en servidores de SmartNFC:
// el único destino es el enlace de WhatsApp que la persona decide abrir.
// Reutiliza (sin modificar) la limpieza de texto y el número comercial verificado de Locales (F3).
import { PERSONAS_LABELS } from "../../content/flows/personas";
import { formatCLP } from "../commercial/public-offers";
import { sanitizeField, whatsappRequestUrl } from "../locales/request-message";
import type { PersonasAnswersModel } from "./answers";
import type { PersonasConditions, PersonasQuote } from "./quote";

export { whatsappRequestUrl };
export const PERSONAS_REQUEST_REF = "PERSONAS-P3";
export const PERSONAS_FIELD_MAX = 60;
export const PERSONAS_MESSAGE_MAX = 1200;

export type PersonasRequestExtras = { name?: string; city?: string };

/**
 * Solo datos que la persona eligió o escribió: nunca el nombre ni el cargo de ejemplo de la vista previa.
 * Una línea por dato, con texto libre saneado (sin saltos ni caracteres de control).
 */
export function buildPersonasRequestMessage(model: PersonasAnswersModel, quote: PersonasQuote, conditions: PersonasConditions, extras: PersonasRequestExtras = {}): string {
  const name = sanitizeField(extras.name, PERSONAS_FIELD_MAX);
  const city = sanitizeField(extras.city, PERSONAS_FIELD_MAX);
  const lines: string[] = ["Hola, quiero solicitar mi tarjeta SmartNFC Personas.", ""];
  if (name) lines.push(`Nombre: ${name}`);
  if (city) lines.push(`Ciudad: ${city}`);
  if (model.usoLabel) lines.push(`Uso: ${model.usoLabel}`);
  if (model.ocupacion) lines.push(`A qué me dedico: ${sanitizeField(model.ocupacion, PERSONAS_FIELD_MAX)}`);
  if (model.mostrar.length) lines.push(`Mi perfil mostraría: ${model.mostrar.map(m => PERSONAS_LABELS.mostrar[m]).join(", ")}`);
  if (model.redes.length) lines.push(`Redes: ${model.redes.map(r => PERSONAS_LABELS.redes[r]).join(", ")}`);
  if (model.contenidoDonde) lines.push(`Trabajos o catálogo: ${PERSONAS_LABELS.contenidoDonde[model.contenidoDonde]}`);
  if (model.estilo || model.color) {
    lines.push(`Estilo: ${[model.estilo && PERSONAS_LABELS.estilo[model.estilo], model.color && PERSONAS_LABELS.color[model.color]].filter(Boolean).join(" · ")}`);
  }
  lines.push("");
  if (quote.kind === "priced") {
    lines.push(`Tarjetas: ${quote.quantity} × ${formatCLP(quote.unitClp)} = ${formatCLP(quote.totalClp)} ${conditions.taxNote}`);
  } else if (quote.kind === "volume-quote") {
    lines.push("Tarjetas: 50 o más, solicito cotización");
  }
  lines.push("Despacho: según destino, por confirmar.");
  if (model.notices.some(n => n.id === "content-not-online")) lines.push("Pendiente: publicar mis trabajos o catálogo en internet.");
  lines.push("Entiendo que es una solicitud, no una compra confirmada.");
  lines.push("", `Ref: ${PERSONAS_REQUEST_REF}`);
  const message = lines.join("\n");
  return message.length > PERSONAS_MESSAGE_MAX ? message.slice(0, PERSONAS_MESSAGE_MAX - 1) + "…" : message;
}
