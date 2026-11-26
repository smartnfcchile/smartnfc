import "./helpers/test-database";
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeUvForecast, uvSiteKey } from "../../lib/soluciones/uv-forecast";
import { validateCampaignContent } from "../../lib/soluciones/campaign-content";
import { parseMetUv, summarizeMetUv } from "../../lib/soluciones/met-uv";
import { uvDemo } from "../../lib/soluciones/uv-demo";

test("keeps the current hourly estimate separate from the daily maximum and preserves zero", () => {
  const site = { latitude: -45.4, longitude: -72.69, timezone: "America/Coyhaique" };
  const t = 1795700000;
  assert.equal(uvSiteKey(site), "-45.400,-72.690,America/Coyhaique");
  const result = normalizeUvForecast({ hourly: { time: [t, t + 3600, t + 7200], uv_index: [0, null, 4] }, daily: { uv_index_max: [5] } }, site, new Date((t + 120) * 1000));
  assert.equal(result.current, 0);
  assert.equal(result.dailyMax, 5);
  assert.equal(result.hours[1].uv, null);
  assert.throws(() => normalizeUvForecast({ hourly: { time: [t] } }, site, new Date()));
});

test("pinpoints missing image alt text and invalid video thumbnails", () => {
  assert.doesNotThrow(() => validateCampaignContent(uvDemo));
  for (const [block, message] of [
    [{ id: "test", hidden: false, type: "image", src: "https://example.com/foto.webp", alt: "" }, /Bloque 1.*texto alternativo/],
    [{ id: "test", hidden: false, type: "video", title: "Ver capacitación", href: "https://example.com/video", thumbnail: "" }, /Bloque 1.*miniatura HTTPS/],
  ] as const) {
    assert.throws(() => validateCampaignContent({ ...uvDemo, protectedBlockIds: [], blocks: [block] }), message);
  }
});

test("MET clear-sky parser keeps zero and summarizes only hours in the local day", () => {
  const met = parseMetUv({ properties: { meta: { updated_at: "2026-11-26T11:00:00Z" }, timeseries: [
    { time: "2026-11-26T19:00:00Z", data: { instant: { details: { ultraviolet_index_clear_sky: 0 } } } },
    { time: "2026-11-26T20:00:00Z", data: { instant: { details: { ultraviolet_index_clear_sky: 7.1 } } } },
    { time: "2026-11-27T04:00:00Z", data: { instant: { details: { ultraviolet_index_clear_sky: 9 } } } },
    { time: "2026-11-27T05:00:00Z", data: { instant: { details: {} } } },
  ] } });
  const result = summarizeMetUv(met, "America/Coyhaique", new Date("2026-11-26T19:30:00Z"));
  assert.equal(result.current, 0);
  assert.equal(result.max, 7.1);
  assert.equal(result.chart.length, 2);
  assert.throws(() => parseMetUv({ properties: { meta: { updated_at: "2026-11-26T11:00:00Z" }, timeseries: [] } }));
});

test("allows center coordinates per site and rejects invalid pairs", () => {
  const block = { id: "uv", hidden: false, type: "uv-forecast", title: "Centro", latitude: -41.88, longitude: -72.92, timezone: "America/Santiago" };
  const input = { ...uvDemo, protectedBlockIds: [], blocks: [block], variants: [
    { siteId: "aysen", blocks: [{ ...block, latitude: -45.4, longitude: -72.69, timezone: "America/Coyhaique" }] },
  ] };
  assert.doesNotThrow(() => validateCampaignContent(input));
  assert.throws(() => validateCampaignContent({ ...input, blocks: [{ ...block, latitude: 91 }] }), /latitud/);
});


