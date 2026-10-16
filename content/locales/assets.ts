// Registro de imágenes de SmartNFC Locales (F3).
// Hoy todas las entradas son null: la interfaz dibuja ilustraciones CSS. Cuando llegue la biblioteca visual
// original de SmartNFC, basta con agregar los archivos en /public/images/locales/ y completar este registro;
// los componentes (SupportToken, LocalVisualMap) ya consumen estas entradas sin cambiar su estructura.
// Biblioteca prevista: imágenes originales de SmartNFC (Sakura).
// Formatos recomendados: soportes 4:5 con fondo transparente (WebP/PNG, ≥ 1200 px de alto); escenas 16:10 (WebP, ≥ 1600 px).
// Los soportes acrílicos se muestran tal como se fabrican: sin embellecedores ni distanciadores decorativos.
import type { Rubro, SupportSize } from "../../lib/locales/proposal";

export type LocalesAsset = { src: string; alt: string; width: number; height: number } | null;

export const SUPPORT_ASSETS: Record<SupportSize, LocalesAsset> = {
  LOCAL_MINI: null,
  LOCAL_STANDARD: null,
  LOCAL_XL: null,
};

export const SCENE_ASSETS: Record<Rubro, LocalesAsset> = {
  cafe: null, bar: null, gym: null, beauty: null, clinic: null, store: null, lodging: null, other: null,
};
