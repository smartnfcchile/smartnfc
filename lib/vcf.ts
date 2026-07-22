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
