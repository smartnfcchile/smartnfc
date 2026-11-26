import type { CampaignContent } from "./campaign-content";

export const uvImage = "https://www.smartnfc.cl/images/campaigns/uv-aquaculture.webp";
export const uvDemo = {
  schemaVersion: 1,
  design: { name: "SmartNFC · Prevención UV", color: "#075985", font: "system", style: "editorial" },
  variants: [],
  protectedBlockIds: ["hero", "reference"],
  blocks: [
    { id: "hero", hidden: false, type: "hero", text: "El sol también es un riesgo laboral", subtitle: "Protégete hoy. Cuida tu salud mañana" },
    { id: "consult", hidden: false, type: "indicator", title: "Índice UV", text: "Consulta el pronóstico oficial de la Dirección Meteorológica de Chile para tu zona.", icon: "sun",
      action: { label: "Consultar índice UV de mi zona", href: "https://www.meteochile.gob.cl/PortalDMC-web/otros_pronosticos/radiacion_uv.xhtml" } },
    { id: "reference", hidden: false, type: "risk-scale", title: "Escala de radiación UV", text: "Escala informativa. No muestra una medición actual.", bands: [
      { range: "0–2", label: "Bajo", tone: "green" }, { range: "3–5", label: "Moderado", tone: "yellow" },
      { range: "6–7", label: "Alto", tone: "orange" }, { range: "8–10", label: "Muy alto", tone: "red" },
      { range: "11+", label: "Extremo", tone: "violet" },
    ] },
    { id: "aquaculture", hidden: false, type: "image", src: uvImage, alt: "Escena ilustrativa de trabajo en un centro acuícola en la Patagonia chilena" },
    { id: "measures", hidden: false, type: "card-group", title: "Cuatro formas de protegerte", cards: [
      { title: "Piel", text: "Aplica y reaplica protector solar según las indicaciones del producto.", icon: "shield" },
      { title: "Ojos", text: "Utiliza protección ocular con filtro UV adecuada para tu trabajo.", icon: "eye" },
      { title: "Vestimenta", text: "Usa ropa de manga larga y protege tu cabeza y cuello.", icon: "shirt" },
      { title: "Sombra", text: "Busca sombra para las pausas y organiza las tareas para reducir la exposición.", icon: "shade" },
    ] },
    { id: "video", hidden: false, type: "button", text: "Ver video preventivo", href: "https://www.youtube.com/watch?v=EPZ0m4W2MiE" },
    { id: "faq", hidden: false, type: "faq", items: [
      { question: "¿Necesito protegerme si está nublado?", answer: "Sí. Consulta el índice UV de tu zona y sigue las medidas de tu lugar de trabajo." },
      { question: "¿Dónde encuentro el índice UV de mi zona?", answer: "En el pronóstico de la Dirección Meteorológica de Chile, enlazado al inicio de esta página." },
    ] },
  ],
} satisfies CampaignContent;
