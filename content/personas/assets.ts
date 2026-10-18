// Registro de imágenes de SmartNFC Personas (P4).
// Regla (17-10-2026): toda imagen nueva de Personas se genera y aprueba exclusivamente en ChatGPT. No se usan otros
// generadores, bancos de imágenes ni fotografías creadas por Claude. Cada espacio queda en null hasta recibir el
// archivo aprobado; con null, la página se ve igual que antes (el espacio no se dibuja).
// Archivos en /public/images/personas/, convertidos a WebP sin deformar (solo escala proporcional y recorte acordado).
// Las escenas con personas son ilustrativas: se muestran con la leyenda «Imagen ilustrativa», nunca como cliente,
// testimonio ni caso real.
import type { Uso } from "../../lib/personas/answers";

export type PersonasAsset = {
  src: string;
  /** Texto alternativo. Vacío solo si la imagen es decorativa y el texto visible ya la describe. */
  alt: string;
  width: number;
  height: number;
  /** Leyenda visible obligatoria para escenas que no muestran una situación real. */
  caption?: "Imagen ilustrativa";
  /**
   * "contain": la foto se muestra completa dentro del contenedor (sin recortar), sobre un fondo crema del diseño.
   * Se usa cuando la proporción del original no coincide con la del espacio y el recorte no está autorizado.
   */
  fit?: "contain";
} | null;

/** Hero aprobado (18-10-2026): tarjeta y teléfono en escritorio cálido. 1600 × 900 (16:9), recorte de bordes de fondo. */
export const PERSONAS_HERO: NonNullable<PersonasAsset> = {
  src: "/images/personas/persona-hero.webp", width: 1600, height: 900, caption: "Imagen ilustrativa",
  alt: "Tarjeta SmartNFC negra junto a un teléfono que muestra un perfil digital",
};

/**
 * «Para quién es»: una escena por segmento, en el orden de la sección. Contenedor 4:3.
 * - emprende: 1200 × 900, sin recorte. profesional: 1200 × 900, recorte lateral del 11 % autorizado (18-10-2026).
 * - personal y oficio: originales 16:9 completos (1200 × 675) mostrados con fit "contain"; recorte del 25 % no autorizado.
 */
export const PERSONAS_SEGMENT_ASSETS: Record<Uso, PersonasAsset> = {
  personal: {
    src: "/images/personas/persona-uso-personal.webp", width: 1200, height: 675, caption: "Imagen ilustrativa", fit: "contain",
    alt: "En una cafetería, una persona comparte su contacto acercando su tarjeta SmartNFC al teléfono de un amigo",
  },
  oficio: {
    src: "/images/personas/persona-oficio.webp", width: 1200, height: 675, caption: "Imagen ilustrativa", fit: "contain",
    alt: "En su taller, un soldador acerca su tarjeta SmartNFC al teléfono de un cliente",
  },
  emprende: {
    src: "/images/personas/persona-emprende.webp", width: 1200, height: 900, caption: "Imagen ilustrativa",
    alt: "Emprendedora en su puesto de artesanías comparte su tarjeta SmartNFC con una clienta",
  },
  profesional: {
    src: "/images/personas/persona-profesional.webp", width: 1200, height: 900, caption: "Imagen ilustrativa",
    alt: "En un estudio de arquitectura, un profesional comparte su contacto con una tarjeta SmartNFC",
  },
};

/** «Precio y condiciones»: la tarjeta física por ambos lados. 1600 × 1200 (4:3). Archivo esperado: persona-tarjeta.webp. */
export const PERSONAS_PRODUCT_ASSET: PersonasAsset = {
  src: "/images/personas/persona-tarjeta.webp", width: 1600, height: 1200, caption: "Imagen ilustrativa",
  alt: "Dos tarjetas SmartNFC negras con el símbolo NFC sobre un escritorio de madera",
};

/** Imagen para compartir el enlace (WhatsApp, redes): 1200 × 630, JPG. Archivo esperado: persona-og.jpg. */
export const PERSONAS_OG_ASSET: { src: string; width: 1200; height: 630; alt: string } | null = {
  src: "/images/personas/persona-og.jpg", width: 1200, height: 630,
  alt: "SmartNFC Personas: tarjeta NFC que abre tu perfil digital",
};
