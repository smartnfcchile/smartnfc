// Mensaje de «Solicitar propuesta» de SmartNFC Empresas. Se arma en el navegador con la configuración y los datos
// opcionales que escribió la persona. Nada se envía ni se guarda en servidores de SmartNFC: el único destino es el
// enlace de WhatsApp que la persona decide abrir. Reutiliza la limpieza de texto y el número comercial de Locales.
import { EMPRESAS_LABELS } from "../../content/flows/empresas";
import { PRIVACY_MESSAGE_TAG } from "../../content/legal/privacy";
import { formatCLP } from "../commercial/public-offers";
import { sanitizeField, whatsappRequestUrl } from "../locales/request-message";
import type { EmpresasAnswersModel } from "./answers";
import type { EmpresasConditions, EmpresasQuote } from "./quote";

export { whatsappRequestUrl };
export const EMPRESAS_REQUEST_REF = "EMPRESAS-E1";
export const EMPRESAS_FIELD_MAX = 60;
export const EMPRESAS_MESSAGE_MAX = 1200;

export type EmpresasRequestExtras = { company?: string; city?: string };

export function buildEmpresasRequestMessage(model: EmpresasAnswersModel, quote: EmpresasQuote, conditions: EmpresasConditions, extras: EmpresasRequestExtras = {}): string {
  const company = sanitizeField(extras.company, EMPRESAS_FIELD_MAX);
  const city = sanitizeField(extras.city, EMPRESAS_FIELD_MAX);
  const lines: string[] = ["Hola, quiero una propuesta de SmartNFC Empresas para mi equipo.", ""];
  if (company) lines.push(`Empresa: ${company}`);
  if (city) lines.push(`Ciudad: ${city}`);
  if (model.cotizacionPersonas) lines.push("Personas con perfil: más de 25");
  else if (model.personas !== null) lines.push(`Personas con perfil: ${model.personas}`);
  if (model.administra) lines.push(`Administración: ${EMPRESAS_LABELS.administra[model.administra]}`);
  if (model.control) lines.push(`Edición de perfiles: ${EMPRESAS_LABELS.control[model.control]}`);
  if (model.rotacion) lines.push(`Cambios en el equipo: ${EMPRESAS_LABELS.rotacion[model.rotacion]}`);
  lines.push("");
  const p = quote.plan;
  if (p.kind === "plan") lines.push(`Plan: ${p.name} (hasta ${p.identities} personas): ${formatCLP(p.monthlyClp)}/mes ${conditions.taxNote}`);
  else if (p.kind === "quote") lines.push(`Plan: ${p.name}, cotización`);
  const c = quote.cards;
  if (c.kind === "priced") lines.push(`Tarjetas: ${c.quantity} × ${formatCLP(c.unitClp)} = ${formatCLP(c.totalClp)} ${conditions.taxNote}, pago único`);
  else if (c.kind === "none") lines.push("Tarjetas: por ahora ninguna");
  else if (c.kind === "quote") lines.push("Tarjetas: por cotizar");
  lines.push("Despacho: según destino, por confirmar.");
  lines.push("Entiendo que es una solicitud, no una contratación.");
  lines.push("", `Ref: ${EMPRESAS_REQUEST_REF} · ${PRIVACY_MESSAGE_TAG}`);
  const message = lines.join("\n");
  return message.length > EMPRESAS_MESSAGE_MAX ? message.slice(0, EMPRESAS_MESSAGE_MAX - 1) + "…" : message;
}
