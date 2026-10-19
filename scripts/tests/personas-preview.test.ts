import "./helpers/test-database";
// P2 SmartNFC Personas: datos ficticios de las vistas previas (perfil real y tarjeta física real).
import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { effectiveAnswers } from "../../lib/flow/engine";
import type { Answers } from "../../lib/flow/types";
import { PERSONAS_FLOW } from "../../content/flows/personas";
import { COLOR_HEX, ESTILO_TEMPLATE, PERSONAS_EXAMPLES, readPersonasAnswers } from "../../lib/personas/answers";
import { DEMO_QR_PATH, ESTILO_PHYSICAL_TEMPLATE, EXAMPLE_CONTACT, PREVIEW_CARD_ID, demoQrUrl, previewCardSides, previewProfile, previewSummaryText } from "../../lib/personas/preview-data";
import { PHYSICAL_CARD_TEMPLATES } from "../../lib/physical-card/templates";
import CardProfileView from "../../components/card-profile/CardProfileView";
import CardPreview from "../../components/physical-card/CardPreview";

const model = (a: Answers) => readPersonasAnswers(effectiveAnswers(PERSONAS_FLOW, a));
const full: Answers = {
  uso: "oficio", ocupacion: "Maestro soldador", mostrar: ["whatsapp", "llamada", "redes", "trabajos"],
  redes: ["INSTAGRAM", "FACEBOOK"], contenidoDonde: "instagram", estilo: "claro", color: "verde", cantidad: 2,
};

test("perfil de ejemplo: nombre aprobado, sin empresa, sin captura de datos (D6) y sin video de terceros", () => {
  const p = previewProfile(model(full));
  assert.equal(p.id, PREVIEW_CARD_ID);
  assert.equal(p.name, "Miguel Rojas");
  assert.equal(p.role, "Maestro soldador");
  assert.equal(p.companyName, null);
  assert.equal(p.shareContactEnabled, false);
  assert.equal(p.videoUrl, null);
  assert.deepEqual([p.avatarUrl, p.coverUrl, p.logoUrl, p.heroImageUrl], [null, null, null, null], "iniciales, sin fotos");
});

test("perfil de ejemplo: muestra solo lo elegido en P2 y P2a", () => {
  const p = previewProfile(model(full));
  assert.deepEqual([p.showWhatsapp, p.showPhone, p.showEmail], [true, true, false]);
  assert.equal(p.whatsapp, EXAMPLE_CONTACT.phone);
  assert.equal(p.email, null);
  assert.deepEqual([p.showInstagram, p.showFacebook, p.showLinkedin, p.showTiktok, p.showYoutube], [true, true, false, false, false]);
  assert.deepEqual(p.links.map(l => l.title), ["Mis trabajos en Instagram"]);
  assert.equal(p.location, null, "sin «Zona o ubicación»");
  const q = previewProfile(model({ ...full, uso: "profesional", mostrar: ["correo", "agenda", "zona"] }));
  assert.equal(q.email, "diego.torres@example.com");
  assert.deepEqual(q.links.map(l => l.title), ["Agenda o sitio web"]);
  assert.equal(q.location, EXAMPLE_CONTACT.location, "la zona es el campo de texto del perfil, sin mapa");
});

