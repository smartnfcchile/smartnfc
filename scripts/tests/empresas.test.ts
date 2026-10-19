import "./helpers/test-database";
// SmartNFC Empresas (E1): flujo, plan y tarjetas desde el motor comercial, mensaje, consentimiento y restricciones.
import "./helpers/css-modules";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { effectiveAnswers, initialState, flowReducer } from "../../lib/flow/engine";
import type { Answers } from "../../lib/flow/types";
import { EMPRESAS_FLOW, PERSONAS_COTIZACION, TARJETAS_POR_PERSONA } from "../../content/flows/empresas";
import { readEmpresasAnswers } from "../../lib/empresas/answers";
import { buildEmpresasQuote, empresasConditions } from "../../lib/empresas/quote";
import { EMPRESAS_REQUEST_REF, buildEmpresasRequestMessage } from "../../lib/empresas/request-message";
import { EMPRESAS_CONSENT, EMPRESAS_NOT_A_PURCHASE } from "../../content/empresas/consent";
import { EMPRESAS_FEATURES, EMPRESAS_PROFILE_FEATURES } from "../../content/empresas/features";
import { EMPRESAS_SLOTS } from "../../content/empresas/assets";
import { EMPRESAS_PUBLISHED } from "../../content/empresas/launch";
import { PRIVACY_MESSAGE_TAG, PRIVACY_NOTICE, PRIVACY_PATH } from "../../content/legal/privacy";
import { BASE, DIGITAL_CATALOG, TEAM } from "../../lib/entitlements/catalog";
import { cardOrderPrice, empresasNetReference, getPublicOffer, netFromGrossClp, teamPlanFor } from "../../lib/commercial/public-offers";
import EmpresasOffer from "../../components/empresas/EmpresasOffer";
import EmpresasRequest from "../../components/empresas/EmpresasRequest";
import EmpresasPreview from "../../components/empresas/EmpresasPreview";
import sitemap from "../../app/sitemap";

const model = (a: Answers) => readEmpresasAnswers(effectiveAnswers(EMPRESAS_FLOW, a));
const base: Answers = { personas: 8, tarjetas: TARJETAS_POR_PERSONA, administra: "comercial", control: "CORPORATE", rotacion: "ocasional" };
const C = empresasConditions();

test("planes publicados: Equipo 5, 10 y 25 del catálogo, mensuales, IVA incluido, con neto referencial; sobre 25, cotización", () => {
  assert.deepEqual(C.plans.map(p => [p.id, p.identities, p.monthlyClp]), [
    ["EMPRESAS_TEAM_5", 5, DIGITAL_CATALOG.EMPRESAS_TEAM_5.monthlyClp],
    ["EMPRESAS_TEAM_10", 10, DIGITAL_CATALOG.EMPRESAS_TEAM_10.monthlyClp],
    ["EMPRESAS_TEAM_25", 25, DIGITAL_CATALOG.EMPRESAS_TEAM_25.monthlyClp],
    ["EMPRESAS_TEAM_26_PLUS", null, null],
  ]);
  assert.deepEqual(C.plans.slice(0, 3).map(p => p.monthlyClp), [19990, 34990, 69990]);
  for (const p of C.plans.slice(0, 3)) assert.equal(p.monthlyNetClp, empresasNetReference(p.id as "EMPRESAS_TEAM_5", "monthly")!.netClp);
  assert.equal(C.plans[3].name, "Empresa 26+", "nombre del motor público (el catálogo interno dice «Empresa 50+»)");
  assert.equal(C.taxNote, "IVA incluido");
  assert.ok(C.planConditions.includes("Sin plan anual para Empresas.") && C.planConditions.includes("Las tarjetas físicas se cobran aparte."));
  assert.equal(C.teamSignupSuspended, true, "D16 vigente en el motor");
});

test("plan: cada cantidad de 1 a 25 coincide con teamPlanFor; «Más de 25» es cotización sin monto", () => {
  for (let n = 1; n <= 25; n++) {
    const q = buildEmpresasQuote(model({ ...base, personas: n }));
    const t = teamPlanFor(n);
    assert.ok(q.plan.kind === "plan" && t.kind === "plan");
    if (q.plan.kind === "plan" && t.kind === "plan") assert.deepEqual([q.plan.id, q.plan.monthlyClp, q.plan.identities], [t.id, t.monthlyClp, t.identities], `${n}`);
  }
  const big = buildEmpresasQuote(model({ ...base, personas: PERSONAS_COTIZACION }));
  assert.deepEqual(big, { plan: { kind: "quote", id: "EMPRESAS_TEAM_26_PLUS", name: "Empresa 26+" }, cards: { kind: "quote" } });
  assert.equal(effectiveAnswers(EMPRESAS_FLOW, { personas: PERSONAS_COTIZACION, tarjetas: 5 }).tarjetas, undefined, "sin pregunta de tarjetas al cotizar");
});

