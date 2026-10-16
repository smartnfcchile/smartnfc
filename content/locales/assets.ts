// Registro de imágenes de SmartNFC Locales (F4). Biblioteca visual original de SmartNFC (Sakura).
// Archivos en /public/images/locales/, convertidos y optimizados a WebP sin deformar (solo recorte y escala proporcional).
// - Soportes: acrílicos de sobremesa con base en T, fondo transparente, sin pernos, embellecedores ni distanciadores.
//   La interfaz los dibuja a escala por su alto real (15, 20 y 30 cm) respetando la proporción de cada archivo.
// - Escenas: Sakura Sushi Bar es una marca FICTICIA de demostración. Se muestran siempre con la leyenda
//   «Imagen ilustrativa»; nunca como instalación real, cliente ni testimonio.
// - Rubros sin imagen aprobada quedan en null y conservan la ilustración CSS.
import type { Rubro, SupportSize } from "../../lib/locales/proposal";

export type LocalesAsset = {
  src: string;
  /** Texto alternativo. Vacío cuando la imagen es decorativa (el texto visible ya la describe). */
  alt: string;
  width: number;
  height: number;
  /** Leyenda visible obligatoria para imágenes que no muestran una instalación real. */
  caption?: "Imagen ilustrativa";
} | null;

export const SUPPORT_ASSETS: Record<SupportSize, LocalesAsset> = {
  LOCAL_MINI: { src: "/images/locales/soporte-mini.webp", alt: "", width: 401, height: 538 },
  LOCAL_STANDARD: { src: "/images/locales/soporte-standard.webp", alt: "", width: 626, height: 800 },
  LOCAL_XL: { src: "/images/locales/soporte-xl.webp", alt: "", width: 582, height: 800 },
};

const SCENE_TABLES: LocalesAsset = {
  src: "/images/locales/escena-sakura-mesas.webp", width: 1600, height: 900, caption: "Imagen ilustrativa",
  alt: "Comedor de un restaurante de ejemplo con mesas de madera y vista a un lago",
};
const SCENE_COUNTER: LocalesAsset = {
  src: "/images/locales/escena-sakura-meson.webp", width: 1600, height: 900, caption: "Imagen ilustrativa",
  alt: "Barra de un restaurante de ejemplo con taburetes de madera",
};

export const SCENE_ASSETS: Record<Rubro, LocalesAsset> = {
  cafe: SCENE_TABLES, bar: SCENE_COUNTER,
  gym: null, beauty: null, clinic: null, store: null, lodging: null, other: null,
};
