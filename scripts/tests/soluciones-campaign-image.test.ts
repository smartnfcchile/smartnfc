import "./helpers/test-database";
import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { optimizeCampaignImage, storeCampaignImage } from "../../lib/soluciones/campaign-image";
import { belongsToCampaignImageScope } from "../../lib/soluciones/campaign-image-path";

test("optimizes fictional PNG and preserves aspect ratio and alpha", async () => {
  const original = await sharp({ create: { width: 2000, height: 1000, channels: 4, background: "#2465ac80" } }).png().toBuffer();
  const result = await optimizeCampaignImage(new Blob([new Uint8Array(original)], { type: "image/png" }), "image");
  const meta = await sharp(result).metadata();
  assert.deepEqual([meta.width, meta.height, meta.format, meta.hasAlpha], [1600, 800, "webp", true]);
  assert.ok(result.length < original.length);
  console.info(`Fictional PNG ${original.length} B → WebP ${result.length} B`);
});

test("rejects wrong MIME, truncated data and inputs above 4 MiB", async () => {
  const png = await sharp({ create: { width: 30, height: 30, channels: 3, background: "#2465ac" } }).png().toBuffer();
  await assert.rejects(optimizeCampaignImage(new Blob([new Uint8Array(png)], { type: "image/jpeg" }), "logo"));
  await assert.rejects(optimizeCampaignImage(new Blob([new Uint8Array(png.subarray(0, 10))]), "logo"));
  await assert.rejects(optimizeCampaignImage(new Blob([new Uint8Array(4 * 1024 * 1024 + 1)]), "image"));
});

test("appends independent immutable objects and validates campaign scope", async () => {
  const scope = { companyId: "demo-org", projectId: "demo-project" };
  const store: NonNullable<Parameters<typeof storeCampaignImage>[2]> = async (pathname, _body, options) => {
    assert.equal(options?.allowOverwrite, false);
    const url = "https://fictional.public.blob.vercel-storage.com/" + pathname;
    return { pathname, url, downloadUrl: url, contentType: "image/webp", contentDisposition: "inline", etag: "fictional" };
  };
  const first = await storeCampaignImage(scope, Buffer.from("fake"), store, "fake");
  const second = await storeCampaignImage(scope, Buffer.from("fake"), store, "fake");
  assert.notEqual(first, second);
  assert.ok(belongsToCampaignImageScope(first, scope));
  assert.equal(belongsToCampaignImageScope(first, { ...scope, companyId: "foreign" }), false);
  assert.ok(belongsToCampaignImageScope("https://example.com/original.webp", scope));
});

test("honors JPEG orientation before resizing", async () => {
  const jpeg = await sharp({ create: { width: 1500, height: 1000, channels: 3, background: "#2465ac" } })
    .jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const output = await optimizeCampaignImage(new Blob([new Uint8Array(jpeg)], { type: "image/jpeg" }), "logo");
  const meta = await sharp(output).metadata();
  assert.deepEqual([meta.width, meta.height, meta.orientation], [800, 1200, undefined]);
});
