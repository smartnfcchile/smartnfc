import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { detectBrandImageType } from "../local/brand";
import { campaignImagePrefix } from "./campaign-image-path";
import { optimizeWebp } from "../optimize-webp";

export const campaignImageMaxBytes = 4 * 1024 * 1024;
export const campaignImageLimits = {
  image: { width: 1600, height: 1600, target: 250_000 },
  logo: { width: 1200, height: 1200, target: 150_000 },
};

export class CampaignImageError extends Error {}

export async function optimizeCampaignImage(file: Blob, kind: keyof typeof campaignImageLimits) {
  if (!file.size || file.size > campaignImageMaxBytes) throw new CampaignImageError("Selecciona una imagen de hasta 4 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = detectBrandImageType(bytes);
  if (!type || (file.type && file.type !== type)) throw new CampaignImageError("Usa un archivo JPG, PNG o WebP válido.");
  const optimized = await optimizeWebp(bytes, campaignImageLimits[kind], [84, 78, 72], 32_000_000)
    .catch(() => { throw new CampaignImageError("No se pudo leer la imagen. Revisa su formato y dimensiones."); });
  if (optimized.length > 750_000) throw new CampaignImageError("La imagen optimizada supera 750 KB. Selecciona una imagen más pequeña.");
  return optimized;
}

export async function storeCampaignImage(
  scope: { companyId: string; projectId: string }, image: Buffer,
  store = put, token = process.env.BLOB_READ_WRITE_TOKEN?.trim(),
) {
  if (!token) throw new Error("Storage not configured");
  const path = campaignImagePrefix(scope) + randomUUID() + ".webp";
  const result = await store(path, image, { token, access: "public", contentType: "image/webp", allowOverwrite: false, addRandomSuffix: false });
  const url = new URL(result.url);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".public.blob.vercel-storage.com") ||
      url.pathname !== "/" + path || url.username || url.password || url.search || url.hash) throw new Error("Unexpected storage URL");
  return url.href;
}
