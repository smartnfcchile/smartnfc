/**
 * Optimización controlada de imágenes LEGACY de tarjetas.
 *
 * DRY-RUN por defecto. No borra blobs originales. No toca perfiles ajenos al filtro.
 * Para aplicar: --company-id <ID> --card-id <ID> --apply --confirm-card-id <ID>
 * Para revertir: --rollback <ruta-manifiesto> --company-id <ID> --card-id <ID>
 *   --confirm-card-id <ID>
 *
 * Ejecutar desde entorno administrativo de confianza, NUNCA desde una ruta pública.
 * Revisar y respaldar el manifiesto de salida antes de descartar las imágenes originales.
 */
import { PrismaClient } from "@prisma/client";
import { optimizeWebp } from "../../lib/optimize-webp";
import { put } from "@vercel/blob";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { CARD_IMAGE_FIELDS, getAuthorizedBlobHosts, isAuthorizedCardImageUrl, type CardImageField } from "../../lib/card-images";

const MAX_DOWNLOAD_BYTES = 16 * 1024 * 1024;
const DB = new PrismaClient();
const limits: Record<CardImageField, { width: number; height: number; target: number }> = {
  avatarUrl: { width: 800, height: 800, target: 120_000 },
  logoUrl: { width: 900, height: 900, target: 180_000 },
  coverUrl: { width: 1344, height: 900, target: 280_000 },
  heroImageUrl: { width: 1920, height: 1080, target: 380_000 },
};
type ManifestEntry = { cardId: string; companyId: string; field: CardImageField; originalUrl: string; optimizedUrl: string; originalBytes: number; optimizedBytes: number; at: string };

