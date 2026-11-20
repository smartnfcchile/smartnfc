"use client";

import type { ProfileImageKind } from "./profile-image-specs";
import { isHeicProfileImage } from "./profile-image-specs";

/**
 * Optimiza una imagen ANTES de subirla a Blob. No recorta: el editor conserva
 * las proporciones y estilos existentes de las tarjetas.
 */
const LIMITS: Record<ProfileImageKind, { width: number; height: number; target: number }> = {
  avatar: { width: 800, height: 800, target: 120_000 },
  logo: { width: 900, height: 900, target: 180_000 },
  cover: { width: 1344, height: 900, target: 280_000 },
  hero: { width: 1920, height: 1080, target: 380_000 },
};

function canvasBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
}

async function decodeImage(file: File): Promise<{ image: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { image: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Safari u otros navegadores: usar <img>.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const element = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
      img.src = url;
    });
    return { image: element, width: element.naturalWidth, height: element.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export async function optimizeProfileImage(file: File, kind: ProfileImageKind): Promise<File> {
  // Importación diferida: el conversor HEIC solo se descarga cuando hace falta.
  let source = file;
  if (isHeicProfileImage(file.type, file.name)) {
    try {
      const { heicTo } = await import("heic-to/csp");
      const jpeg = await heicTo({ blob: file, type: "image/jpeg", quality: 0.94 });
      source = new File([jpeg], file.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" });
    } catch {
      throw new Error("No fue posible convertir esta foto HEIC/HEIF. Prueba otra fotografía.");
    }
  }
  const input = await decodeImage(source);
  try {
    if (!input.width || !input.height || input.width * input.height > 100_000_000) {
      throw new Error("Las dimensiones de la imagen no son compatibles.");
    }
    const { width: maxWidth, height: maxHeight, target } = LIMITS[kind];
    const scale = Math.min(1, maxWidth / input.width, maxHeight / input.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(input.width * scale));
    canvas.height = Math.max(1, Math.round(input.height * scale));
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("Este navegador no permite procesar imágenes.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(input.image, 0, 0, canvas.width, canvas.height);

    // WebP conserva transparencias de logos y reduce significativamente las fotos.
    let best: Blob | null = null;
    for (const quality of [0.84, 0.76, 0.67, 0.57]) {
      const result = await canvasBlob(canvas, "image/webp", quality);
      if (!result || result.type !== "image/webp") break;
      if (!best || result.size < best.size) best = result;
      if (result.size <= target) break;
    }
    // Navegadores sin WebP: conservar transparencia del logo en PNG.
    if (!best) {
      const fallbackMime = kind === "logo" ? "image/png" : "image/jpeg";
      if (fallbackMime === "image/jpeg") {
        context.globalCompositeOperation = "destination-over";
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      best = await canvasBlob(canvas, fallbackMime, 0.78);
    }
    if (!best) throw new Error("No se pudo optimizar la imagen.");
    if (best.size > 5_000_000) throw new Error("La imagen optimizada todavía es demasiado grande.");
    const extension = best.type === "image/webp" ? "webp" : best.type === "image/png" ? "png" : "jpg";
    const stem = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 70) || kind;
    return new File([best], `${stem}-optimizado.${extension}`, { type: best.type, lastModified: Date.now() });
  } finally {
    input.release();
  }
}
