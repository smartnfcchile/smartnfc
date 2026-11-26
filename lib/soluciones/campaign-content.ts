import { safeDestination } from "../local/safe-url";

const hasText = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).every(key => keys.includes(key));
const https = (value: unknown): value is string =>
  hasText(value, 2048) && safeDestination(value);
const color = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
const blockId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(value);

export const campaignIcons = ["sun", "shield", "eye", "shirt", "shade", "info"] as const;
export const riskTones = ["green", "yellow", "orange", "red", "violet"] as const;
export type CampaignIcon = typeof campaignIcons[number];
export type RiskTone = typeof riskTones[number];
export type CampaignCard = { title: string; text: string; icon: CampaignIcon };
export type CampaignRiskBand = { range: string; label: string; tone: RiskTone };
export type CampaignRichBlock =
  | ({ type: "card" | "alert"; id: string; hidden: boolean } & CampaignCard)
  | { type: "indicator"; id: string; hidden: boolean; title: string; text: string; icon: CampaignIcon; action?: { label: string; href: string } }
  | { type: "risk-scale"; id: string; hidden: boolean; title: string; text: string; bands: CampaignRiskBand[] }
  | { type: "card-group"; id: string; hidden: boolean; title: string; cards: CampaignCard[] };

function card(value: Record<string, unknown>) {
  return hasText(value.title, 120) && hasText(value.text, 600) &&
    campaignIcons.includes(value.icon as CampaignIcon);
}

export type CampaignBlock =
  | CampaignRichBlock
  | { id: string; hidden: boolean; type: "uv-forecast"; title: string; latitude?: number; longitude?: number; timezone: "America/Santiago" | "America/Coyhaique" | "America/Punta_Arenas" }
  | { id: string; hidden: boolean; type: "video"; title: string; href: string; thumbnail: string }
  | { id: string; hidden: boolean; type: "hero"; text: string; subtitle?: string }
  | { id: string; hidden: boolean; type: "text"; text: string }
  | { id: string; hidden: boolean; type: "image"; src: string; alt: string }
  | { id: string; hidden: boolean; type: "button"; text: string; href: string }
  | { id: string; hidden: boolean; type: "list"; items: string[] }
  | { id: string; hidden: boolean; type: "faq"; items: { question: string; answer: string }[] };

export type CampaignDesign = {
  name: string;
  color: string;
  font: "system" | "serif";
  style: "clean" | "bold" | "editorial";
  logo?: string;
};

export type CampaignContent = {
  schemaVersion: 1;
  design: CampaignDesign;
  blocks: CampaignBlock[];
  protectedBlockIds?: string[];
  variants: { siteId: string; color?: string; blocks: CampaignBlock[] }[];
};

function validBlock(value: unknown): value is CampaignBlock {
  if (!object(value) || !blockId(value.id) || typeof value.hidden !== "boolean") return false;
  const common = ["id", "type", "hidden"];
  switch (value.type) {
    case "card":
    case "alert":
      return exact(value, [...common, "title", "text", "icon"]) && card(value);
    case "indicator":
      return exact(value, [...common, "title", "text", "icon", "action"]) && card(value) &&
        (!("action" in value) || (object(value.action) && exact(value.action, ["label", "href"]) &&
          hasText(value.action.label, 120) && https(value.action.href)));
    case "risk-scale":
      return exact(value, [...common, "title", "text", "bands"]) && hasText(value.title, 120) &&
        hasText(value.text, 600) && Array.isArray(value.bands) && value.bands.length >= 2 && value.bands.length <= 8 &&
        value.bands.every(band => object(band) && exact(band, ["range", "label", "tone"]) &&
          hasText(band.range, 20) && hasText(band.label, 40) && riskTones.includes(band.tone as RiskTone));
    case "card-group":
      return exact(value, [...common, "title", "cards"]) && hasText(value.title, 120) &&
        Array.isArray(value.cards) && value.cards.length > 0 && value.cards.length <= 8 &&
        value.cards.every(item => object(item) && exact(item, ["title", "text", "icon"]) && card(item));
    case "hero":
      return exact(value, [...common, "text", "subtitle"]) && hasText(value.text, 4000) &&
        (!("subtitle" in value) || hasText(value.subtitle, 300));
    case "text":
      return exact(value, [...common, "text"]) && hasText(value.text, 4000);
    case "image":
      return exact(value, [...common, "src", "alt"]) && https(value.src) && hasText(value.alt, 240);
    case "uv-forecast":
      return exact(value, [...common, "title", "latitude", "longitude", "timezone"]) &&
        hasText(value.title, 120) && ["America/Santiago", "America/Coyhaique", "America/Punta_Arenas"].includes(String(value.timezone)) &&
        (value.latitude === undefined && value.longitude === undefined ||
          typeof value.latitude === "number" && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 &&
          typeof value.longitude === "number" && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180);
    case "video":
      return exact(value, [...common, "title", "href", "thumbnail"]) && hasText(value.title, 120) &&
        https(value.href) && https(value.thumbnail);
    case "button":
      return exact(value, [...common, "text", "href"]) && hasText(value.text, 120) && https(value.href);
    case "list":
      return exact(value, [...common, "items"]) && Array.isArray(value.items) &&
        value.items.length > 0 && value.items.length <= 20 &&
        value.items.every(item => hasText(item, 500));
    case "faq":
      return exact(value, [...common, "items"]) && Array.isArray(value.items) &&
        value.items.length > 0 && value.items.length <= 20 &&
        value.items.every(item => object(item) && exact(item, ["question", "answer"]) &&
          hasText(item.question, 240) && hasText(item.answer, 2000));
    default:
      return false;
  }
}

