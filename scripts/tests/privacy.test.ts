import "./helpers/test-database";
// Aviso de privacidad común (19-10-2026) y su uso en las solicitudes de Locales y Personas.
import "./helpers/css-modules";
import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PRIVACY_CONTROLLER, PRIVACY_MESSAGE_TAG, PRIVACY_NOTICE, PRIVACY_PATH, PRIVACY_SECTIONS } from "../../content/legal/privacy";
import { PERSONAS_CONSENT } from "../../content/personas/consent";
import { REQUEST_CONSENT } from "../../content/locales/consent";
import { SALES_WHATSAPP_DIGITS } from "../../content/locales/contact";
import PrivacidadPage, { metadata } from "../../app/privacidad/page";

const all = PRIVACY_SECTIONS.flatMap(s => [s.title, ...(s.paragraphs ?? []), ...(s.items ?? [])]).join("\n");

test("responsable identificado con los datos entregados por el titular", () => {
  assert.deepEqual(
    [PRIVACY_CONTROLLER.legalName, PRIVACY_CONTROLLER.rut, PRIVACY_CONTROLLER.email, PRIVACY_CONTROLLER.whatsappDigits],
    ["SmartNFC SpA", "78.502.112-6", "contacto@smartnfc.cl", SALES_WHATSAPP_DIGITS],
  );
  assert.match(PRIVACY_CONTROLLER.address, /Santa Beatriz 170, oficina 903, piso 9, Providencia, Santiago/);
  for (const v of Object.values(PRIVACY_CONTROLLER)) assert.ok(all.includes(String(v)) || v === SALES_WHATSAPP_DIGITS, String(v));
});

test("contenido mínimo: datos, finalidad, proveedores, transferencias, conservación, derechos, sensibles y menores", () => {
  for (const t of ["número de teléfono", "Exclusivamente para responder", "WhatsApp, servicio de Meta", "Vercel", "fuera de Chile",
    "6 meses desde el último contacto", "acceso, rectificación, supresión u oposición", "datos sensibles", "menores de 18 años",
    "no se envían a servidores", "exclusivamente su titular", "no es una compra"]) assert.ok(all.includes(t), t);
  assert.ok(!/CRM|listas de difusión/.test(all) || /No incorporamos/.test(all), "no CRM ni difusión");
});

test("sin afirmaciones no verificadas: pendiente de validación legal, sin certificaciones ni 'no almacenamos'", () => {
  assert.match(PRIVACY_NOTICE.status, /pendiente de validación legal/i);
  for (const banned of [/aprobado por (un )?abogado/i, /certificad/i, /no (almacenamos|guardamos|conservamos) (ningún|tus) datos/i, /cumple (con )?la ley/i, /garantiza/i])
    assert.ok(!banned.test(all), String(banned));
});

test("consentimientos de Locales y Personas: versión del aviso, sin afirmar que SmartNFC no conserva datos", () => {
  for (const c of [PERSONAS_CONSENT, REQUEST_CONSENT]) {
    const text = `${c.label} ${c.details}`;
    assert.equal(c.version, PRIVACY_NOTICE.version);
    assert.ok(text.includes("SmartNFC SpA") && text.includes("Meta") && text.includes("tu número"), text);
    assert.ok(/conserva según el aviso de privacidad/.test(text));
    assert.ok(/datos sensibles/.test(text) && /menor de 18 años/.test(text));
    assert.ok(!/no guarda tus respuestas ni tus datos/.test(text), "texto anterior retirado");
  }
  assert.equal(PRIVACY_MESSAGE_TAG, `Aviso de privacidad ${PRIVACY_NOTICE.version}`);
});

test("página /privacidad: fuera de buscadores, aviso de pendiente legal, todas las secciones con ancla", () => {
  assert.equal(PRIVACY_PATH, "/privacidad");
  assert.deepEqual(metadata.robots, { index: false, follow: false });
  const html = renderToStaticMarkup(createElement(PrivacidadPage));
  assert.ok(html.includes("Texto pendiente de validación legal."));
  assert.ok(html.includes(PRIVACY_NOTICE.version));
  for (const s of PRIVACY_SECTIONS) assert.ok(html.includes(`id="${s.id}"`) && html.includes(`href="#${s.id}"`), s.id);
  assert.ok(html.includes('href="mailto:contacto@smartnfc.cl"'));
  assert.ok(!/<script[^>]*src=/.test(html) && !/<form/.test(html), "sin scripts externos ni formularios");
});

