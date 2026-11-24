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

export type CampaignBlock =
  | { id: string; hidden: boolean; type: "hero" | "text"; text: string }
  | { id: string; hidden: boolean; type: "image"; src: string; alt: string }
  | { id: string; hidden: boolean; type: "button"; text: string; href: string }
  | { id: string; hidden: boolean; type: "list"; items: string[] }
  | { id: string; hidden: boolean; type: "faq"; items: { question: string; answer: string }[] };

export type CampaignDesign = {
  name: string;
  color: string;
  font: "system" | "serif";
  style: "clean" | "bold";
  logo?: string;
};

export type CampaignContent = {
  schemaVersion: 1;
  design: CampaignDesign;
  blocks: CampaignBlock[];
  variants: { siteId: string; color?: string; blocks: CampaignBlock[] }[];
};

function validBlock(value: unknown): value is CampaignBlock {
  if (!object(value) || !blockId(value.id) || typeof value.hidden !== "boolean") return false;
  const common = ["id", "type", "hidden"];
  switch (value.type) {
    case "hero":
    case "text":
      return exact(value, [...common, "text"]) && hasText(value.text, 4000);
    case "image":
      return exact(value, [...common, "src", "alt"]) && https(value.src) && hasText(value.alt, 240);
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
  if (!object(value) || !exact(value, ["schemaVersion", "design", "blocks", "variants"]) ||
      value.schemaVersion !== 1 || !validBlocks(value.blocks) || !Array.isArray(value.variants) ||
      value.variants.length > 50) throw new Error("Contenido de campaña inválido");

  const { design, blocks, variants } = value;
  if (!object(design) || !exact(design, ["name", "color", "font", "style", "logo"]) ||
      !hasText(design.name, 120) || !color(design.color) ||
      (design.font !== "system" && design.font !== "serif") ||
      (design.style !== "clean" && design.style !== "bold") ||
      ("logo" in design && !https(design.logo))) throw new Error("Identidad de campaña inválida");

  const base = new Map(blocks.map(block => [block.id, block.type]));
  const sites = new Set<string>();
  for (const variant of variants) {
    if (!object(variant) || !exact(variant, ["siteId", "color", "blocks"]) ||
        !blockId(variant.siteId) || sites.has(variant.siteId) ||
        ("color" in variant && !color(variant.color)) || !validBlocks(variant.blocks) ||
        variant.blocks.some(block => base.get(block.id) !== block.type)) {
      throw new Error("Variante de sede inválida");
    }
    sites.add(variant.siteId);
  }

  if (Buffer.byteLength(JSON.stringify(value), "utf8") > 256 * 1024) {
    throw new Error("Contenido de campaña demasiado grande");
  }
  return value as CampaignContent;
}
