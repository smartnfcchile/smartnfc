import "./helpers/test-database";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { effectiveAnswers } from "../../lib/flow/engine";
import type { Answers } from "../../lib/flow/types";
import { LOCALES_FLOW } from "../../content/flows/locales";
import { SALES_WHATSAPP_DIGITS } from "../../content/locales/contact";
import { REQUEST_CONSENT } from "../../content/locales/consent";
import { PRIVACY_NOTICE } from "../../content/legal/privacy";
import { SCENE_ASSETS, SUPPORT_ASSETS } from "../../content/locales/assets";
import { TAX_NOTE, formatCLP, priceOf } from "../../lib/commercial/public-offers";
import { buildProposal, initialSupportSelection, type SupportSelection } from "../../lib/locales/proposal";
import { buildLocalesQuote } from "../../lib/locales/quote";
import { suggestedPrimaryIndex } from "../../lib/locales/primary-action";
import { REQUEST_MESSAGE_MAX, REQUEST_REF, buildRequestMessage, sanitizeField, whatsappRequestUrl } from "../../lib/locales/request-message";

const proposalOf = (a: Answers) => buildProposal(effectiveAnswers(LOCALES_FLOW, a));
const cafe12: Answers = { rubro: "cafe", objetivos: ["reviews", "social", "menu"], redes: ["INSTAGRAM"], cartaPublicada: "no", perfilGoogle: "unknown",
  ubicaciones: ["tables", "counter", "entrance"], mesas: 12, locales: "one" };
const small: Answers = { rubro: "beauty", objetivos: ["whatsapp", "reviews"], perfilGoogle: "yes", ubicaciones: ["counter", "waiting"], locales: "one" };

test("soportes: combinación óptima, montos de F1 y ahorro real", () => {
  const p = proposalOf(cafe12);
  const q = buildLocalesQuote(p, initialSupportSelection(p.points));
  assert.deepEqual(q.supports.lines.map(l => [l.id, l.quantity, l.totalClp]), [
    ["PACK_5_MINI", 2, 149980], ["LOCAL_MINI", 2, 39980], ["LOCAL_STANDARD", 1, 29990], ["LOCAL_XL", 1, 39990]]);
  assert.equal(q.supports.totalClp, 259940);
  const individual = 12 * priceOf("LOCAL_MINI", "one_time")! + priceOf("LOCAL_STANDARD", "one_time")! + priceOf("LOCAL_XL", "one_time")!;
  assert.equal(q.supports.individualClp, individual);
  assert.equal(q.supports.savingsClp, individual - 259940);
  assert.equal(q.supports.savingsClp, 49920);
  assert.equal(q.taxNote, TAX_NOTE);
  assert.deepEqual(q.supports.lines.map(l => l.name), ["Pack 5 Mini", "Soporte Mini", "Soporte Standard", "Soporte XL"]);
});

test("ahorro solo cuando es positivo; cambiar tamaños recalcula", () => {
  const p = proposalOf(small);
  const q = buildLocalesQuote(p, initialSupportSelection(p.points));
  assert.deepEqual(q.supports.lines.map(l => [l.id, l.quantity]), [["LOCAL_STANDARD", 2]]);
  assert.equal(q.supports.savingsClp, 0);
  const two: SupportSelection = { counter: "LOCAL_MINI", waiting: "LOCAL_MINI" };
  assert.equal(buildLocalesQuote(p, two).supports.savingsClp, 0, "2 Mini sueltos: sin pack, sin ahorro");
  assert.equal(buildLocalesQuote(p, two).supports.totalClp, 2 * priceOf("LOCAL_MINI", "one_time")!);
  assert.equal(buildLocalesQuote(p, { counter: "LOCAL_XL", waiting: "LOCAL_MINI" }).supports.totalClp, priceOf("LOCAL_XL", "one_time")! + priceOf("LOCAL_MINI", "one_time")!);
});

test("licencia separada de los soportes: mensual hasta 10 puntos; cotización sobre 10 o con varios locales", () => {
  const p = proposalOf(small);
  const q = buildLocalesQuote(p, initialSupportSelection(p.points));
  assert.deepEqual([q.license.kind, q.license.monthlyClp, q.license.quoteReasons], ["monthly", priceOf("LOCAL_PRO", "monthly"), []]);
  assert.ok(!q.supports.lines.some(l => (l.id as string) === "LOCAL_PRO"), "la licencia no se suma a los soportes");
  assert.equal(q.license.annualInfoClp, priceOf("LOCAL_PRO", "annual"), "anual solo informativo");
  assert.equal(q.license.comparison, null, "sin comparación mensual/anual mientras D16 esté vigente");
  const big = proposalOf(cafe12);
  const qb = buildLocalesQuote(big, initialSupportSelection(big.points));
  assert.deepEqual([qb.license.kind, qb.license.monthlyClp, qb.license.quoteReasons], ["quote", null, ["points"]]);
  const multi = proposalOf({ ...small, locales: "many" });
  const qm = buildLocalesQuote(multi, initialSupportSelection(multi.points));
  assert.equal(qm.referenceLocation, true, "soportes para un local de referencia");
  assert.deepEqual(qm.license.quoteReasons, ["multi-location"]);
  assert.equal(qm.supports.totalClp, q.supports.totalClp, "los soportes se calculan para un solo local");
  assert.deepEqual(qm.quoted.map(x => [x.id, x.text]), [["INSTALLATION", "Se cotiza aparte"], ["SHIPPING", "Según destino"]]);
});

