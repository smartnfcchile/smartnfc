// Contenido de la portada (/): puerta de entrada a las tres soluciones comerciales de SmartNFC.
// Imágenes: solo recursos ya aprobados de cada landing (Personas, Locales y Empresas). Sin métricas, testimonios
// ni funciones no habilitadas (D6: sin captura de prospectos ni CRM; D16: Empresas cierra con solicitud).
import { SALES_WHATSAPP_DIGITS } from "./locales/contact";

export const HOME_SOLUTIONS = [
  { id: "personas", label: "Personas", title: "Tu identidad digital, siempre contigo.",
    text: "Para profesionales, emprendedores y oficios: una tarjeta NFC que abre tu perfil con tu WhatsApp, redes y trabajos.",
    href: "/personas", cta: "Descubrir Personas",
    image: { src: "/images/personas/persona-emprende.webp", width: 1200, height: 900 } },
  { id: "locales", label: "Locales", title: "Convierte cada visita en una oportunidad.",
    text: "Para negocios con atención presencial: puntos NFC y QR que llevan a tus clientes a reseñas, redes, WhatsApp o tu carta.",
    href: "/local", cta: "Descubrir Locales",
    image: { src: "/images/locales/escena-sakura-mesas.webp", width: 1600, height: 900 } },
  { id: "empresas", label: "Empresas", title: "Todo tu equipo, conectado.",
    text: "Para organizaciones: los perfiles y las tarjetas de todo el equipo, administrados desde un solo panel.",
    href: "/empresas", cta: "Descubrir Empresas",
    image: { src: "/images/empresas/empresa-hero.webp", width: 1600, height: 900 } },
] as const;

export const HOME_STEPS = [
  { t: "Elige tu solución", d: "Personas, Locales o Empresas: cada una tiene su propio recorrido y sus precios publicados." },
  { t: "Configúrala en minutos", d: "Respondes unas preguntas, ves cómo quedaría y envías tu solicitud por WhatsApp." },
  { t: "Conecta con un toque", d: "Al acercar la tarjeta o el punto al teléfono, o con su código QR, se abre la página: sin aplicaciones." },
] as const;

export const HOME_FAQ: readonly [string, string][] = [
  ["¿Qué es SmartNFC?", "Tarjetas y puntos con NFC y código QR que abren una página digital: el perfil de una persona, las acciones de un local o los perfiles de un equipo."],
  ["¿Se necesita una aplicación?", "No. La página se abre en el navegador del teléfono: por NFC en equipos compatibles y por código QR en el resto."],
  ["¿Funciona con iPhone y Android?", "Sí. La mayoría de los teléfonos con NFC la abren al acercarlos; si no tienen NFC o está desactivado, basta escanear el QR."],
  ["¿Qué solución me conviene?", "Personas si compartes tu propio contacto; Locales si atiendes clientes en un espacio físico; Empresas si administras los perfiles de un equipo."],
  ["¿Puedo cambiar la información después?", "Sí. Los datos se actualizan en la página digital y la tarjeta o el punto físico siguen siendo los mismos."],
  ["¿Cómo se paga?", "Depende de la solución: las tarjetas y soportes físicos son pago único; las plataformas de Locales y Empresas, una suscripción mensual. Cada landing muestra sus precios."],
];

export const HOME_WHATSAPP = `https://wa.me/${SALES_WHATSAPP_DIGITS}?text=${encodeURIComponent("Hola, quiero saber qué solución de SmartNFC me conviene.")}`;
