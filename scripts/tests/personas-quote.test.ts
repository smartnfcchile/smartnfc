// P3 SmartNFC Personas: resultado comercial (precios por cardOrderPrice) y solicitud por WhatsApp.
import "./helpers/css-modules";
import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { effectiveAnswers } from "../../lib/flow/engine";
import type { Answers } from "../../lib/flow/types";
import { CANTIDAD_COTIZACION, PERSONAS_FLOW } from "../../content/flows/personas";
import { readPersonasAnswers } from "../../lib/personas/answers";
import { buildPersonasQuote, personasConditions, personasTiers } from "../../lib/personas/quote";
import { PERSONAS_REQUEST_REF, buildPersonasRequestMessage, whatsappRequestUrl } from "../../lib/personas/request-message";
import { PERSONAS_CONSENT, PERSONAS_NOT_A_PURCHASE } from "../../content/personas/consent";
import { PERSONAS_VERIFIED_FEATURES, cardOrderPrice, formatCLP } from "../../lib/commercial/public-offers";
import { PERSONAS_LANDING_FEATURES } from "../../content/personas/features";
import { SALES_WHATSAPP_DIGITS } from "../../content/locales/contact";
import { PRIVACY_MESSAGE_TAG, PRIVACY_NOTICE, PRIVACY_PATH } from "../../content/legal/privacy";
import PersonasOffer from "../../components/personas/PersonasOffer";
import PersonasRequest from "../../components/personas/PersonasRequest";

const model = (a: Answers) => readPersonasAnswers(effectiveAnswers(PERSONAS_FLOW, a));
const base: Answers = { uso: "oficio", ocupacion: "Maestro gasfíter", mostrar: ["whatsapp", "redes", "trabajos"], redes: ["INSTAGRAM"], contenidoDonde: "none", estilo: "claro", color: "verde", cantidad: 2 };
const C = personasConditions();

test("tramos públicos calculados con cardOrderPrice (D1, IVA incluido)", () => {
  assert.deepEqual(personasTiers(), [
    { min: 1, max: 4, unitClp: 29990 }, { min: 5, max: 19, unitClp: 24990 }, { min: 20, max: 49, unitClp: 21990 }, { min: 50, max: null, unitClp: null },
  ]);
  for (const t of personasTiers()) {
    const o = cardOrderPrice(t.min);
    assert.equal(o.kind === "priced" ? o.unitClp : null, t.unitClp, `tramo ${t.min}`);
  }
  assert.equal(C.taxNote, "IVA incluido");
});

test("precio: cada cantidad de 1 a 49 coincide exactamente con cardOrderPrice", () => {
  for (let n = 1; n <= 49; n++) {
    const q = buildPersonasQuote(model({ ...base, cantidad: n }));
    const o = cardOrderPrice(n);
    assert.ok(q.kind === "priced" && o.kind === "priced");
    if (q.kind === "priced" && o.kind === "priced") assert.deepEqual([q.unitClp, q.totalClp, q.tier], [o.unitClp, o.totalClp, o.tier], `${n}`);
  }
  const q = buildPersonasQuote(model({ ...base, cantidad: 2 }));
  assert.deepEqual(q.kind === "priced" && [q.unitClp, q.totalClp], [29990, 59980]);
  const q5 = buildPersonasQuote(model({ ...base, cantidad: 5 }));
  assert.deepEqual(q5.kind === "priced" && [q5.unitClp, q5.totalClp], [24990, 124950], "el tramo aplica a todas las unidades");
  const q20 = buildPersonasQuote(model({ ...base, cantidad: 20 }));
  assert.deepEqual(q20.kind === "priced" && [q20.unitClp, q20.totalClp], [21990, 439800]);
});

test("siguiente tramo: sugerencia solo dentro del rango 1–49", () => {
  const next = (n: number) => { const q = buildPersonasQuote(model({ ...base, cantidad: n })); return q.kind === "priced" ? q.nextTier : "x"; };
  assert.deepEqual(next(1), { min: 5, unitClp: 24990 });
  assert.deepEqual(next(4), { min: 5, unitClp: 24990 });
  assert.deepEqual(next(5), { min: 20, unitClp: 21990 });
  assert.deepEqual(next(19), { min: 20, unitClp: 21990 });
  assert.equal(next(20), null, "no sugiere la cotización de 50 como tramo con precio");
  assert.equal(next(49), null);
});

