import "./helpers/test-database";
import assert from "node:assert/strict";
import test from "node:test";
import config from "../../next.config";
import { validateCampaignContent } from "../../lib/soluciones/campaign-content";
import { campaignForSite } from "../../lib/soluciones/campaign-editor";
import { locateOnce } from "../../lib/soluciones/smartnfc-geo";
import { uvDemo } from "../../lib/soluciones/uv-demo";

const center = { id: "geo", type: "uv-forecast", hidden: false, title: "Centro", timezone: "America/Santiago", latitude: -41, longitude: -73 } as const;
const content = { ...uvDemo, protectedBlockIds: [], blocks: [center], variants: [] };

test("old blocks remain valid and three location modes enforce their coordinate contracts", () => {
  assert.doesNotThrow(() => validateCampaignContent(content));
  for (const locationMode of ["fixed", "hybrid"] as const) {
    assert.doesNotThrow(() => validateCampaignContent({ ...content, blocks: [{ ...center, locationMode }] }));
  }
  const mobile = { id: center.id, type: center.type, title: center.title, hidden: center.hidden, timezone: center.timezone, locationMode: "mobile" };
  assert.doesNotThrow(() => validateCampaignContent({ ...content, blocks: [mobile] }));
  for (const invalid of [{ ...mobile, locationMode: "hybrid" }, { ...center, locationMode: "mobile" }, { ...center, locationMode: "unknown" }]) {
    assert.throws(() => validateCampaignContent({ ...content, blocks: [invalid] }));
  }
});

test("site selection uses the selected variant and refuses to replace a protected center", () => {
  const variant = { ...center, locationMode: "hybrid" as const, latitude: -45 };
  const input = validateCampaignContent({ ...content, variants: [{ siteId: "lab", blocks: [variant] }] });
  assert.deepEqual(campaignForSite(input, "lab").blocks, [variant]);
  assert.deepEqual(campaignForSite(input, "other").blocks, [center]);
  assert.deepEqual(campaignForSite({ ...input, protectedBlockIds: [center.id] }, "lab").blocks, [center]);
});

test("geolocation header exception is limited to a single public token segment", async () => {
  const rules = await config.headers!();
  if (!Array.isArray(rules)) throw new Error("Expected Next headers");
  const values = rules.flatMap(rule => rule.headers.filter(header => header.key === "Permissions-Policy").map(header => [rule.source, header.value]));
  assert.deepEqual(values.map(([route, value]) => [route, value.includes("geolocation=(self)")]), [["/:path*", false], ["/s/:token", true]]);
});

test("browser location classifies success, low accuracy, policy, denial, timeout and unsupported contexts", async () => {
  const keys = ["window", "document", "navigator"] as const;
  const original = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  const install = (key: typeof keys[number], value: unknown) => Object.defineProperty(globalThis, key, { configurable: true, value });
  const options = { maxAccuracyMeters: 500, timeoutMs: 15 };
  let invocations = 0;
  try {
    install("window", { isSecureContext: true, setTimeout });
    install("document", {});
    for (const [expected, callback] of [
      ["located", (success: PositionCallback) => success({ coords: { latitude: -41, longitude: -73, accuracy: 30 } } as GeolocationPosition)],
      ["inaccurate", (success: PositionCallback) => success({ coords: { latitude: -41, longitude: -73, accuracy: 501 } } as GeolocationPosition)],
      ["denied", (_success: PositionCallback, failure: PositionErrorCallback) => failure({ code: 1 } as GeolocationPositionError)],
      ["timeout", () => undefined],
    ] as const) {
      install("navigator", { geolocation: { getCurrentPosition: (...args: [PositionCallback, PositionErrorCallback]) => { invocations++; callback(...args); } } });
      assert.equal((await locateOnce(options)).status, expected);
    }
    install("document", { permissionsPolicy: { allowsFeature: () => false } });
    assert.equal((await locateOnce(options)).status, "blocked");
    assert.equal(invocations, 4);
    install("navigator", {});
    assert.equal((await locateOnce(options)).status, "unsupported");
  } finally {
    keys.forEach((key, index) => {
      const descriptor = original[index];
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
});
