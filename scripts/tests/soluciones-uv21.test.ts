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