test("perfil de ejemplo: datos de contacto claramente ficticios", () => {
  assert.equal(EXAMPLE_CONTACT.emailDomain, "example.com", "dominio reservado (RFC 2606)");
  assert.equal(EXAMPLE_CONTACT.phone, "+56 9 0000 0000");
  for (const uso of Object.keys(PERSONAS_EXAMPLES)) {
    const p = previewProfile(model({ uso, mostrar: ["correo", "trabajos", "catalogo", "agenda"] }));
    for (const l of p.links) assert.match(l.url, /^https:\/\/example\.com\//, `${uso}: ${l.url}`);
  }
});

test("estilo y color del perfil: formato real y color elegido", () => {
  const p = previewProfile(model(full));
  assert.equal(p.template, ESTILO_TEMPLATE.claro);
  assert.equal(p.themeColor, COLOR_HEX.verde);
  const d = previewProfile(model({}));
  assert.deepEqual([d.template, d.themeColor, d.name, d.role], ["classic-dark", "#2563EB", "Camila Vega", null]);
});

test("vista previa del perfil real: sin enlaces navegables, imágenes externas ni iframes", () => {
  for (const a of [full, { ...full, uso: "personal" }, { uso: "profesional", mostrar: ["correo", "agenda", "zona"], estilo: "llamativo" }]) {
    const html = renderToStaticMarkup(createElement(CardProfileView, { card: previewProfile(model(a)), isPreview: true }));
    assert.ok(!/href="/.test(html), "sin enlaces");
    assert.ok(!/<img\b/.test(html), "sin imágenes");
    assert.ok(!/<iframe\b/.test(html), "sin iframes");
    assert.ok(!html.includes("Compárteme"), "sin captura de datos");
  }
});

test("tarjeta física: plantillas profesionales reales, color elegido y textos de ejemplo", () => {
  for (const [estilo, slug] of Object.entries(ESTILO_PHYSICAL_TEMPLATE)) {
    const t = PHYSICAL_CARD_TEMPLATES.find(x => x.slug === slug);
    assert.ok(t && t.category === "PROFESSIONAL" && !t.premium, `${estilo}: ${slug}`);
    assert.notEqual(t!.layout, "photo-split", "sin plantillas que requieren fotografía");
  }
  const { front, back } = previewCardSides(model(full));
  assert.deepEqual([front.name, front.position, front.company], ["Miguel Rojas", "Maestro soldador", ""]);
  assert.equal(front.secondary, COLOR_HEX.verde, "claro → minimalista: color en el acento");
  assert.equal(previewCardSides(model({ ...full, estilo: "oscuro" })).front.primary, COLOR_HEX.verde, "oscuro: color en la franja");
  assert.deepEqual([front.nfcVisible, front.qrVisible, back.qrVisible], [true, false, true]);
  assert.deepEqual([front.phone, front.email, front.logoUrl, front.photoUrl], ["", "", "", ""], "sin contactos ni imágenes en la tarjeta de ejemplo");
  const minimal = previewCardSides(model({ ...full, estilo: "claro", color: "rojo" })).front;
  assert.equal(minimal.layout, "minimal");
  assert.equal(minimal.secondary, COLOR_HEX.rojo, "minimalista: el color elegido va en el acento");
  const bold = previewCardSides(model({ ...full, estilo: "llamativo", color: "naranjo" })).front;
  assert.deepEqual([bold.layout, bold.primary], ["bottom-band", COLOR_HEX.naranjo], "llamativo: banda ancha en el color elegido");
  assert.equal(new Set(Object.values(ESTILO_PHYSICAL_TEMPLATE)).size, 4, "una plantilla distinta por estilo");
});

test("QR de demostración: apunta a la ruta real /personas, nunca a un perfil ficticio", () => {
  assert.equal(DEMO_QR_PATH, "/personas");
  assert.equal(demoQrUrl(), "https://www.smartnfc.cl/personas");
  assert.ok(!demoQrUrl().includes("/c/"), "no es un perfil");
  const { back } = previewCardSides(model(full));
  const html = renderToStaticMarkup(createElement(CardPreview, { side: back, publicUrl: demoQrUrl() }));
  assert.ok(html.includes('aria-label="QR hacia https://www.smartnfc.cl/personas"'));
  assert.ok(!/<img\b|\bsrc=/.test(html), "QR local, sin solicitudes externas");
});

test("texto equivalente para lectores de pantalla", () => {
  assert.equal(previewSummaryText(model({})), "Perfil de ejemplo de Camila Vega. Aún no eliges qué mostrar.");
  assert.equal(previewSummaryText(model(full)),
    "Perfil de ejemplo de Miguel Rojas, Maestro soldador. Mostraría: WhatsApp, Llamada, Redes sociales, Mis trabajos, Guardar contacto, Compartir. Redes: Instagram, Facebook. Estilo claro, color verde.");
});