test("MET enforces capacity, retention and cross-request backoff on disposable PostgreSQL", {
  skip: !process.env.CAMPAIGN_TEST_DATABASE_URL,
}, async () => {
  const { selectDisposableDatabase } = await import("./helpers/test-database");
  selectDisposableDatabase(process.env.CAMPAIGN_TEST_DATABASE_URL);
  const { prisma } = await import("../../lib/prisma");
  const { forecastForCenter } = await import("../../lib/soluciones/met-uv-server");
  const oldFlag = process.env.SMARTNFC_MET_UV_ENABLED;
  const oldFetch = globalThis.fetch;
  process.env.SMARTNFC_MET_UV_ENABLED = "1";
  let calls = 0;
  let mode: "ok" | "304" | "429" | "503" | "invalid" | "timeout" | "large" = "ok";
  let seenModified: string | null = null;
  const modified = "Thu, 26 Nov 2026 17:00:00 GMT";
  const providerExpires = new Date(Date.now() + 600000).toUTCString();
  const provider = { properties: { meta: { updated_at: "2026-11-26T17:00:00Z" }, timeseries:
    Array.from({ length: 60 }, (_, i) => ({
      time: new Date(Date.UTC(2026, 10, 26, i)).toISOString(),
      data: { instant: { details: { ultraviolet_index_clear_sky: i % 12, air_temperature: 15 } } },
    })),
  } };
  globalThis.fetch = (async (url, init) => {
    calls++;
    assert.match(String(url), /api\.met\.no.*lat=-?\d+\.\d{4}.*lon=-?\d+\.\d{4}/);
    const headers = new Headers(init?.headers);
    assert.match(headers.get("User-Agent") ?? "", /SmartNFC/);
    seenModified = headers.get("If-Modified-Since");
    if (mode === "304") return new Response(null, { status: 304, headers: { expires: providerExpires } });
    if (mode === "429") return new Response(null, { status: 429, headers: { "retry-after": "900" } });
    if (mode === "503") return new Response(null, { status: 503, headers: { "retry-after": new Date(Date.now() + 1800000).toUTCString() } });
    if (mode === "invalid") return Response.json({ properties: {} });
    if (mode === "large") return new Response("x".repeat(513 * 1024));
    if (mode === "timeout") return new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
      // Keep the process alive while the timeout fires.
      setTimeout(() => reject(new Error("Missing timeout")), 2200);
    });
    await new Promise(resolve => setTimeout(resolve, 70));
    return Response.json(provider, { headers: { expires: providerExpires, "last-modified": modified } });
  }) as typeof fetch;
  const key = "-40.1234,-71.1234";
  const state = { id: 1 };
  const expire = async () => {
    await prisma.campaignUvCache.update({ where: { locationKey: key }, data: { expiresAt: new Date(Date.now() - 3000) } });
    await prisma.campaignUvProviderState.update({ where: state, data: { nextRequestAt: new Date(0) } });
  };
  try {
    const t = performance.now();
    const starts = await Promise.all(Array.from({ length: 12 }, () => forecastForCenter(-40.12349, -71.12349)));
    const coldConcurrentMs = performance.now() - t;
    const first = starts.find(Boolean);
    assert.equal(first?.samples.length, 60);
    assert.equal(calls, 1);
    assert.ok(!JSON.stringify(first).includes("air_temperature"));

    const warm = [];
    for (let i = 0; i < 30; i++) {
      const at = performance.now();
      assert.deepEqual(await forecastForCenter(-40.12345, -71.12345), first);
      warm.push(performance.now() - at);
    }
    assert.equal(calls, 1);
    const cached = await prisma.campaignUvCache.findUniqueOrThrow({ where: { locationKey: key } });
    assert.ok(cached.expiresAt && cached.expiresAt.getTime() >= Date.parse(providerExpires));

    await expire();
    mode = "304";
    assert.deepEqual(await forecastForCenter(-40.12345, -71.12345), first);
    assert.equal(seenModified, modified);
    const refreshed = await prisma.campaignUvCache.findUniqueOrThrow({ where: { locationKey: key } });
    assert.ok(refreshed.expiresAt && refreshed.expiresAt.getTime() >= Date.parse(providerExpires));
    assert.equal(calls, 2);

    for (const failure of ["429", "503", "invalid", "large", "timeout"] as const) {
      await expire();
      mode = failure;
      const before = calls;
      const at = Date.now();
      assert.deepEqual(await forecastForCenter(-40.12345, -71.12345), first);
      assert.ok(Date.now() - at < 2300, "weather lookup must stay bounded");
      const cooldown = await prisma.campaignUvProviderState.findUniqueOrThrow({ where: state });
      const minimum = failure === "429" ? 900000 : failure === "503" ? 1798000 : 120000;
      assert.ok(cooldown.nextRequestAt.getTime() >= at + minimum);
      await Promise.all(Array.from({ length: 12 }, (_, i) => forecastForCenter(-45, -73 + i / 100)));
      assert.equal(calls, before + 1);
    }
    await prisma.campaignUvCache.update({ where: { locationKey: key }, data: { expiresAt: new Date(Date.now() - 4 * 3600000) } });
    assert.equal(await forecastForCenter(-40.12345, -71.12345), null);
    await prisma.campaignUvProviderState.update({ where: state, data: { paused: true } });
    await prisma.campaignUvCache.update({ where: { locationKey: key }, data: { expiresAt: new Date(Date.now() + 3600000) } });
    assert.equal(await forecastForCenter(-40.12345, -71.12345), null);
    await prisma.campaignUvProviderState.update({ where: state, data: { paused: false, nextRequestAt: new Date(0), nextCleanupAt: new Date(0) } });

    assert.ok(first);
    await prisma.campaignUvCache.createMany({ data: Array.from({ length: 499 }, (_, i) => ({
      locationKey: "lab:" + (i + 2), slot: i + 2, payload: first,
      lastUsedAt: new Date(), expiresAt: new Date(Date.now() + 3600000),
    })) });
    assert.equal(await prisma.campaignUvCache.count(), 500);
    const before = calls;
    assert.deepEqual(await Promise.all([forecastForCenter(-43, -72), forecastForCenter(-44, -72)]), [null, null]);
    assert.equal(calls, before);
    for (const slot of [1, 501]) {
      await assert.rejects(prisma.campaignUvCache.create({ data: { locationKey: "out-of-range", slot, lastUsedAt: new Date() } }));
    }
    await assert.rejects(prisma.campaignUvCache.update({
      where: { locationKey: "lab:2" }, data: { payload: { text: "x".repeat(16384) } },
    }));
    const [metrics] = await prisma.$queryRaw<{ physical_bytes: number; max_payload_bytes: number; rows: number }[]>`
      SELECT pg_total_relation_size('"CampaignUvCache"')::int + pg_total_relation_size('"CampaignUvProviderState"')::int AS physical_bytes,
        max(octet_length("payload"::text))::int AS max_payload_bytes, count(*)::int AS rows FROM "CampaignUvCache"
    `;
    warm.sort((a, b) => a - b);
    console.log("MET_CACHE_MEASUREMENT " + JSON.stringify({
      ...metrics, providerCallsOnWarmHits: 0, warmHits: warm.length, warmP95Ms: Number(warm[28].toFixed(2)),
      coldConcurrentMs: Number(coldConcurrentMs.toFixed(2)), concurrentColdLookups: starts.length,
    }));

    await prisma.campaignUvCache.update({
      where: { locationKey: "lab:2" }, data: { lastUsedAt: new Date(Date.now() - 8 * 24 * 3600000) },
    });
    await prisma.campaignUvProviderState.update({ where: state, data: { nextCleanupAt: new Date(0) } });
    mode = "ok";
    await Promise.all([forecastForCenter(-43, -72), forecastForCenter(-44, -72)]);
    assert.equal(await prisma.campaignUvCache.count(), 500);
    assert.equal(await prisma.campaignUvCache.count({ where: { locationKey: "lab:2" } }), 0);
    assert.equal(calls, before + 1);
    delete process.env.SMARTNFC_MET_UV_ENABLED;
    assert.equal(await forecastForCenter(-43, -72), null);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldFlag === undefined) delete process.env.SMARTNFC_MET_UV_ENABLED;
    else process.env.SMARTNFC_MET_UV_ENABLED = oldFlag;
    await prisma.campaignUvCache.deleteMany();
    await prisma.campaignUvProviderState.deleteMany();
    await prisma.$disconnect();
  }
});
