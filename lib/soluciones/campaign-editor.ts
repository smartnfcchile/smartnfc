import type { CampaignBlock, CampaignContent } from "./campaign-content";

export const blockNames = {
  card: "Tarjeta informativa", indicator: "Indicador destacado", "risk-scale": "Escala de riesgo", alert: "Alerta preventiva", "card-group": "Grupo de tarjetas",
  "uv-forecast": "Pronóstico UV",
  video: "Video",
  hero: "Hero", text: "Texto", image: "Imagen", list: "Lista", faq: "Preguntas frecuentes", button: "Botón HTTPS",
} as const;

export function newCampaignBlock(type: CampaignBlock["type"], id: string): CampaignBlock {
  const common = { id, hidden: false };
  switch (type) {
    case "card": case "alert": case "indicator":
      return { ...common, type, title: "Título", text: "Descripción", icon: "info" };
    case "risk-scale":
      return { ...common, type, title: "Escala de riesgo", text: "Escala de referencia", bands: [
        { range: "1", label: "Bajo", tone: "green" }, { range: "2", label: "Alto", tone: "red" },
      ] };
    case "card-group":
      return { ...common, type, title: "Medidas recomendadas", cards: [{ title: "Tarjeta", text: "Descripción", icon: "shield" }] };
    case "hero": return { ...common, type, text: "Título de la campaña" };
    case "text": return { ...common, type, text: "Texto del bloque" };
    case "image": return { ...common, type, src: "", alt: "" };
    case "list": return { ...common, type, items: ["Nuevo elemento"] };
    case "faq": return { ...common, type, items: [{ question: "Nueva pregunta", answer: "Respuesta" }] };
    case "uv-forecast": return { ...common, type, title: "Pronóstico UV del centro", timezone: "America/Santiago" };
    case "video": return { ...common, type, title: "Ver video", href: "", thumbnail: "" };
    case "button": return { ...common, type, text: "Más información", href: "" };
  }
}

export function campaignForSite(content: CampaignContent, siteId: string) {
  const variant = content.variants.find(item => item.siteId === siteId);
  const protectedIds = new Set(content.protectedBlockIds);
  const overrides = new Map(variant?.blocks.filter(block => !protectedIds.has(block.id)).map(block => [block.id, block]));
  return {
    design: { ...content.design, color: variant?.color ?? content.design.color },
    blocks: content.blocks.map(block => overrides.get(block.id) ?? block),
  };
}

export function updateSiteVariant(content: CampaignContent, siteId: string, update: (variant: CampaignContent["variants"][number]) => CampaignContent["variants"][number]): CampaignContent {
  const existing = content.variants.find(variant => variant.siteId === siteId);
  const variant = update(existing ?? { siteId, blocks: [] });
  const keep = variant.blocks.length > 0 || variant.color !== undefined;
  return {
    ...content,
    variants: [...content.variants.filter(item => item.siteId !== siteId), ...(keep ? [variant] : [])],
  };
}

export function removeBlockOverrides(content: CampaignContent, blockId: string): CampaignContent {
  return {
    ...content,
    variants: content.variants.map(variant => ({ ...variant, blocks: variant.blocks.filter(block => block.id !== blockId) }))
      .filter(variant => variant.blocks.length || variant.color !== undefined),
  };
}
