import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { parseMetUv, type MetUvSeries } from "./met-uv";

const maxStale = 3 * 60 * 60 * 1000;
const contact = "SmartNFC-UV/2.1 (+https://www.smartnfc.cl/)";
const round = (value: number) => (Math.trunc(value * 10000) / 10000).toFixed(4);

function usable(row: { payload: unknown; expiresAt: Date | null } | null, now: number) {
  if (!row?.payload || !row.expiresAt || row.expiresAt.getTime() + maxStale <= now) return null;
  return row.payload as MetUvSeries;
}

export async function forecastForCenter(latitude: number, longitude: number): Promise<MetUvSeries | null> {
  if (process.env.SMARTNFC_MET_UV_ENABLED !== "1") return null;
  const lat = round(latitude);
  const lon = round(longitude);
  const locationKey = lat + "," + lon;
  const find = () => prisma.campaignUvCache.findUnique({ where: { locationKey } });
  const now = Date.now();
  const current = await find().catch(() => null);
  if (current?.expiresAt && current.expiresAt.getTime() > now) return usable(current, now);
  try {
    return await prisma.$transaction(async tx => {
      // Serialize provider traffic across all application instances and work centers.
      const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(714252, 21) AS locked`;
      if (!locked) return usable(current, now);
      const cache = await tx.campaignUvCache.findUnique({ where: { locationKey } });
      const at = new Date();
      if (cache?.expiresAt && cache.expiresAt > at) return usable(cache, at.getTime());
      if (cache && at.getTime() - cache.attemptedAt.getTime() < 120000) return usable(cache, at.getTime());
      const recent = await tx.campaignUvCache.findFirst({ where: { attemptedAt: { gt: new Date(at.getTime() - 1000) } }, select: { locationKey: true } });
      if (recent) return usable(cache, at.getTime());
      const received = await tx.campaignUvCache.upsert({
        where: { locationKey }, create: { locationKey, attemptedAt: at }, update: { attemptedAt: at },
      });
      try {
        const headers: Record<string, string> = { "User-Agent": contact };
        if (received.lastModified) headers["If-Modified-Since"] = received.lastModified;
        const response = await fetch("https://api.met.no/weatherapi/locationforecast/2.0/complete?" + new URLSearchParams({ lat, lon }), {
          headers, cache: "no-store", signal: AbortSignal.timeout(3500),
        });
        const expiry = Date.parse(response.headers.get("expires") ?? "");
        const expiresAt = new Date(Math.max(Date.now() + 120000, Number.isFinite(expiry) ? expiry : Date.now() + 3600000) + 60000);
        const lastModified = response.headers.get("last-modified") ?? received.lastModified;
        if (response.status === 304 && received.payload) {
          await tx.campaignUvCache.update({ where: { locationKey }, data: { expiresAt, lastModified } });
          return received.payload as MetUvSeries;
        }
        if (!response.ok) return usable(received, at.getTime());
        const model = parseMetUv(await response.json());
        await tx.campaignUvCache.update({
          where: { locationKey }, data: { payload: model as Prisma.InputJsonValue, expiresAt, lastModified },
        });
        return model;
      } catch {
        return usable(received, at.getTime());
      }
    }, { timeout: 6500 });
  } catch {
    return usable(current, now);
  }
}