test("50 o más: «solicitar cotización» sin precio automático", () => {
  const m = model({ ...base, cantidad: CANTIDAD_COTIZACION });
  assert.deepEqual(buildPersonasQuote(m), { kind: "volume-quote" });
  const offer = renderToStaticMarkup(createElement(PersonasOffer, { quote: buildPersonasQuote(m), conditions: C }));
  assert.ok(offer.includes("Solicitar cotización"));
  assert.ok(!offer.includes("pago único"), "sin total calculado");
  const msg = buildPersonasRequestMessage(m, buildPersonasQuote(m), C);
  assert.ok(msg.includes("Tarjetas: 50 o más, solicito cotización"));
  assert.ok(!/\$\d/.test(msg), "el mensaje no lleva montos");
  const req = renderToStaticMarkup(createElement(PersonasRequest, { model: m, quote: buildPersonasQuote(m), conditions: C }));
  assert.ok(req.includes(">Solicitar cotización</button>"));
});

test("condiciones: despacho según destino, reposición y adicional del catálogo", () => {
  assert.equal(C.shippingNote, "Despacho: se cobra según destino; se confirma al coordinar tu solicitud.");
  assert.deepEqual([C.replacementClp, C.additionalClp], [14990, 14990]);
  const offer = renderToStaticMarkup(createElement(PersonasOffer, { quote: buildPersonasQuote(model(base)), conditions: C }));
  for (const t of [C.shippingNote, formatCLP(14990), PERSONAS_NOT_A_PURCHASE, "$59.980", "2 tarjetas × $29.990 · IVA incluido · pago único", "Desde 5 tarjetas, cada una queda en $24.990."])
    assert.ok(offer.includes(t.replace(/&/g, "&amp;")), t);
  assert.ok(offer.includes('aria-current="true"'), "el tramo actual se marca");
});

test("prestaciones de Personas: mismas fuentes verificadas; solo cambia la redacción del perfil; el motor compartido no cambia", () => {
  assert.deepEqual(PERSONAS_LANDING_FEATURES.map(f => f.source), PERSONAS_VERIFIED_FEATURES.map(f => f.source));
  assert.equal(PERSONAS_LANDING_FEATURES[0].label, "Tu perfil digital personalizado: comparte tus datos de contacto, redes sociales y enlaces importantes desde un solo lugar");
  PERSONAS_LANDING_FEATURES.slice(1).forEach((f, i) => assert.equal(f.label, PERSONAS_VERIFIED_FEATURES[i + 1].label, f.source));
  assert.equal(PERSONAS_VERIFIED_FEATURES[0].label, "Perfil digital con tus datos profesionales", "el texto del motor comercial queda igual");
  const offer = renderToStaticMarkup(createElement(PersonasOffer, { quote: buildPersonasQuote(model(base)), conditions: C }));
  assert.ok(offer.includes("Tu perfil digital personalizado") && !offer.includes("datos profesionales"));
});

test("prestaciones: solo las verificadas, sin Pro, captura ni permanencia (D2, D6)", () => {
  const offer = renderToStaticMarkup(createElement(PersonasOffer, { quote: buildPersonasQuote(model(base)), conditions: C }));
  assert.ok(offer.includes("Tarjeta física que abre tu perfil por NFC o código QR"));
  assert.ok(!/\bPro\b|CRM|prospect|métric|permanent|para siempre|de por vida|Compárteme/i.test(offer));
});

