/**
 * Helper para generación de archivos vCard (VCF) sanitizados para prevenir CRLF e inyecciones de campos.
 */

/**
 * Sanitiza valores de texto para vCard 3.0 según la RFC 2426.
 * Escapa:
 * - Backslash \ -> \\
 * - Comma , -> \,
 * - Semicolon ; -> \;
 * Reemplaza saltos de línea \r y \n por espacios para evitar inyecciones CRLF.
 */
export function sanitizeVcfText(val: string | null | undefined): string {
  if (!val) return "";
  // 1. Eliminar o neutralizar saltos de línea para prevenir inyecciones de cabeceras/propiedades
  let clean = val.replace(/[\r\n]+/g, " ");
  // 2. Escapar caracteres reservador de vCard
  clean = clean
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
  return clean.trim();
}

/**
 * Normaliza y limpia el número telefónico para uso en el VCF.
 * Asegura formato E.164 o numérico limpio.
 */
export function cleanVcfPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  const cleanedDigits = trimmed.replace(/\D/g, "");
  const hasPlus = trimmed.startsWith("+") || trimmed.includes("+");
  return (hasPlus ? "+" : "") + cleanedDigits;
}

/**
 * Genera un contacto vCard individual en vCard 3.0 con CRLF.
 */
export function generateSingleVcfString(params: {
  fullName: string;
  orgName?: string;
  phone?: string;
  address?: string;
  url?: string;
}): string {
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];

  const cleanName = sanitizeVcfText(params.fullName);
  lines.push(`FN:${cleanName}`);

  if (params.orgName) {
    const cleanOrg = sanitizeVcfText(params.orgName);
    lines.push(`ORG:${cleanOrg}`);
  }

  if (params.phone) {
    const cleanPhone = cleanVcfPhone(params.phone);
    if (cleanPhone) {
      lines.push(`TEL;TYPE=CELL,VOICE:${cleanPhone}`);
    }
  }

  if (params.address) {
    const cleanAddress = sanitizeVcfText(params.address);
    lines.push(`ADR;TYPE=WORK:;;${cleanAddress};;;;`);
  }

  if (params.url) {
    const cleanUrl = sanitizeVcfText(params.url);
    lines.push(`URL:${cleanUrl}`);
  }

  lines.push("END:VCARD");

  // La especificación exige retornos de línea CRLF (\r\n) y línea vacía final
  return lines.join("\r\n") + "\r\n";
}

/**
 * Genera una lista consolidada de vCards con CRLF.
 */
export function generateMultiVcfString(contacts: Array<{
  fullName: string;
  orgName?: string;
  phone?: string;
  address?: string;
  url?: string;
}>): string {
  return contacts.map(c => generateSingleVcfString(c)).join("");
}

/**
 * Pliega una línea de vCard a 75 octetos (RFC 2425/6350) sin partir caracteres UTF-8 (tildes, ñ, emojis).
 */
function foldVcfLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "", size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (size + bytes > (parts.length ? 74 : 75)) { parts.push(current); current = ""; size = 0; }
    current += char; size += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}
/** URI en una vCard: sin saltos de línea (los URLs ya llegan validados como https públicos). */
const vcfUri = (value: string) => value.replace(/[\r\n]+/g, "").trim();

/**
 * vCard 3.0 de un negocio (p. ej. el Local de SmartNFC): nombre comercial como organización, teléfonos con etiqueta
 * (WhatsApp), correos, URLs con etiqueta (sitio web, redes, ubicación), dirección y descripción. UTF-8 y CRLF.
 * Las etiquetas `itemN.X-ABLabel` las entienden iOS/macOS; otros clientes las ignoran sin perder el dato.
 */
export function generateBusinessVcf(card: {
  name: string; note?: string | null; address?: string | null;
  phones?: Array<{ number: string; label?: string }>; emails?: string[]; urls?: Array<{ url: string; label?: string }>;
}): string {
  const name = sanitizeVcfText(card.name) || "Contacto";
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:${name};;;;`, `FN:${name}`, `ORG:${name}`, "X-ABShowAs:COMPANY"];
  let item = 0;
  for (const phone of card.phones ?? []) {
    const clean = cleanVcfPhone(phone.number);
    if (!clean) continue;
    if (phone.label) { item++; lines.push(`item${item}.TEL;TYPE=CELL:${clean}`, `item${item}.X-ABLabel:${sanitizeVcfText(phone.label)}`); }
    else lines.push(`TEL;TYPE=WORK,VOICE:${clean}`);
  }
  for (const email of card.emails ?? []) { const clean = sanitizeVcfText(email); if (clean) lines.push(`EMAIL;TYPE=INTERNET,WORK:${clean}`); }
  for (const url of card.urls ?? []) {
    const clean = vcfUri(url.url);
    if (!clean) continue;
    if (url.label) { item++; lines.push(`item${item}.URL:${clean}`, `item${item}.X-ABLabel:${sanitizeVcfText(url.label)}`); }
    else lines.push(`URL:${clean}`);
  }
  if (card.address) lines.push(`ADR;TYPE=WORK:;;${sanitizeVcfText(card.address)};;;;`);
  if (card.note) lines.push(`NOTE:${sanitizeVcfText(card.note)}`);
  lines.push("END:VCARD");
  return lines.map(foldVcfLine).join("\r\n") + "\r\n";
}

/** Nombre de archivo .vcf seguro a partir de un nombre visible (sin tildes, espacios ni caracteres especiales). */
export function vcfFilename(name: string): string {
  const slug = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return (slug || "contacto") + ".vcf";
}