test("acción principal sugerida por ubicación (solo visual; nunca contacto)", () => {
  const p = proposalOf({ rubro: "cafe", objetivos: ["reviews", "social", "menu"], redes: ["INSTAGRAM"], cartaPublicada: "yes", perfilGoogle: "yes", ubicaciones: ["tables"], mesas: 2, locales: "one" });
  const type = (loc: Parameters<typeof suggestedPrimaryIndex>[0]) => p.actions[suggestedPrimaryIndex(loc, p.actions)].type;
  assert.equal(type("tables"), "MENU");
  assert.equal(type("counter"), "GOOGLE_REVIEW");
  assert.equal(type("entrance"), "INSTAGRAM");
  assert.equal(type("waiting"), "GOOGLE_REVIEW");
  assert.equal(type("other"), "GOOGLE_REVIEW", "«otro lugar» respeta el orden elegido");
  const contactOnly = proposalOf({ rubro: "store", objetivos: ["contact"], ubicaciones: ["counter"], locales: "one" });
  assert.equal(suggestedPrimaryIndex("counter", contactOnly.actions), -1);
  const withContact = proposalOf({ rubro: "store", objetivos: ["contact", "whatsapp"], ubicaciones: ["entrance"], locales: "one" });
  assert.equal(withContact.actions[suggestedPrimaryIndex("entrance", withContact.actions)].type, "WHATSAPP");
});

test("mensaje: solo lo visible, datos opcionales depurados y enlace al número verificado", () => {
  const p = proposalOf(cafe12);
  const sel = initialSupportSelection(p.points);
  const q = buildLocalesQuote(p, sel);
  const bare = buildRequestMessage(p, sel, q);
  assert.ok(!/Negocio:|Ciudad:/.test(bare), "sin datos opcionales si no se escribieron");
  for (const t of ["Rubro: Cafetería o restaurante", "Locales: 1 local", "Mesas ×12 (Mini)", "Mesón o caja ×1 (Standard)", "Entrada o vitrina ×1 (XL)",
    "2 × Pack 5 Mini, 2 × Soporte Mini, 1 × Soporte Standard, 1 × Soporte XL = $259.940 IVA incluido", `Ahorro por packs Mini: ${formatCLP(49920)}`,
    "Licencia Local Pro: cotización personalizada (más de 10 puntos)", "Instalación: por cotizar. Despacho: según destino.",
    "carta por publicar", "perfil de Google por crear o verificar", `Ref: ${REQUEST_REF}`]) assert.ok(bare.includes(t), t);
  const msg = buildRequestMessage(p, sel, q, { businessName: "  Café\n del <b>Río</b>  ", city: "Valdivia " });
  assert.ok(msg.includes("Negocio: Café del <b>Río</b>"), "una sola línea");
  assert.ok(msg.includes("Ciudad: Valdivia\n"));
  assert.equal(sanitizeField("x".repeat(80)).length, 60);
  assert.equal(sanitizeField("\u0007a\tb"), "a b");
  const url = new URL(whatsappRequestUrl(msg));
  assert.equal(url.origin + url.pathname, `https://wa.me/${SALES_WHATSAPP_DIGITS}`);
  assert.equal(url.searchParams.get("text"), msg, "el enlace lleva exactamente el mensaje mostrado");
  const huge = proposalOf({ ...cafe12, rubro: "other", rubroOtro: "y".repeat(60) });
  assert.ok(buildRequestMessage(huge, initialSupportSelection(huge.points), buildLocalesQuote(huge, initialSupportSelection(huge.points)), { businessName: "z".repeat(60), city: "w".repeat(60) }).length <= REQUEST_MESSAGE_MAX);
  const monthly = proposalOf(small);
  assert.ok(buildRequestMessage(monthly, initialSupportSelection(monthly.points), buildLocalesQuote(monthly, initialSupportSelection(monthly.points))).includes("Licencia Local Pro: $14.990/mes IVA incluido"));
  const multi = proposalOf({ ...small, locales: "few" });
  assert.ok(buildRequestMessage(multi, initialSupportSelection(multi.points), buildLocalesQuote(multi, initialSupportSelection(multi.points))).includes("(un local de referencia)"));
});

