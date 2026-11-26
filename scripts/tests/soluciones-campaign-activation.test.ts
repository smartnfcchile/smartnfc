import "./helpers/test-database";
import assert from "node:assert/strict";
import test from "node:test";
import { campaignPublication, campaignSettingsDestination } from "../../lib/soluciones/campaign-activation";

const previous = "https://example.com/original";
const landing = {
  destination: "LANDING" as const, expiresAt: null,
  publishedVersion: { content: {
    schemaVersion: 1, design: { name: "Campaña ficticia", color: "#047857", font: "system", style: "clean" },
    blocks: [], variants: [],
  } },
};

test("a valid published landing permits activation without editing the external destination", () => {
  assert.equal(campaignSettingsDestination({ landing, active: true, requested: "", previous: null }), null);
  assert.equal(campaignSettingsDestination({ landing, active: true, requested: "", previous }), previous);
});

test("refuses to activate missing, invalid or expired internal publications", () => {
  const input = { active: true, requested: previous, previous };
  assert.throws(() => campaignSettingsDestination({ ...input, landing: { ...landing, publishedVersion: null } }), /Publica una versión/);
  assert.throws(() => campaignSettingsDestination({ ...input, landing: { ...landing, publishedVersion: { content: {} } } }), /Publica una versión/);
  assert.throws(() => campaignSettingsDestination({ ...input, landing: { ...landing, expiresAt: new Date(1) } }), /venció/);
  assert.equal(campaignPublication({ ...landing, expiresAt: new Date(1000) }, 1000).state, "expired");
});

test("redirect activation still requires a valid HTTPS URL without credentials", () => {
  const input = { landing: null, active: true, previous };
  assert.equal(campaignSettingsDestination({ ...input, requested: "https://example.com" }), "https://example.com/");
  for (const requested of ["", "http://example.com", "https://name@example.com"]) {
    assert.throws(() => campaignSettingsDestination({ ...input, requested }), /dirección web HTTPS/);
  }
  assert.equal(campaignSettingsDestination({ ...input, active: false, requested: "" }), null);
});
