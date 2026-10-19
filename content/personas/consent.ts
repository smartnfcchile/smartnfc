// Consentimiento de la solicitud «Solicitar mi tarjeta» (SmartNFC Personas).
// Texto alineado con el aviso común (content/legal/privacy.ts). PENDIENTE DE VALIDACIÓN LEGAL: no ha sido aprobado
// por un abogado. No afirma que SmartNFC no conserve datos: separa lo que hace la página de lo que llega por WhatsApp.
import { PRIVACY_MINORS_NOTE, PRIVACY_NOTICE, PRIVACY_PAGE_VS_WHATSAPP, PRIVACY_SENSITIVE_WARNING } from "../legal/privacy";

export const PERSONAS_CONSENT = {
  version: PRIVACY_NOTICE.version,
  label: "Acepto que SmartNFC SpA reciba por WhatsApp, un servicio de Meta, mi número, el resumen de mi configuración y los datos que ingresé, solo para responder esta solicitud, según el aviso de privacidad.",
  details: `${PRIVACY_PAGE_VS_WHATSAPP} ${PRIVACY_SENSITIVE_WARNING} ${PRIVACY_MINORS_NOTE}`,
  required: "Para preparar el mensaje, marca la casilla de aceptación.",
} as const;

/** Aviso visible: la solicitud no es una compra (D15). */
export const PERSONAS_NOT_A_PURCHASE = "Es una solicitud, no una compra confirmada: te contactamos para confirmar el diseño, tus datos, el despacho y el pago.";
