// Consentimiento de la solicitud de SmartNFC Empresas. Alineado con el aviso común (content/legal/privacy.ts).
// PENDIENTE DE VALIDACIÓN LEGAL: no ha sido aprobado por un abogado.
import { PRIVACY_MINORS_NOTE, PRIVACY_NOTICE, PRIVACY_PAGE_VS_WHATSAPP, PRIVACY_SENSITIVE_WARNING } from "../legal/privacy";

export const EMPRESAS_CONSENT = {
  version: PRIVACY_NOTICE.version,
  label: "Acepto que SmartNFC SpA reciba por WhatsApp, un servicio de Meta, mi número, el resumen de esta configuración y los datos que ingresé, solo para responder esta solicitud, según el aviso de privacidad.",
  details: `${PRIVACY_PAGE_VS_WHATSAPP} No incluyas datos de tus colaboradores. ${PRIVACY_SENSITIVE_WARNING} ${PRIVACY_MINORS_NOTE}`,
  required: "Para preparar el mensaje, marca la casilla de aceptación.",
} as const;

/** Aviso visible: los planes Equipo no se contratan desde la página (D16). */
export const EMPRESAS_NOT_A_PURCHASE = "Es una solicitud, no una contratación: te contactamos para revisar tu equipo, confirmar el plan, las tarjetas y el despacho, y enviarte una propuesta.";