test("número de WhatsApp: el mismo que ya usa el sitio (no es un número nuevo)", () => {
  for (const file of ["components/HomeLanding.tsx", "app/page.tsx"]) {
    assert.ok(readFileSync(file, "utf8").includes(SALES_WHATSAPP_DIGITS), file);
  }
  // Desde la nueva landing (19-10-2026), /empresas usa la misma constante en vez de repetir el número.
  assert.ok(/import \{ SALES_WHATSAPP_DIGITS \} from "..\/..\/content\/locales\/contact"/.test(readFileSync("app/empresas/page.tsx", "utf8")), "app/empresas/page.tsx");
});

test("consentimiento: alineado con el aviso común, sin afirmar aprobación legal", () => {
  const text = `${REQUEST_CONSENT.label} ${REQUEST_CONSENT.details}`.toLowerCase();
  for (const banned of ["política de privacidad", "términos y condiciones", "ley 21.719", "garantiza"]) assert.ok(!text.includes(banned), banned);
  // Desde el 19-10-2026 usa la versión del aviso común (antes: borrador-2026-10-16).
  assert.equal(REQUEST_CONSENT.version, PRIVACY_NOTICE.version);
  assert.ok(text.includes("revisarlo antes de enviarlo") && text.includes("no es una contratación"));
});

// Lee ancho y alto de un WebP (VP8, VP8L o VP8X) sin dependencias.
function webpSize(file: string) {
  const b = readFileSync(file);
  assert.equal(b.toString("ascii", 0, 4), "RIFF"); assert.equal(b.toString("ascii", 8, 12), "WEBP");
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8X") return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3), alpha: (b[20] & 0x10) !== 0 };
  if (chunk === "VP8L") { const bits = b.readUInt32LE(21); return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, alpha: ((bits >> 28) & 1) === 1 }; }
  return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff, alpha: false };
}
const publicFile = (src: string) => join("public", src);

test("F4: soportes con foto transparente, peso ≤ 60 KB, medidas exactas del registro y sin estirar", () => {
  for (const [size, asset] of Object.entries(SUPPORT_ASSETS)) {
    assert.ok(asset, size);
    assert.match(asset.src, /^\/images\/locales\/soporte-(mini|standard|xl)\.webp$/);
    const file = publicFile(asset.src);
    assert.ok(statSync(file).size <= 60 * 1024, `${size}: ${statSync(file).size} bytes`);
    const dim = webpSize(file);
    assert.deepEqual([dim.width, dim.height], [asset.width, asset.height], `${size}: medidas declaradas = archivo`);
    assert.ok(dim.alpha, `${size}: fondo transparente`);
    assert.equal(asset.alt, "", "decorativa: el nombre del tamaño ya está escrito al lado");
  }
});

test("F4: escenas solo para cafetería/restaurante y bar, 1600×900, ≤ 200 KB, con «Imagen ilustrativa»", () => {
  const withScene = Object.entries(SCENE_ASSETS).filter(([, a]) => a).map(([r]) => r);
  assert.deepEqual(withScene, ["cafe", "bar"], "los demás rubros conservan la ilustración");
  assert.match(SCENE_ASSETS.cafe!.src, /escena-sakura-mesas\.webp$/);
  assert.match(SCENE_ASSETS.bar!.src, /escena-sakura-meson\.webp$/);
  for (const r of withScene) {
    const a = SCENE_ASSETS[r as keyof typeof SCENE_ASSETS]!;
    const file = publicFile(a.src);
    assert.ok(statSync(file).size <= 200 * 1024, `${r}: ${statSync(file).size} bytes`);
    assert.deepEqual(Object.values(webpSize(file)).slice(0, 2), [1600, 900]);
    assert.deepEqual([a.width, a.height], [1600, 900]);
    assert.equal(a.caption, "Imagen ilustrativa");
    assert.ok(a.alt.length > 10 && !/sakura|cliente|instalad/i.test(a.alt), "alt descriptivo, sin presentar la marca ficticia como cliente");
  }
});

test("privacidad: el código de Locales no envía ni guarda respuestas", () => {
  const dirs = ["components/locales", "lib/locales", "content/locales", "content/flows"];
  const files = dirs.flatMap(d => readdirSync(d).filter(f => /\.(ts|tsx)$/.test(f)).map(f => join(d, f)));
  assert.ok(files.length >= 10);
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    for (const banned of [/\bfetch\s*\(/, /localStorage|sessionStorage|indexedDB/, /document\.cookie/, /sendBeacon/, /"use server"/, /XMLHttpRequest/, /<form[^>]*\baction=/]) {
      assert.ok(!banned.test(src), `${f}: ${banned}`);
    }
  }
});
