import sharp from "sharp";

export async function optimizeWebp(buffer: Buffer, limits: { width: number; height: number; target: number }, qualities = [84, 76, 67, 57], maxPixels = 100_000_000): Promise<Buffer> {
  const meta = await sharp(buffer, { limitInputPixels: maxPixels, failOn: "error" }).metadata();
  if (!meta.width || !meta.height || !["png", "jpeg", "webp", "avif", "heif", "tiff"].includes(meta.format || "")) {
    throw new Error("Formato de imagen desconocido o incompatible.");
  }
  const { width, height } = limits;
  const base = sharp(buffer, { limitInputPixels: maxPixels, failOn: "error" })
    .rotate().resize({ width, height, fit: "inside", withoutEnlargement: true });
  let best: Buffer | undefined;
  for (const quality of qualities) {
    const candidate = await base.clone().webp({ quality, effort: 4 }).toBuffer();
    if (!best || candidate.length < best.length) best = candidate;
    if (candidate.length <= limits.target) break;
  }
  if (!best) throw new Error("Conversión sin resultado.");
  const checked = await sharp(best).metadata();
  if (checked.format !== "webp" || !checked.width || !checked.height) throw new Error("Imagen generada no válida.");
  return best;
}
