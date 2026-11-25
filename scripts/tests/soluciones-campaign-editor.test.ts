import "./helpers/test-database";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { validateCampaignContent, type CampaignContent } from "../../lib/soluciones/campaign-content";
import { campaignForSite, newCampaignBlock, removeBlockOverrides, updateSiteVariant } from "../../lib/soluciones/campaign-editor";
import CampaignPreview from "../../app/superadmin/soluciones/[projectId]/landing/CampaignPreview";

const hero = newCampaignBlock("hero", "hero");
const text = { id: "text", type: "text", hidden: false, text: "Base" } as const;
const base: CampaignContent = {
  schemaVersion: 1, design: { name: "Demo ficticia", color: "#123456", font: "system", style: "clean" },
  blocks: [hero, text], variants: [], protectedBlockIds: ["hero"],
};

test("site variants inherit the order and cannot override protected corporate blocks", () => {
  const variant = updateSiteVariant(base, "site-a", current => ({
    ...current, color: "#abcdef", blocks: [{ ...text, text: "Sede A" }],
  }));
  assert.deepEqual(validateCampaignContent(variant), variant);
  assert.equal(campaignForSite(variant, "site-a").design.color, "#abcdef");
  assert.deepEqual(campaignForSite(variant, "site-a").blocks.map(block => block.id), ["hero", "text"]);
  assert.deepEqual(campaignForSite(variant, "site-b").blocks, base.blocks);
  assert.throws(() => validateCampaignContent(updateSiteVariant(variant, "site-a", current => ({
    ...current, blocks: [hero],
  }))), /Variante/);
  assert.deepEqual(removeBlockOverrides(variant, "text").variants[0].blocks, []);
  assert.deepEqual(updateSiteVariant(variant, "site-a", () => ({ siteId: "site-a", blocks: [] })).variants, []);
});

test("mobile preview omits hidden blocks and renders text without navigation or unsafe images", () => {
  const content: CampaignContent = {
    ...base, blocks: [
      { ...text, text: "<script>visible</script>" },
      { ...text, id: "hidden", text: "Never render me", hidden: true },
      { id: "image", type: "image", src: "http://example.com/img", alt: "Fixture", hidden: false },
      { id: "btn", type: "button", text: "Más", href: "https://example.com", hidden: false },
    ],
  };
  const html = renderToStaticMarkup(createElement(CampaignPreview, { content, siteId: "" }));
  assert.match(html, /&lt;script&gt;visible/);
  assert.doesNotMatch(html, /Never render me|<script|<a |http:\/\/example\.com/);
  assert.match(html, /Vista previa móvil|Vista previa del borrador/);
});