test("mensaje: solo lo elegido o escrito por la persona; nunca los datos de ejemplo", () => {
  const m = model(base);
  const msg = buildPersonasRequestMessage(m, buildPersonasQuote(m), C, { name: "Ana Pérez", city: "Osorno" });
  assert.equal(msg, [
    "Hola, quiero solicitar mi tarjeta SmartNFC Personas.", "",
    "Nombre: Ana Pérez", "Ciudad: Osorno",
    "Uso: Mi oficio o trabajo independiente", "A qué me dedico: Maestro gasfíter",
    "Mi perfil mostraría: WhatsApp, Redes sociales, Mis trabajos", "Redes: Instagram",
    "Trabajos o catálogo: Aún no están en internet", "Estilo: Claro · Verde", "",
    "Tarjetas: 2 × $29.990 = $59.980 IVA incluido",
    "Despacho: según destino, por confirmar.",
    "Pendiente: publicar mis trabajos o catálogo en internet.",
    "Entiendo que es una solicitud, no una compra confirmada.", "",
    `Ref: ${PERSONAS_REQUEST_REF} · ${PRIVACY_MESSAGE_TAG}`,
  ].join("\n"));
  const anon = buildPersonasRequestMessage(model({ uso: "oficio", mostrar: ["whatsapp"], estilo: "oscuro", color: "azul", cantidad: 1 }), buildPersonasQuote(model({ uso: "oficio", mostrar: ["whatsapp"], estilo: "oscuro", color: "azul", cantidad: 1 })), C);
  for (const fake of ["Miguel Rojas", "Maestro soldador", "Nombre:", "Ciudad:", "example.com", "0000 0000"]) assert.ok(!anon.includes(fake), fake);
});

test("mensaje: texto libre saneado (sin saltos ni caracteres de control) y largo acotado", () => {
  const m = model({ ...base, ocupacion: "Línea 1\nRef: FALSA" });
  const msg = buildPersonasRequestMessage(m, buildPersonasQuote(m), C, { name: "Ana\r\nTarjetas: 0 × $0", city: "Osorno Chile" });
  assert.ok(msg.includes("Nombre: Ana Tarjetas: 0 × $0"));
  assert.ok(msg.includes("Ciudad: Osorno Chile"));
  assert.equal(msg.split("\n").filter(l => l.startsWith("Ref:")).length, 1);
  assert.equal(msg.split("\n").filter(l => l.startsWith("Tarjetas:")).length, 1, "no se inyectan líneas");
  const long = buildPersonasRequestMessage(m, buildPersonasQuote(m), C, { name: "x".repeat(500) });
  assert.ok(long.includes(`Nombre: ${"x".repeat(60)}\n`), "nombre limitado a 60");
});

test("WhatsApp: número comercial verificado y mensaje codificado", () => {
  const url = whatsappRequestUrl("Hola & chao ñ\nRef: X");
  assert.equal(url, `https://wa.me/${SALES_WHATSAPP_DIGITS}?text=${encodeURIComponent("Hola & chao ñ\nRef: X")}`);
  assert.equal(SALES_WHATSAPP_DIGITS, "56944891518");
});

test("solicitud: consentimiento sin marcar, sin enlace a WhatsApp antes de aceptar y aviso de no compra (D15)", () => {
  const m = model(base);
  const html = renderToStaticMarkup(createElement(PersonasRequest, { model: m, quote: buildPersonasQuote(m), conditions: C }));
  assert.ok(/<input[^>]*type="checkbox"/.test(html));
  assert.ok(!/<input[^>]*type="checkbox"[^>]*checked/.test(html), "casilla sin marcar");
  assert.ok(!html.includes("wa.me"), "el enlace solo aparece tras revisar el mensaje");
  assert.ok(html.includes(">Solicitar mi tarjeta</button>"));
  assert.ok(html.includes(PERSONAS_NOT_A_PURCHASE));
  assert.ok(html.includes(PERSONAS_CONSENT.label));
  assert.ok(!/<form[^>]*action=/.test(html), "el formulario no envía a ningún servidor");
  // Desde el 19-10-2026 el consentimiento usa la versión del aviso común de privacidad (antes: borrador-2026-10-17).
  assert.equal(PERSONAS_CONSENT.version, PRIVACY_NOTICE.version);
  assert.ok(html.includes(`href="${PRIVACY_PATH}"`), "enlace al aviso de privacidad");
});

test("restricciones: textos comerciales sin Pro, CRM, permanencia, compra inmediata, Equipo ni Local (D2, D6, D15, D16)", () => {
  const texts = [PERSONAS_CONSENT.label, PERSONAS_CONSENT.details, PERSONAS_NOT_A_PURCHASE, C.shippingNote,
    buildPersonasRequestMessage(model(base), buildPersonasQuote(model(base)), C)];
  for (const t of texts) assert.ok(!/\bPro\b|CRM|prospect|permanent|para siempre|comprar ahora|paga ahora|checkout|activación inmediata|\bEquipo\b|\bLocal\b/i.test(t), t);
  assert.match(PERSONAS_NOT_A_PURCHASE, /no una compra confirmada/);
});