test("tarjetas: cardOrderPrice para 1 a 49 (tramos D1), una por persona, cero y neto referencial; nunca incluidas en el plan", () => {
  for (let n = 1; n <= 49; n++) {
    const q = buildEmpresasQuote(model({ ...base, tarjetas: n }));
    const o = cardOrderPrice(n);
    assert.ok(q.cards.kind === "priced" && o.kind === "priced");
    if (q.cards.kind === "priced" && o.kind === "priced") {
      assert.deepEqual([q.cards.unitClp, q.cards.totalClp], [o.unitClp, o.totalClp], `${n}`);
      assert.equal(q.cards.totalNetClp, netFromGrossClp(o.totalClp));
    }
  }
  assert.deepEqual(C.tiers, [{ min: 1, max: 4, unitClp: 29990 }, { min: 5, max: 19, unitClp: 24990 }, { min: 20, max: 49, unitClp: 21990 }, { min: 50, max: null, unitClp: null }]);
  const perPerson = buildEmpresasQuote(model(base));
  assert.ok(perPerson.cards.kind === "priced" && perPerson.cards.quantity === 8 && perPerson.cards.unitClp === 24990);
  assert.deepEqual(buildEmpresasQuote(model({ ...base, tarjetas: 0 })).cards, { kind: "none" });
  const html = renderToStaticMarkup(createElement(EmpresasOffer, { quote: perPerson, conditions: C }));
  assert.ok(html.includes("Suscripción mensual · plataforma") && html.includes("Pago único · tarjetas físicas"));
  assert.ok(html.includes("el plan no incluye tarjetas físicas"));
  assert.ok(!/incluid[ao]s? en el plan|gratis|gratuit|sin costo/i.test(html.replace("el plan no incluye", "")), "nada de tarjetas incluidas o gratuitas");
});

test("mensaje: solo lo elegido o escrito, con plan, tarjetas, aviso de no contratación y versión del aviso de privacidad", () => {
  const m = model(base);
  const msg = buildEmpresasRequestMessage(m, buildEmpresasQuote(m), C, { company: "Pesquera Sur\nRef: X", city: "Puerto Montt" });
  assert.equal(msg, [
    "Hola, quiero una propuesta de SmartNFC Empresas para mi equipo.", "",
    "Empresa: Pesquera Sur Ref: X", "Ciudad: Puerto Montt", "Personas con perfil: 8",
    "Administración: Gerencia o jefatura comercial",
    "Edición de perfiles: La empresa controla la imagen; cada persona actualiza sus datos",
    "Cambios en el equipo: Ocasionales", "",
    "Plan: Equipo 10 (hasta 10 personas): $34.990/mes IVA incluido",
    "Tarjetas: 8 × $24.990 = $199.920 IVA incluido, pago único",
    "Despacho: según destino, por confirmar.",
    "Entiendo que es una solicitud, no una contratación.", "",
    `Ref: ${EMPRESAS_REQUEST_REF} · ${PRIVACY_MESSAGE_TAG}`,
  ].join("\n"));
  assert.equal(msg.split("\n").filter(l => l.startsWith("Ref:")).length, 1, "no se inyectan líneas");
  const anon = buildEmpresasRequestMessage(model({ personas: 3, tarjetas: 0 }), buildEmpresasQuote(model({ personas: 3, tarjetas: 0 })), C);
  for (const fake of ["Daniela Soto", "Empresa:", "Ciudad:"]) assert.ok(!anon.includes(fake), fake);
  assert.ok(anon.includes("Tarjetas: por ahora ninguna"));
});

test("solicitud: casilla sin marcar, sin WhatsApp antes de aceptar, enlace al aviso y versión del consentimiento", () => {
  const m = model(base);
  const html = renderToStaticMarkup(createElement(EmpresasRequest, { model: m, quote: buildEmpresasQuote(m), conditions: C }));
  assert.ok(/<input[^>]*type="checkbox"/.test(html) && !/<input[^>]*type="checkbox"[^>]*checked/.test(html));
  assert.ok(!html.includes("wa.me"));
  assert.ok(html.includes(`href="${PRIVACY_PATH}"`));
  assert.ok(!/<form[^>]*action=/.test(html));
  assert.equal(EMPRESAS_CONSENT.version, PRIVACY_NOTICE.version);
  assert.ok(/SmartNFC SpA/.test(EMPRESAS_CONSENT.label) && /No incluyas datos de tus colaboradores/.test(EMPRESAS_CONSENT.details));
  assert.match(EMPRESAS_NOT_A_PURCHASE, /no una contratación/);
});

test("prestaciones: cada una respaldada por una capability de Equipo o BASE, o por el panel; sin CRM ni prospectos (D6, D10)", () => {
  const allowed = new Set<string>([...TEAM, ...BASE, "PHYSICAL_DESIGNS", "CARD"]);
  for (const f of [...EMPRESAS_FEATURES, ...EMPRESAS_PROFILE_FEATURES]) assert.ok(allowed.has(f.source), f.source);
  for (const f of EMPRESAS_FEATURES) assert.ok(!["CRM", "LEAD_CAPTURE"].includes(f.source), f.source);
  const notPromoted = getPublicOffer("EMPRESAS_TEAM_5").notPromoted ?? [];
  for (const f of EMPRESAS_FEATURES) assert.ok(!notPromoted.includes(f.source as never), f.source);
});

