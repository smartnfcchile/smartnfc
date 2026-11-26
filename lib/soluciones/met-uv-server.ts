import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { parseMetUv, type MetUvSeries } from "./met-uv";

const hour = 60 * 60 * 1000;
const retention = 7 * 24 * hour;
const maxStale = 3 * hour;
const contact = "SmartNFC-UV/2.1 (+https://www.smartnfc.cl/)";
const round = (value: number) => (Math.trunc(value * 10000) / 10000).toFixed(4);
const payloadLimit = 16 * 1024;
const responseLimit = 512 * 1024;

function usable(row: { payload: unknown; expiresAt: Date | null } | null, now: number) {
  if (!row?.payload || !row.expiresAt || row.expiresAt.getTime() + maxStale <= now) return null;
  return row.payload as MetUvSeries;
}

function retryAt(header: string | null, now: number) {
  if (!header) return 0;
  const value = /^\d+$/.test(header) ? now + Number(header) * 1000 : Date.parse(header);
  // Stay inside PostgreSQL/JS date ranges even for a malformed upstream value.
  return Number.isFinite(value) ? Math.min(value, Date.UTC(9999, 11, 31)) : 0;
}

async function readMetResponse(response: Response) {
  if (!response.body || Number(response.headers.get("content-length")) > responseLimit) throw new Error("MET response unavailable or oversized");
  const reader = response.body.getReader();
  let size = 0;
  const decoder = new TextDecoder();
  let body = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > responseLimit) {
        void reader.cancel().catch(() => {});
        throw new Error("MET response oversized");
      }
      body += decoder.decode(value, { stream: true });
    }
    return parseMetUv(JSON.parse(body + decoder.decode()));
  } finally {
    reader.releaseLock();
  }
}

async function lookup(latitude: number, longitude: number, signal: AbortSignal): Promise<MetUvSeries | null> {
  const lat = round(latitude), lon = round(longitude);
  const locationKey = lat + "," + lon;
  const now = Date.now();
  // Round upward to avoid deleting a row that was actually used within seven days.
  const usedThrough = new Date((Math.floor(now / hour) + 1) * hour);
  const [snapshot] = await prisma.$queryRaw<{
    paused: boolean | null; nextRequestAt: Date | null; nextCleanupAt: Date | null; payload: Prisma.JsonValue; expiresAt: Date | null; lastUsedAt: Date | null;
  }[]>`
    SELECT state."paused", state."nextRequestAt", state."nextCleanupAt", cache."payload", cache."expiresAt", cache."lastUsedAt"
    FROM (VALUES (1)) AS singleton(id)
    LEFT JOIN "CampaignUvProviderState" state ON state."id" = singleton.id
    LEFT JOIN "CampaignUvCache" cache ON cache."locationKey" = ${locationKey}
  `;
  if (snapshot?.paused) return null;
  const current = snapshot?.lastUsedAt ? { ...snapshot, lastUsedAt: snapshot.lastUsedAt } : null;
  if (current && current.lastUsedAt < usedThrough) {
    await prisma.campaignUvCache.updateMany({
      where: { locationKey, lastUsedAt: { lt: usedThrough } }, data: { lastUsedAt: usedThrough },
    }).catch(() => {});
  }
  if (signal.aborted || (current?.expiresAt && current.expiresAt.getTime() > now) ||
      (snapshot?.nextRequestAt && snapshot.nextRequestAt.getTime() > now && snapshot.nextCleanupAt && snapshot.nextCleanupAt.getTime() > now)) {
    return usable(current, now);
  }

  try {
    return await prisma.$transaction(async tx => {
      const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(714252, 21) AS locked`;
      if (!locked || signal.aborted) return usable(current, Date.now());
      const at = Date.now();
      const state = await tx.campaignUvProviderState.upsert({
        where: { id: 1 }, update: {},
        create: { id: 1, nextRequestAt: new Date(0), nextCleanupAt: new Date(0) },
      });
      if (state.paused) return null;
      if (state.nextCleanupAt.getTime() <= at) {
        await tx.campaignUvCache.deleteMany({ where: { lastUsedAt: { lte: new Date(at - retention) } } });
        await tx.campaignUvProviderState.update({ where: { id: 1 }, data: { nextCleanupAt: new Date(at + hour) } });
      }

      const entry = await tx.campaignUvCache.findUnique({ where: { locationKey } });
      if ((entry?.expiresAt && entry.expiresAt.getTime() > at) || state.nextRequestAt.getTime() > at || signal.aborted) {
        return usable(entry, at);
      }
      const slot = entry?.slot ?? (await tx.$queryRaw<{ slot: number }[]>`
        SELECT candidate AS slot FROM generate_series(1, 500) AS candidate
        WHERE NOT EXISTS (SELECT 1 FROM "CampaignUvCache" c WHERE c."slot" = candidate)
        ORDER BY candidate LIMIT 1
      `)[0]?.slot;
      if (slot === undefined) return null;

      let response: Response | undefined;
      let model: MetUvSeries | null = null;
      try {
        const headers: Record<string, string> = { "User-Agent": contact };
        if (entry?.lastModified && entry.payload) headers["If-Modified-Since"] = entry.lastModified;
        response = await fetch("https://api.met.no/weatherapi/locationforecast/2.0/complete?" + new URLSearchParams({ lat, lon }), {
          headers, cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(1500)]),
        });
        if (response.status === 304 && entry?.payload) model = entry.payload as MetUvSeries;
        else if (response.ok) model = await readMetResponse(response);
      } catch { /* Missing, invalid or timed-out provider data use the previous bounded forecast. */ }

      const finished = Date.now();
      const expires = Date.parse(response?.headers.get("expires") ?? "");
      const lastModified = response?.headers.get("last-modified");
      if (model && response) {
        const json = JSON.stringify(model);
        const [{ bytes }] = await tx.$queryRaw<{ bytes: number }[]>`SELECT octet_length((${json}::jsonb)::text) AS bytes`;
        if (bytes <= payloadLimit) {
          const data = {
            payload: model as Prisma.InputJsonValue,
            expiresAt: new Date(Math.max(finished + 120000, Number.isFinite(expires) ? expires : finished + hour) + 60000),
            lastModified: lastModified && lastModified.length <= 64 && Number.isFinite(Date.parse(lastModified))
              ? lastModified : response.status === 304 ? entry?.lastModified ?? null : null,
            lastUsedAt: usedThrough,
          };
          await tx.campaignUvCache.upsert({ where: { locationKey }, create: { locationKey, slot, ...data }, update: data });
          await tx.campaignUvProviderState.update({
            where: { id: 1 }, data: { failures: 0, nextRequestAt: new Date(finished + 1000) },
          });
          return model;
        }
      }
      const failures = Math.min(state.failures + 1, 6);
      const backoff = Math.min(hour, 120000 * 2 ** (failures - 1));
      await tx.campaignUvProviderState.update({
        where: { id: 1 },
        data: { failures, nextRequestAt: new Date(Math.max(finished + backoff, retryAt(response?.headers.get("retry-after") ?? null, finished))) },
      });
      return usable(entry, finished);
    }, { maxWait: 300, timeout: 2500 });
  } catch {
    return usable(current, Date.now());
  }
}

export async function forecastForCenter(latitude: number, longitude: number): Promise<MetUvSeries | null> {
  if (process.env.SMARTNFC_MET_UV_ENABLED !== "1") return null;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      lookup(latitude, longitude, controller.signal),
      new Promise<null>(resolve => {
        timer = setTimeout(() => { controller.abort(); resolve(null); }, 2000);
      }),
    ]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
