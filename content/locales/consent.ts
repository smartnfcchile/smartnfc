// Consentimiento de la solicitud de propuesta de SmartNFC Locales.
// Texto alineado con el aviso común (content/legal/privacy.ts). PENDIENTE DE VALIDACIÓN LEGAL: no ha sido aprobado
// por un abogado. Solo cambian textos y enlaces de privacidad; el flujo comercial de Locales no cambia.
import { PRIVACY_MINORS_NOTE, PRIVACY_NOTICE, PRIVACY_PAGE_VS_WHATSAPP, PRIVACY_SENSITIVE_WARNING } from "../legal/privacy";

export const REQUEST_CONSENT = {
  version: PRIVACY_NOTICE.version,
  label: "Acepto que SmartNFC SpA reciba por WhatsApp, un servicio de Meta, mi número, el resumen de esta propuesta y los datos que ingresé, solo para responder esta solicitud, según el aviso de privacidad.",
  details: `Solicitar una propuesta no es una contratación. ${PRIVACY_PAGE_VS_WHATSAPP} ${PRIVACY_SENSITIVE_WARNING} ${PRIVACY_MINORS_NOTE}`,
  required: "Para preparar el mensaje, marca la casilla de aceptación.",
} as const;