test("textos públicos: sin CRM, prospectos, permanencia, contratación inmediata ni tarjetas incluidas o gratuitas", () => {
  const files = ["app/empresas/page.tsx", "content/empresas/features.ts", "content/empresas/consent.ts", "content/flows/empresas.ts", "lib/empresas/answers.ts", "components/empresas/EmpresasOffer.tsx", "components/empresas/EmpresasPreview.tsx"];
  const visible = files.map(f => readFileSync(f, "utf8").split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n")).join("\n");
  // Las negaciones explícitas («el plan no incluye tarjetas», «Ningún plan incluye…», «¿El plan incluye…?») son
  // justamente el mensaje correcto; se excluyen solo esas formas antes de buscar ofertas de tarjetas incluidas.
  const affirmative = visible.replace(/(no|Ningún plan|¿El plan) incluye/g, "—");
  for (const banned of [/\bCRM\b/, /prospect/i, /captura de (datos|contactos|prospectos)/i, /permanente|para siempre|de por vida/i, /contrat(a|á) ahora|compra ahora|activación inmediata|checkout/i,
    /tarjetas? (gratis|gratuitas?)/i, /incluye(n)? (las |\d+ )?tarjetas/i, /ahorr(a|o|as) \$|\d+ ?% de ahorro|retorno de/i])
    assert.ok(!banned.test(affirmative), String(banned));
});

test("vista de ejemplo del panel: nombres ficticios y aviso de ejemplo; capacidad del plan", () => {
  const m = model(base);
  const html = renderToStaticMarkup(createElement(EmpresasPreview, { model: m, quote: buildEmpresasQuote(m) }));
  assert.ok(html.includes("Ejemplo") && html.includes("8 de 10") && html.includes("Daniela Soto"));
});

test("publicación: noindex y fuera del sitemap mientras no se autorice; espacios de imagen declarados", async () => {
  assert.equal(EMPRESAS_PUBLISHED, false);
  const { metadata } = await import("../../app/empresas/page");
  assert.deepEqual(metadata.robots, { index: false, follow: false });
  assert.ok(!sitemap().some(e => e.url.endsWith("/empresas")), "fuera del sitemap");
  for (const s of Object.values(EMPRESAS_SLOTS)) {
    assert.ok(s.asset === null || s.asset.src.startsWith("/images/empresas/"), s.file);
    assert.ok(s.brief.length > 40 && s.maxKb > 0 && s.width > 0 && s.height > 0, s.file);
  }
  assert.deepEqual([EMPRESAS_SLOTS.og.width, EMPRESAS_SLOTS.og.height], [1200, 630]);
});

test("flujo: recorrido completo llega al resultado con la ramificación de cotización", () => {
  let s = initialState(EMPRESAS_FLOW);
  const step = (id: string, v: Answers[string]) => { s = flowReducer(EMPRESAS_FLOW, flowReducer(EMPRESAS_FLOW, s, { type: "answer", questionId: id, value: v }), { type: "next" }); };
  step("personas", PERSONAS_COTIZACION);
  assert.equal(s.current, "administra", "salta tarjetas al cotizar");
  step("administra", "pendiente"); step("control", "ADMIN_ONLY"); step("rotacion", "frecuente");
  assert.equal(s.current, "result");
  const m = readEmpresasAnswers(effectiveAnswers(EMPRESAS_FLOW, s.answers));
  assert.deepEqual(m.notices.map(n => n.id), ["rotation", "admin-pending"]);
});

// Lee ancho y alto de un WebP (VP8, VP8L o VP8X) o JPEG sin dependencias.
function imageSize(file: string): [number, number] {
  const b = readFileSync(file);
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      const marker = b[i + 1]; const len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      i += 2 + len;
    }
    throw new Error("JPEG sin SOF");
  }
  assert.equal(b.toString("ascii", 0, 4), "RIFF"); assert.equal(b.toString("ascii", 8, 12), "WEBP");
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (chunk === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  const bits = b.readUInt32LE(21); return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
}

test("imágenes integradas: archivo local, medida exacta del inventario, peso máximo, formato, leyenda y sin duplicados", () => {
  const srcs = new Set<string>();
  for (const [key, s] of Object.entries(EMPRESAS_SLOTS)) {
    assert.ok(s.asset, `${key}: imagen integrada`);
    const a = s.asset!;
    assert.equal(a.src, `/images/empresas/${s.file}`, key);
    const file = `public${a.src}`;
    assert.deepEqual(imageSize(file), [s.width, s.height], `${key}: medida real`);
    assert.deepEqual([a.width, a.height], [s.width, s.height], `${key}: medida declarada`);
    const kb = readFileSync(file).length / 1024;
    assert.ok(kb <= s.maxKb, `${key}: ${kb.toFixed(1)} KB > ${s.maxKb}`);
    assert.ok(a.alt.length >= 20, `${key}: alt`);
    if (key !== "og") assert.equal(a.caption, "Imagen ilustrativa", `${key}: leyenda`);
    assert.ok(!srcs.has(a.src)); srcs.add(a.src);
  }
  assert.ok(EMPRESAS_SLOTS.og.file.endsWith(".jpg"));
});