test("campos opcionales de datos personales desactivados hasta la revisión legal (Personas, Empresas y Locales)", async () => {
  const { REQUEST_PERSONAL_FIELDS_ENABLED } = await import("../../content/legal/privacy");
  assert.equal(REQUEST_PERSONAL_FIELDS_ENABLED, false);
  const { effectiveAnswers } = await import("../../lib/flow/engine");
  const { PERSONAS_FLOW } = await import("../../content/flows/personas");
  const { readPersonasAnswers } = await import("../../lib/personas/answers");
  const { buildPersonasQuote, personasConditions } = await import("../../lib/personas/quote");
  const PersonasRequest = (await import("../../components/personas/PersonasRequest")).default;
  const pm = readPersonasAnswers(effectiveAnswers(PERSONAS_FLOW, { uso: "oficio", mostrar: ["whatsapp"], estilo: "claro", color: "azul", cantidad: 2 }));
  const ph = renderToStaticMarkup(createElement(PersonasRequest, { model: pm, quote: buildPersonasQuote(pm), conditions: personasConditions() }));
  const { EMPRESAS_FLOW } = await import("../../content/flows/empresas");
  const { readEmpresasAnswers } = await import("../../lib/empresas/answers");
  const { buildEmpresasQuote, empresasConditions } = await import("../../lib/empresas/quote");
  const EmpresasRequest = (await import("../../components/empresas/EmpresasRequest")).default;
  const em = readEmpresasAnswers(effectiveAnswers(EMPRESAS_FLOW, { personas: 4, tarjetas: 4, administra: "comercial", control: "FLEXIBLE", rotacion: "baja" }));
  const eh = renderToStaticMarkup(createElement(EmpresasRequest, { model: em, quote: buildEmpresasQuote(em), conditions: empresasConditions() }));
  for (const html of [ph, eh]) {
    assert.ok(!/<input[^>]*type="text"/.test(html), "sin campos de texto");
    assert.ok(/<input[^>]*type="checkbox"/.test(html) && html.includes('href="/privacidad"'), "consentimiento y aviso se mantienen");
  }
  const { readFileSync } = await import("node:fs");
  assert.ok(readFileSync("components/locales/LocalesRequest.tsx", "utf8").includes("{REQUEST_PERSONAL_FIELDS_ENABLED && ("), "Locales usa la misma desactivación");
});

test("SEO: redes oficiales, Organization con sameAs y correo único, y noindex en perfiles de clientes y autenticación", async () => {
  const { SOCIAL_LINKS, SOCIAL_URLS } = await import("../../content/social");
  assert.deepEqual(SOCIAL_LINKS.map(s => s.href), [
    "https://www.instagram.com/smartnfc_oficial/", "https://www.facebook.com/profile.php?id=61588700696550",
    "https://www.tiktok.com/@smartnfc.cl", "https://www.linkedin.com/company/smartnfc-chile-spa/", "https://www.youtube.com/@SmartNFCChile",
  ]);
  for (const s of SOCIAL_LINKS) assert.ok(/^M[\d.\s-]/.test(s.path) && s.path.length > 100, `${s.id}: ícono`);
  const { organizationSchema, faqSchema, serviceSchema } = await import("../../lib/seo/structured-data");
  const org = organizationSchema();
  assert.deepEqual(org.sameAs, [...SOCIAL_URLS]);
  assert.equal(org.email, "contacto@smartnfc.cl");
  assert.equal(org.telephone, "+56930106251");
  assert.equal(faqSchema([["¿P?", "R."]]).mainEntity[0].acceptedAnswer.text, "R.");
  const svc = serviceSchema({ path: "/x", name: "N", description: "D", serviceType: "T", offers: [{ name: "Plan", price: 100, unit: "mes" }] });
  assert.equal((svc as { provider: { "@id": string } }).provider["@id"], "https://www.smartnfc.cl/#organization");
  const SocialLinks = (await import("../../components/brand/SocialLinks")).default;
  const html = renderToStaticMarkup(createElement(SocialLinks));
  assert.equal((html.match(/target="_blank" rel="noopener noreferrer"/g) ?? []).length, 5);
  assert.ok(html.includes('aria-label="Instagram (se abre en una pestaña nueva)"'));
  const config = (await import("../../next.config")).default as { headers: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]> };
  const rules = await config.headers();
  for (const p of ["/c/:path*", "/login", "/activar-cuenta", "/olvide-mi-contrasena", "/restablecer-contrasena"])
    assert.ok(rules.some(r => r.source === p && r.headers.some(h => h.key === "X-Robots-Tag" && h.value.startsWith("noindex"))), p);
  const robots = (await import("../../app/robots")).default();
  const rule = Array.isArray(robots.rules) ? robots.rules[0] : robots.rules;
  assert.deepEqual(rule.disallow, ["/api/", "/dashboard/", "/superadmin/"]);
  const sitemap = (await import("../../app/sitemap")).default().map(e => e.url);
  // Desde el 23-10-2026 Personas y Empresas son indexables; /privacidad sigue fuera hasta la validación legal.
  for (const listed of ["/", "/local", "/personas", "/empresas", "/blog"]) assert.ok(sitemap.includes(`https://www.smartnfc.cl${listed === "/" ? "/" : listed}`), listed);
  assert.ok(!sitemap.some(u => u.endsWith("/privacidad") || u.includes("/c/") || u.includes("/login")), "rutas privadas fuera del sitemap");
  const personas = (await import("../../app/personas/page")).metadata;
  assert.deepEqual(personas.robots, { index: true, follow: true });
  assert.deepEqual(personas.alternates, { canonical: "/personas" });
  assert.equal((personas.twitter as { card?: string })?.card, "summary_large_image");
  const priv = (await import("../../app/privacidad/page")).metadata;
  assert.deepEqual(priv.robots, { index: false, follow: false });
});
