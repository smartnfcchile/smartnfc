import assert from "node:assert/strict";
import { test } from "node:test";
import { pointConfigurationSchema, pointObjectives, safeDestination } from "../../lib/local/point-config";
const common = { name: "Caja", location: "Caja principal", medium: "NFC_QR", isActive: true, smartLinks: [] };
test("Los siete objetivos aceptan únicamente configuraciones completas", () => {
  const urls: Record<string, string> = { GOOGLE_REVIEW: "https://g.page/r/example/review", WHATSAPP: "https://wa.me/56912345678?text=Hola", SOCIAL: "https://www.instagram.com/example", MENU: "https://example.org/menu.pdf", PROMOTION: "https://example.org/oferta" };
  for (const objective of pointObjectives) assert.equal(pointConfigurationSchema.safeParse({ ...common, objective, destinationUrl: urls[objective] || "", smartLinks: objective === "SMART_LANDING" ? [{ label: "Menú", url: urls.MENU }] : [] }).success, true, objective);
  assert.equal(pointConfigurationSchema.safeParse({ ...common, objective: "SMART_LANDING" }).success, false);
  assert.equal(pointConfigurationSchema.safeParse({ ...common, objective: "MENU", destinationUrl: "" }).success, false);
});
test("Destinos rechazan protocolos ejecutables, credenciales, hosts locales y dominios impostores", () => {
  for (const value of ["javascript:alert(1)", "data:text/html,test", "http://example.org", "https://user:secret@example.org", "https://127.0.0.1", "https://[::1]", "https://app.localhost", "https://example.org:8080", "https://example.org\\evil"]) assert.equal(safeDestination(value), false, value);
  for (const [objective, destinationUrl] of [["GOOGLE_REVIEW", "https://google.com.evil.org"], ["WHATSAPP", "https://wa.me.evil.org/56912345678"], ["SOCIAL", "https://instagram.com.evil.org"]]) assert.equal(pointConfigurationSchema.safeParse({ ...common, objective, destinationUrl }).success, false);
});
