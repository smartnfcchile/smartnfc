import { cleanVcfPhone, sanitizeVcfText, vcfFilename } from "../vcf";

export type ProfileVcardInput = {
  name: string; profileName: string | null; companyName: string | null;
  role: string | null; phone: string | null; email: string | null;
};

function fold(line: string): string {
  const parts: string[] = [];
  let current = "", bytes = 0;
  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    if (bytes + size > (parts.length ? 74 : 75)) {
      parts.push(current); current = ""; bytes = 0;
    }
    current += char; bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildProfileVcard(card: ProfileVcardInput): string {
  const name = sanitizeVcfText(card.profileName || card.name) || "Contacto";
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:;${name};;;`, `FN:${name}`];
  const org = sanitizeVcfText(card.companyName);
  const title = sanitizeVcfText(card.role);
  const phone = cleanVcfPhone(card.phone);
  const email = sanitizeVcfText(card.email);
  if (org) lines.push(`ORG:${org}`);
  if (title) lines.push(`TITLE:${title}`);
  if (phone && /\d/.test(phone)) lines.push(`TEL;TYPE=CELL,VOICE:${phone}`);
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${email}`);
  lines.push("END:VCARD");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function profileVcardResponse(card: ProfileVcardInput): Response {
  return new Response(buildProfileVcard(card), { headers: {
    "Content-Type": "text/vcard; charset=utf-8",
    "Content-Disposition": `attachment; filename="${vcfFilename(card.profileName || card.name)}"`,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  } });
}
