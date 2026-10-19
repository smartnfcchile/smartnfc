// Aviso de privacidad común de las solicitudes comerciales de SmartNFC (Locales, Personas y Empresas).
// Decisiones del responsable entregadas el 19-10-2026. TEXTO PENDIENTE DE VALIDACIÓN LEGAL: no ha sido aprobado por
// un abogado y no debe presentarse como tal. No incluye certificaciones ni autorizaciones que no estén verificadas.
// Regla: no afirmar que SmartNFC no conserva datos; las conversaciones de WhatsApp sí se conservan.
import { SALES_WHATSAPP_DIGITS } from "../locales/contact";

export const PRIVACY_PATH = "/privacidad";

export const PRIVACY_CONTROLLER = {
  legalName: "SmartNFC SpA",
  rut: "78.502.112-6",
  address: "Santa Beatriz 170, oficina 903, piso 9, Providencia, Santiago, Chile",
  email: "contacto@smartnfc.cl",
  whatsappDisplay: "+56 9 4489 1518",
  whatsappDigits: SALES_WHATSAPP_DIGITS,
} as const;

export const PRIVACY_NOTICE = {
  version: "v1-2026-10-19",
  versionLabel: "Versión 1 · 19 de octubre de 2026",
  status: "Texto pendiente de validación legal.",
  retentionMonths: 6,
} as const;

/** Etiqueta corta para el pie de los mensajes de solicitud: permite saber qué versión del aviso se aceptó. */
export const PRIVACY_MESSAGE_TAG = `Aviso de privacidad ${PRIVACY_NOTICE.version}`;

/** Advertencias comunes que acompañan a las casillas de consentimiento. */
export const PRIVACY_SENSITIVE_WARNING = "No incluyas datos sensibles, como información de salud, creencias o datos financieros.";
export const PRIVACY_MINORS_NOTE = "Si eres menor de 18 años, la solicitud debe hacerla tu madre, padre o representante legal.";

/** Línea común que separa lo que hace la página de lo que recibe SmartNFC por WhatsApp. */
export const PRIVACY_PAGE_VS_WHATSAPP =
  "Esta página no guarda tus respuestas: el mensaje se arma en tu navegador y puedes revisarlo antes de enviarlo. " +
  "Si lo envías, SmartNFC recibe en su WhatsApp tu número, tu nombre de perfil de WhatsApp y el contenido del mensaje, y lo conserva según el aviso de privacidad.";

export type PrivacySection = { id: string; title: string; paragraphs?: readonly string[]; items?: readonly string[] };

const C = PRIVACY_CONTROLLER;

export const PRIVACY_SECTIONS: readonly PrivacySection[] = [
  {
    id: "responsable", title: "1. Responsable del tratamiento",
    items: [
      `Razón social: ${C.legalName}.`,
      `RUT: ${C.rut}.`,
      `Domicilio: ${C.address}.`,
      `Correo de contacto y privacidad: ${C.email}.`,
      `WhatsApp comercial: ${C.whatsappDisplay}.`,
    ],
  },
  {
    id: "alcance", title: "2. A qué se aplica este aviso",
    paragraphs: [
      "A las solicitudes comerciales que preparas en las páginas de SmartNFC Locales, SmartNFC Personas y SmartNFC Empresas y que decides enviar por WhatsApp.",
      "El uso del panel de SmartNFC y de los perfiles digitales de clientes se rige por sus propias condiciones.",
    ],
  },
  {
    id: "configurador", title: "3. Lo que ocurre en la página",
    paragraphs: [
      "Las respuestas del configurador existen solo en tu navegador mientras usas la página: no se envían a servidores de SmartNFC, no se guardan en cookies ni en el almacenamiento del navegador y se pierden al recargar o cerrar la página.",
      "La dirección de la página solo indica el paso en que estás, nunca tus respuestas. Estas páginas no usan cookies de seguimiento ni herramientas de analítica.",
    ],
  },
  {
    id: "datos", title: "4. Datos que recibimos si envías la solicitud",
    paragraphs: ["Solo si abres WhatsApp y envías el mensaje, SmartNFC recibe:"],
    items: [
      "Tu número de teléfono y, según tu configuración de WhatsApp, tu nombre y foto de perfil.",
      "Los datos opcionales que escribiste, como tu nombre, el nombre de tu negocio o empresa y tu ciudad.",
      "El resumen de tu configuración: lo que elegiste, cantidades y precios de referencia.",
      "Cualquier texto que agregues o cambies en WhatsApp antes de enviarlo.",
    ],
  },
  {
    id: "finalidad", title: "5. Para qué los usamos",
    paragraphs: [
      "Exclusivamente para responder tu solicitud y, si decides contratar, gestionar esa contratación: confirmar el diseño, tus datos, el despacho y el pago.",
      "No incorporamos tus datos automáticamente a sistemas de gestión de clientes, listas de difusión ni campañas. No los usamos para publicidad sin una autorización tuya distinta e independiente de esta solicitud.",
      "Enviar una solicitud no es una compra ni una contratación confirmada.",
    ],
  },
  {
    id: "base", title: "6. Base del tratamiento",
    paragraphs: ["Tu solicitud y tu aceptación expresa de este aviso, que marcas antes de preparar el mensaje. La casilla nunca viene marcada."],
  },
  {
    id: "conservacion", title: "7. Dónde y por cuánto tiempo se conservan",
    paragraphs: [
      `Los mensajes se conservan en la cuenta de WhatsApp del número comercial ${C.whatsappDisplay}, a la que accede exclusivamente su titular.`,
      `Si la solicitud no termina en una contratación, conservamos la conversación hasta ${PRIVACY_NOTICE.retentionMonths} meses desde el último contacto y luego la eliminamos. Si contratas, los datos necesarios pasan a la gestión de tu pedido y de tu cuenta.`,
    ],
  },
  {
    id: "terceros", title: "8. Proveedores externos y transferencias internacionales",
    items: [
      "WhatsApp, servicio de Meta Platforms: transmite y almacena el mensaje según sus propias condiciones. El texto del mensaje viaja en el enlace que abre WhatsApp y puede quedar en el historial de tu navegador.",
      "Vercel: aloja estas páginas y registra datos técnicos de cada visita, como dirección IP, navegador y página visitada. Esos registros no contienen tus respuestas.",
      "Ambos proveedores pueden tratar datos fuera de Chile.",
    ],
  },
  {
    id: "derechos", title: "9. Tus derechos",
    paragraphs: [
      `Puedes pedir acceso, rectificación, supresión u oposición respecto de tus datos, y los demás derechos que reconozca la ley aplicable, escribiendo a ${C.email} o por el mismo WhatsApp comercial. Indica el número desde el que enviaste la solicitud para poder ubicarla.`,
    ],
  },
  {
    id: "sensibles", title: "10. Datos sensibles y menores de edad",
    paragraphs: [
      "No incluyas datos sensibles en la solicitud, como información de salud, creencias, datos financieros u otros que no sean necesarios para cotizar.",
      "Las solicitudes de personas menores de 18 años deben hacerlas su madre, padre o representante legal.",
    ],
  },
  {
    id: "cambios", title: "11. Cambios a este aviso",
    paragraphs: ["Publicaremos en esta página cualquier cambio, con su fecha y número de versión. Cada mensaje de solicitud indica la versión del aviso vigente al prepararlo."],
  },
];
