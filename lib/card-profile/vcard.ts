// vCard del perfil público («Guardar contacto»).
// P0 Personas:
// - La organización (ORG) sale solo del campo «Empresa (opcional)» del perfil. Si está vacío, la línea ORG se
//   omite: el nombre interno de la cuenta no se publica como organización de una persona.
// - Cada valor se escapa con sanitizeVcfText (lib/vcf.ts, RFC 2426): \ , ; se escapan y los saltos de línea se
//   neutralizan, de modo que un dato del perfil no puede romper ni inyectar líneas en la vCard.
// El resto del formato (líneas, orden, separador \n, teléfono tal como se escribió) se conserva igual que antes.
import { sanitizeVcfText } from "../vcf";

export type ProfileVcardInput = {
  name: string;
  profileName: string | null;
  companyName: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
  /** Si el propietario desmarcó «Mostrar», el dato no se incluye aunque llegue (defensa en profundidad, BUG-E2E-2). */
  showPhone?: boolean;
  showEmail?: boolean;
};

export function buildProfileVcard(card: ProfileVcardInput): string {
  const org = sanitizeVcfText(card.companyName);
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${sanitizeVcfText(card.profileName ?? card.name)}`,
    ...(org ? [`ORG:${org}`] : []),
    `TITLE:${sanitizeVcfText(card.role)}`,
    `TEL:${sanitizeVcfText(card.showPhone === false ? null : card.phone)}`,
    `EMAIL:${sanitizeVcfText(card.showEmail === false ? null : card.email)}`,
    "END:VCARD",
  ];
  return lines.join("\n");
}
