// Registro de imágenes de SmartNFC Empresas. Regla: toda imagen se genera y aprueba exclusivamente en ChatGPT; no se
// usan bancos de imágenes ni imágenes generadas por Claude. Mientras un espacio no tenga archivo aprobado (null), la
// página muestra un marcador neutro identificado con el nombre, la medida y el peso máximo del archivo esperado.
export type EmpresasAsset = { src: string; alt: string; width: number; height: number; caption?: "Imagen ilustrativa" } | null;

export type EmpresasSlot = {
  file: string;
  width: number;
  height: number;
  maxKb: number;
  /** Descripción para generar la imagen en ChatGPT (sin textos, logos ni QR generados). */
  brief: string;
  asset: EmpresasAsset;
};

export const EMPRESAS_SLOTS: Record<"hero" | "problema" | "equipo" | "og", EmpresasSlot> = {
  hero: {
    file: "empresa-hero.webp", width: 1600, height: 900, maxKb: 250, asset: null,
    brief: "Oficina corporativa luminosa. Una profesional acerca una tarjeta NFC negra lisa (solo el símbolo NFC) al teléfono de un cliente; al fondo, dos colegas. Rostros no protagonistas o de perfil, sin textos, logos ni pantallas legibles.",
  },
  problema: {
    file: "empresa-tarjetas-papel.webp", width: 1200, height: 900, maxKb: 150, asset: null,
    brief: "Primer plano de tarjetas de presentación de papel apiladas sobre un escritorio, algunas corregidas a mano con lápiz y otras dobladas. Sin texto legible ni nombres reales.",
  },
  equipo: {
    file: "empresa-tarjetas-equipo.webp", width: 1200, height: 900, maxKb: 150, asset: null,
    brief: "Varias tarjetas NFC negras iguales alineadas sobre una mesa de reuniones, una por persona, junto a un notebook cerrado. Sin nombres, textos, logos ni QR.",
  },
  og: {
    file: "empresa-og.jpg", width: 1200, height: 630, maxKb: 300, asset: null,
    brief: "Composición horizontal: tarjetas NFC negras de un equipo y un teléfono que muestra un perfil genérico sin texto legible. Espacio limpio a la izquierda. Sin logos ni textos generados.",
  },
};