function validBlocks(value: unknown): value is CampaignBlock[] {
  return Array.isArray(value) && value.length <= 40 && value.every(validBlock) &&
    new Set(value.map(block => block.id)).size === value.length;
}

export function validateCampaignContent(value: unknown): CampaignContent {
  if (!object(value) || !exact(value, ["schemaVersion", "design", "blocks", "variants", "protectedBlockIds"]) ||
      value.schemaVersion !== 1 || !Array.isArray(value.blocks) || !Array.isArray(value.variants) ||
      value.variants.length > 50) throw new Error("Contenido de campaña inválido");

  const { design, variants } = value;
  const rawBlocks = value.blocks;
  if (!validBlocks(rawBlocks)) {
    const index = rawBlocks.findIndex(block => !validBlock(block));
    const block: unknown = rawBlocks[index];
    if (object(block)) {
      const invalid = block.type === "image" ? (!https(block.src) ? "URL HTTPS de la imagen" : "texto alternativo")
        : block.type === "uv-forecast" ? "título, latitud, longitud y zona horaria"
        : block.type === "video" ? (!https(block.thumbnail) ? "miniatura HTTPS" : !https(block.href) ? "enlace HTTPS" : "título")
        : block.type === "button" ? (!https(block.href) ? "destino HTTPS" : "texto del botón")
        : block.type === "indicator" && object(block.action) && !https(block.action.href) ? "destino HTTPS del botón"
        : block.type === "risk-scale" ? "título, nota y tramos de la escala"
        : block.type === "card-group" ? "título y campos de las tarjetas"
        : "campos obligatorios y límites de texto";
      throw new Error(`Bloque ${index + 1}: revisa ${invalid}.`);
    }
    throw new Error(index < 0 ? "Revisa los identificadores duplicados o el máximo de 40 bloques." : `Bloque ${index + 1} inválido.`);
  }
  const blocks = rawBlocks;
  if (!object(design) || !exact(design, ["name", "color", "font", "style", "logo"]) ||
      !hasText(design.name, 120) || !color(design.color) ||
      (design.font !== "system" && design.font !== "serif") ||
      (design.style !== "clean" && design.style !== "bold" && design.style !== "editorial") ||
      ("logo" in design && !https(design.logo))) throw new Error("Identidad de campaña inválida");

  const base = new Map(blocks.map(block => [block.id, block.type]));
  const protectedIds = value.protectedBlockIds;
  if (protectedIds !== undefined && (!Array.isArray(protectedIds) ||
      protectedIds.length > blocks.length || new Set(protectedIds).size !== protectedIds.length ||
      protectedIds.some(id => !blockId(id) || !base.has(id)))) {
    throw new Error("Bloques corporativos inválidos");
  }
  const protectedBlocks = new Set(protectedIds);
  const sites = new Set<string>();
  for (const variant of variants) {
    if (!object(variant) || !exact(variant, ["siteId", "color", "blocks"]) ||
        !blockId(variant.siteId) || sites.has(variant.siteId) ||
        ("color" in variant && !color(variant.color)) || !validBlocks(variant.blocks) ||
        variant.blocks.some(block => base.get(block.id) !== block.type || protectedBlocks.has(block.id))) {
      throw new Error("Variante de sede inválida");
    }
    sites.add(variant.siteId);
  }

  if (Buffer.byteLength(JSON.stringify(value), "utf8") > 256 * 1024) {
    throw new Error("Contenido de campaña demasiado grande");
  }
  return value as CampaignContent;
}
