// Mensaje de la solicitud "Solicitar mi propuesta" (F3). Se arma en el navegador con lo que la persona ve
// en su propuesta y los datos opcionales que escribió. Nada se envía ni se guarda en servidores de SmartNFC:
// el único destino es el enlace de WhatsApp que la persona decide abrir.
import { LOCALES_LABELS } from "../../content/flows/locales";
import { SALES_WHATSAPP_DIGITS } from "../../content/locales/contact";
import { PRIVACY_MESSAGE_TAG } from "../../content/legal/privacy";
import { formatCLP } from "../commercial/public-offers";
import { SUPPORT_LABELS, type LocalesProposal, type SupportSelection } from "./proposal";
import type { LocalesQuote } from "./quote";

export const REQUEST_REF = "LOCAL-F3";
export const REQUEST_FIELD_MAX = 60;
export const REQUEST_MESSAGE_MAX = 1500;

export type RequestExtras = { businessName?: string; city?: string };

/** Texto libre seguro para el mensaje: una línea, sin caracteres de control, espacios colapsados y largo máximo. */
export function sanitizeField(value: string | undefined, max = REQUEST_FIELD_MAX): string {
  return (value ?? "").replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max).trim();
}

export function buildRequestMessage(proposal: LocalesProposal, selection: SupportSelection, quote: LocalesQuote, extras: RequestExtras = {}): string {
  const business = sanitizeField(extras.businessName);
  const city = sanitizeField(extras.city);
  const lines: string[] = ["Hola, quiero solicitar mi propuesta de SmartNFC Locales.", ""];
  if (business) lines.push(`Negocio: ${business}`);
  if (city) lines.push(`Ciudad: ${city}`);
  if (proposal.rubroLabel) lines.push(`Rubro: ${proposal.rubroLabel}${proposal.otherDescription ? ` (${sanitizeField(proposal.otherDescription)})` : ""}`);
  if (proposal.locations) lines.push(`Locales: ${LOCALES_LABELS.locales[proposal.locations]}`);
  if (proposal.objectives.length) lines.push(`Objetivos: ${proposal.objectives.map(o => LOCALES_LABELS.objetivos[o]).join(", ")}`);
  if (proposal.actions.length) lines.push(`Acciones: ${proposal.actions.map(a => a.label).join(", ")}`);
  if (proposal.points.length) {
    const points = proposal.points.map(p => `${p.label} ×${p.quantity} (${selection[p.location] ? SUPPORT_LABELS[selection[p.location]!] : "tamaño por definir"})`);
    lines.push(`Puntos (${proposal.totalPoints}): ${points.join("; ")}`);
  }
  lines.push("");
  const s = quote.supports;
  if (s.lines.length) {
    lines.push(`Soportes, pago único${quote.referenceLocation ? " (un local de referencia)" : ""}: ${s.lines.map(l => `${l.quantity} × ${l.name}`).join(", ")} = ${formatCLP(s.totalClp)} ${quote.taxNote}`);
    if (s.savingsClp > 0) lines.push(`Ahorro por packs Mini: ${formatCLP(s.savingsClp)}`);
  }
  const l = quote.license;
  if (l.kind === "monthly" && l.monthlyClp !== null) lines.push(`Licencia ${l.name}: ${formatCLP(l.monthlyClp)}/mes ${quote.taxNote}`);
  else {
    const why = [l.quoteReasons.includes("points") ? `más de ${l.pointLimit} puntos` : null, l.quoteReasons.includes("multi-location") ? "varios locales" : null].filter(Boolean).join(" y ");
    lines.push(`Licencia ${l.name}: cotización personalizada (${why})`);
  }
  lines.push("Instalación: por cotizar. Despacho: según destino.");
  const pending = [
    proposal.notices.some(n => n.id === "menu-not-published") ? "carta por publicar" : null,
    proposal.notices.some(n => n.id === "google-profile") ? "perfil de Google por crear o verificar" : null,
  ].filter(Boolean);
  if (pending.length) lines.push(`Pendiente: ${pending.join("; ")}`);
  lines.push("", `Ref: ${REQUEST_REF} · ${PRIVACY_MESSAGE_TAG}`);
  const message = lines.join("\n");
  return message.length > REQUEST_MESSAGE_MAX ? message.slice(0, REQUEST_MESSAGE_MAX - 1) + "…" : message;
}

/** Enlace de WhatsApp al número comercial verificado del sitio. */
export function whatsappRequestUrl(message: string): string {
  return `https://wa.me/${SALES_WHATSAPP_DIGITS}?text=${encodeURIComponent(message)}`;
}