function option(args: string[], key: string): string | undefined {
  const pos = args.indexOf(key);
  if (pos < 0) return undefined;
  if (!args[pos + 1] || args[pos + 1].startsWith("--")) throw new Error(`Falta valor para ${key}`);
  return args[pos + 1];
}
function isCardImageField(field: string): field is CardImageField {
  return (CARD_IMAGE_FIELDS as readonly string[]).includes(field);
}
async function readRemote(url: string, hosts: readonly string[]): Promise<Buffer> {
  if (!isAuthorizedCardImageUrl(url, hosts) || !url.startsWith("https://")) {
    throw new Error("URL no pertenece al almacén Blob autorizado.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { redirect: "error", signal: controller.signal, cache: "no-store" });
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
    const announced = Number(response.headers.get("content-length") || "0");
    if (announced > MAX_DOWNLOAD_BYTES) throw new Error("Archivo remoto demasiado grande.");
    const chunks: Uint8Array[] = [];
    let total = 0;
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_DOWNLOAD_BYTES) throw new Error("Archivo remoto demasiado grande.");
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    return Buffer.concat(chunks, total);
  } finally {
    clearTimeout(timeout);
  }
}
function ensureManifest(path: string, apply: boolean) {
  const full = resolve(path);
  if (apply) {
    if (existsSync(full)) throw new Error("El manifiesto ya existe: usa otro nombre para evitar sobrescrituras.");
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, "", { flag: "wx", mode: 0o600 });
  }
  return full;
}
async function changeField(cardId: string, companyId: string, field: CardImageField, expected: string, next: string) {
  const result = await DB.card.updateMany({
    where: { id: cardId, companyId, [field]: expected },
    data: { [field]: next },
  });
  return result.count === 1;
}
async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const rollbackPath = option(args, "--rollback");
  const companyId = option(args, "--company-id");
  const cardId = option(args, "--card-id");
  const confirmId = option(args, "--confirm-card-id");
  if (!companyId || !cardId) throw new Error("Se requieren --company-id y --card-id: no se permite migración masiva.");
  if ((apply || rollbackPath) && (confirmId !== cardId)) throw new Error("Debe confirmar exactamente --confirm-card-id.");
  if (apply && rollbackPath) throw new Error("No combines --apply y --rollback.");
  const card = await DB.card.findFirst({ where: { id: cardId, companyId }, select: {
    id: true, companyId: true, slug: true, avatarUrl: true, logoUrl: true, coverUrl: true, heroImageUrl: true,
  } });
  if (!card) throw new Error("Tarjeta no encontrada en la empresa solicitada.");

  if (rollbackPath) {
    const entries: ManifestEntry[] = readFileSync(resolve(rollbackPath), "utf8").split("\n").filter(Boolean).map(line => JSON.parse(line));
    for (const entry of entries.reverse()) {
      if (entry.cardId !== cardId || entry.companyId !== companyId || !isCardImageField(entry.field)) throw new Error("Manifiesto no corresponde a la tarjeta.");
      const restored = await changeField(cardId, companyId, entry.field, entry.optimizedUrl, entry.originalUrl);
      console.log(`ROLLBACK ${entry.field}: ${restored ? "restaurado" : "omitido (la imagen cambió)"}`);
    }
    return;
  }

  const hosts = getAuthorizedBlobHosts();
  if (!hosts.length) throw new Error("No se configuró un host Vercel Blob autorizado.");
  if (apply && !process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Falta BLOB_READ_WRITE_TOKEN para escribir.");
  const manifest = apply ? ensureManifest(option(args, "--manifest") || `./reports/image-migration-${cardId}-${Date.now()}.jsonl`, true) : "";
  console.log(`SmartNFC images: ${apply ? "APPLY" : "DRY-RUN"} | card=${card.slug} | companyId=${companyId}`);
  if (manifest) console.log(`Manifiesto de respaldo: ${manifest}`);

  for (const field of CARD_IMAGE_FIELDS) {
    const originalUrl = card[field];
    if (!originalUrl) { console.log(`${field}: sin imagen`); continue; }
    if (!originalUrl.startsWith("https://") || !isAuthorizedCardImageUrl(originalUrl, hosts)) {
      console.log(`${field}: OMITIDO (fuente externa o legacy, no migrar automáticamente)`); continue;
    }
    try {
      const original = await readRemote(originalUrl, hosts);
      const output = await optimizeWebp(original, limits[field]);
      const savedPercent = Math.round((1 - output.length / original.length) * 100);
      console.log(`${field}: ${original.length} -> ${output.length} bytes (${savedPercent}% menos)`);
      if (output.length >= original.length || original.length < 150_000) {
        console.log(`${field}: sin mejora suficiente, se conserva original`); continue;
      }
      if (!apply) continue;
      // No se reemplaza el enlace hasta confirmar que el Blob nuevo es accesible.
      const uploaded = await put(`profile-optimized/${cardId}/${field}-${randomUUID()}.webp`, output, {
        access: "public", contentType: "image/webp", addRandomSuffix: false,
      });
      const verified = await readRemote(uploaded.url, hosts);
      if (verified.length !== output.length) throw new Error("El archivo almacenado no coincide en tamaño.");
      const entry: ManifestEntry = { cardId, companyId, field, originalUrl, optimizedUrl: uploaded.url, originalBytes: original.length, optimizedBytes: output.length, at: new Date().toISOString() };
      // Respaldar URL original y nueva ANTES del cambio en la base de datos.
      appendFileSync(manifest, JSON.stringify(entry) + "\n", { encoding: "utf8" });
      const changed = await changeField(cardId, companyId, field, originalUrl, uploaded.url);
      console.log(`${field}: ${changed ? "ACTUALIZADO" : "NO ACTUALIZADO (cambio concurrente)"}`);
    } catch (error) {
      console.error(`${field}: ERROR ${error instanceof Error ? error.message : String(error)}`);
      if (apply) throw error;
    }
  }
  console.log(apply ? "Finalizado: conserva el manifiesto y todos los blobs originales." : "DRY-RUN finalizado: no se modificó nada.");
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; })
  .finally(async () => DB.$disconnect());
