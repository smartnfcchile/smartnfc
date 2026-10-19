// Prestaciones de SmartNFC Empresas que la landing puede mostrar. Cada una está respaldada por una capability del
// plan Equipo (lib/entitlements/catalog.ts) o por una función real del panel, verificada en el código el 19-10-2026.
// Equipo se vende sin CRM ni captura de prospectos (D10, D6): esas capabilities no se mencionan.
import type { Capability } from "../../lib/entitlements/catalog";

export type EmpresasFeature = { source: Capability | "PHYSICAL_DESIGNS"; title: string; text: string; evidence: string };

export const EMPRESAS_FEATURES: readonly EmpresasFeature[] = [
  { source: "TEAM_MANAGEMENT", title: "Altas desde el panel",
    text: "Un administrador invita a cada persona: recibe su acceso y su perfil digital listo para completar.",
    evidence: "app/dashboard/users/actions.ts: createCollaboratorWithCard, resendInvitationFromDashboardAction" },
  { source: "TEAM_MANAGEMENT", title: "Bajas sin tarjetas circulando",
    text: "Si alguien deja el equipo, se suspende su acceso y su perfil y su tarjeta dejan de funcionar.",
    evidence: "app/dashboard/users/actions.ts: suspendCollaboratorUser (Card.isActive=false, PhysicalNfcCard SUSPENDIDA)" },
  { source: "PROFILE_EDIT_POLICY", title: "Imagen corporativa protegida",
    text: "Eliges quién edita: cada persona, la empresa para la imagen y cada persona para sus datos, o solo los administradores.",
    evidence: "lib/profile-edit-policy-shared.ts: FLEXIBLE, CORPORATE, ADMIN_ONLY" },
  { source: "COMPANY_AGGREGATED_ANALYTICS", title: "Métricas del equipo",
    text: "Visitas a los perfiles, lecturas NFC y toques en WhatsApp, llamada, correo, enlaces y «guardar contacto», de todo el equipo.",
    evidence: "app/dashboard/metrics/page.tsx: VIEW, NFC_SCAN, WHATSAPP_CLICK, PHONE_CLICK, EMAIL_CLICK, LINK_CLICK, VCARD_DOWNLOAD" },
  { source: "PHYSICAL_DESIGNS", title: "Diseño de tarjetas",
    text: "Plantillas para tarjetas CR80 con el QR de cada persona, revisión de impresión y solicitud de impresión desde el panel.",
    evidence: "app/dashboard/physical-designs: editor CR80, exportación PNG/SVG/PDF, requestPrintOrderAction" },
  { source: "PROFILE_EDIT", title: "Datos al día sin reimprimir",
    text: "Cambios de cargo, teléfono o enlaces se hacen en el perfil; la tarjeta sigue siendo la misma.",
    evidence: "capability BASE PROFILE_EDIT; la tarjeta abre /c/<slug>, que no cambia al editar" },
];

/** Prestaciones del perfil de cada persona (capabilities BASE). */
export const EMPRESAS_PROFILE_FEATURES = [
  { source: "CONTACT_AND_SOCIAL", label: "Botones de contacto y redes" },
  { source: "CUSTOM_LINKS", label: "Enlaces de la empresa: sitio, catálogo o agenda" },
  { source: "CONTACT_SHARING", label: "Guardar contacto y compartir el perfil" },
  { source: "CARD", label: "Tarjeta física que abre el perfil por NFC o código QR" },
] as const;
