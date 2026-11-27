import { randomUUID } from "node:crypto";
import { prisma } from "../../../../lib/prisma";
import { forecastCell, parseForecastCell } from "../../../../lib/soluciones/forecast-cell";
import { forecastForCell } from "../../../../lib/soluciones/met-uv-server";
import { resolvePublicSolutionTag } from "../../../../lib/soluciones/public-record";

export const runtime = "nodejs";

const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
const maxBodyBytes = 512;
const minute = 60_000;
const requestLimit = 180;

function reply(status: number, code: string, retryAfter?: number) {
  return Response.json({ status: code }, {
    status,
    headers: retryAfter === undefined ? headers : { ...headers, "Retry-After": String(retryAfter) },
  });
}

async function readPayload(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return JSON.parse(text + decoder.decode());
      bytes += value.byteLength;
      if (bytes > maxBodyBytes) {
        void reader.cancel().catch(() => {});
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

async function takeRequestSlot() {
  const now = Date.now();
  const start = new Date(Math.floor(now / minute) * minute);
  // One shared row, with no IP, user, token or location in the rate limit key.
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "PublicRateLimit" ("id", "keyHash", "action", "windowStart", "count", "updatedAt")
    VALUES (${randomUUID()}, 'shared', 'uv-forecast', ${new Date(0)}, 1, ${start})
    ON CONFLICT ("keyHash", "action", "windowStart") DO UPDATE
    SET "count" = CASE WHEN "PublicRateLimit"."updatedAt" < ${start}
      THEN 1 ELSE "PublicRateLimit"."count" + 1 END,
      "updatedAt" = GREATEST("PublicRateLimit"."updatedAt", ${start})
    WHERE "PublicRateLimit"."updatedAt" < ${start} OR "PublicRateLimit"."count" < ${requestLimit}
    RETURNING "count"
  `;
  return rows.length === 1;
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin ||
      request.headers.get("sec-fetch-site") && request.headers.get("sec-fetch-site") !== "same-origin") {
    return reply(403, "forbidden");
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return reply(415, "unsupported_media_type");
  }
  if (Number(request.headers.get("content-length")) > maxBodyBytes) return reply(413, "too_large");
  const payload = await readPayload(request);
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return reply(400, "invalid_request");
  const input = payload as Record<string, unknown>;
  const keys = Object.keys(input);
  if (keys.some(key => key !== "token" && key !== "cell") ||
      typeof input.token !== "string" || !/^[A-Za-z0-9_-]{32,100}$/.test(input.token)) {
    return reply(400, "invalid_request");
  }
  const mobile = "cell" in input;
  const cell = mobile ? parseForecastCell(input.cell) : null;
  if (mobile && !cell) return reply(400, "invalid_cell");

  if (process.env.SMARTNFC_MET_UV_ENABLED !== "1") return reply(503, "disabled");

  try {
    if (!await takeRequestSlot()) return reply(429, "rate_limited", 60);
    const record = await resolvePublicSolutionTag(input.token);
    if (record?.kind !== "campaignLanding") return reply(404, "unavailable");
    const block = record.blocks.find(block => block.type === "uv-forecast" && !block.hidden);
    if (!block || block.type !== "uv-forecast") return reply(404, "unavailable");
    const mode = block.locationMode ?? "fixed";
    if ((mobile && mode === "fixed") || (!mobile && mode === "mobile")) return reply(404, "unavailable");

    const latitude = cell?.latitude ?? block.latitude;
    const longitude = cell?.longitude ?? block.longitude;
    // Initial service envelope covers continental Chile and nearby coastal centers.
    if (latitude === undefined || longitude === undefined ||
        latitude < -56 || latitude > -17 || longitude < -77 || longitude > -66) {
      return reply(422, "outside_service_area");
    }
    const key = forecastCell(latitude, longitude);
    const series = key && await forecastForCell(key, mobile);
    if (!series) return reply(503, "unavailable");
    return Response.json({
      status: "available", source: mobile ? "phone" : "center", series,
    }, { headers });
  } catch {
    return reply(503, "unavailable");
  }
}
