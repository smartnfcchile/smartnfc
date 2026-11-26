import "./helpers/test-database";
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeUvForecast, uvSiteKey } from "../../lib/soluciones/uv-forecast";
import { validateCampaignContent } from "../../lib/soluciones/campaign-content";
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
