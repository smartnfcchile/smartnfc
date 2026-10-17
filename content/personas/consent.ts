// Consentimiento de la solicitud «Solicitar mi tarjeta» (SmartNFC Personas, P3).
// BORRADOR FUNCIONAL sujeto a revisión legal: no es una política de privacidad ni debe presentarse como tal.
export const PERSONAS_CONSENT = {
  version: "borrador-2026-10-17",
  label: "Acepto que se abra WhatsApp, un servicio de terceros, con un mensaje que incluye el resumen de mi configuración y los datos opcionales que ingresé, para que SmartNFC me contacte por esta solicitud.",
  details: "Podrás revisar el mensaje antes de abrir WhatsApp y decidir si lo envías. Esta página no guarda tus respuestas ni tus datos.",
  required: "Para preparar el mensaje, marca la casilla de aceptación.",
} as const;

/** Aviso visible: la solicitud no es una compra (D15). */
export const PERSONAS_NOT_A_PURCHASE = "Es una solicitud, no una compra confirmada: te contactamos para confirmar el diseño, tus datos, el despacho y el pago.";
