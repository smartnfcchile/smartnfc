import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ACTION_DEFAULT_LABELS, PUBLIC_ACTION_TYPES, actionTypeFromUrl, buildContactActions, resolveContactActions, resolvePointActions, toPublicActions, visibleActions,
  type PointActionSource } from "../../lib/local/public-actions";
import { effectivePresentationLabel, effectivePresentationMode, pointConfigurationSchema } from "../../lib/local/point-config";
import { resolveLocalBrand } from "../../lib/local/brand";
import { ACTION_ICONS } from "../../components/local/public/action-icons";
import LocalLandingView from "../../components/local/public/LocalLandingView";
import LocalIdentityPreview from "../../components/local/public/LocalIdentityPreview";

const brand = resolveLocalBrand({
  location: { name: "Sucursal Centro", displayName: "Café Demo", shortDescription: "Café de especialidad.", primaryColor: "#0f766e",
    phone: "+56912345678", websiteUrl: "https://www.ejemplo.cl", mapsUrl: "https://maps.app.goo.gl/demo", address: "Calle Demo 123" },
  company: { name: "Negocio Demo" },
});
const point = (objective: PointActionSource["objective"], destinationUrl: string | null, smartLinks: Array<{ label: string; url: string }> = []): PointActionSource =>
  ({ objective, destinationUrl, smartLinks, actions: [] });
const links = (p: PointActionSource, visitId?: string) => toPublicActions(resolvePointActions(p), { interactive: true, code: "abc123def456", version: 7, visitId });

test("Acciones: el tipo visual se deduce del dominio y no acepta dominios impostores", () => {
  const cases: Array<[string, string]> = [
    ["https://wa.me/56912345678", "WHATSAPP"], ["https://www.instagram.com/demo", "INSTAGRAM"], ["https://facebook.com/demo", "FACEBOOK"],
    ["https://www.tiktok.com/@demo", "TIKTOK"], ["https://youtu.be/x", "YOUTUBE"], ["https://www.linkedin.com/company/demo", "LINKEDIN"],
    ["https://x.com/demo", "X"], ["https://twitter.com/demo", "X"], ["https://www.threads.net/@demo", "THREADS"],
    ["https://g.page/r/demo/review", "GOOGLE_REVIEW"], ["https://www.ejemplo.cl/menu", "WEB"],
    ["https://instagram.com.evil.example/demo", "WEB"], ["https://evilwa.me/x", "WEB"], ["no-es-url", "LINK"],
  ];
  for (const [url, type] of cases) assert.equal(actionTypeFromUrl(url), type, url);
});

test("Acciones: cada objetivo tiene su acción protagonista y los enlaces pasan por /go con URL guardada en servidor", () => {
  const expected = { WHATSAPP: "WHATSAPP", GOOGLE_REVIEW: "GOOGLE_REVIEW", MENU: "MENU", PROMOTION: "PROMOTION" } as const;
  for (const [objective, type] of Object.entries(expected)) {
    const [a] = links(point(objective as "MENU", "https://destino.example/secreto"), "v-1");
    assert.equal(a.type, type); assert.equal(a.group, "primary"); assert.equal(a.label, ACTION_DEFAULT_LABELS[type]);
    assert.equal(a.href, "/p/abc123def456/go?action=primary&version=7&v=v-1");
    assert.ok(!a.href!.includes("destino.example"), "el href nunca expone ni acepta la URL de destino");
  }
  assert.equal(links(point("SOCIAL", "https://www.instagram.com/demo"))[0].type, "INSTAGRAM");
  assert.equal(links(point("SOCIAL", "https://www.instagram.com/demo"))[0].label, "Síguenos en Instagram");
  assert.equal(toPublicActions(resolvePointActions(point("WHATSAPP", "https://wa.me/1")), { interactive: false })[0].href, undefined, "vista previa sin enlaces");
  assert.deepEqual(resolvePointActions(point("CLUB", null)), []);
  const smart = links(point("SMART_LANDING", null, [{ label: "Menú", url: "https://ejemplo.cl/menu" }, { label: "Instagram", url: "https://instagram.com/demo" }]));
  assert.deepEqual(smart.map(a => [a.group, a.type, a.href]), [
    ["primary", "WEB", "/p/abc123def456/go?action=link-0&version=7"], ["secondary", "INSTAGRAM", "/p/abc123def456/go?action=link-1&version=7"]]);
  for (const type of Object.values(expected)) assert.ok(!/reseña publicada|mensaje enviado|seguidor|compra|conversi/i.test(ACTION_DEFAULT_LABELS[type]));
});

test("Acciones: contacto solo con datos existentes, tel: directo con ping y orden/activación respetados", () => {
  const contact = buildContactActions(brand, { interactive: true });
  assert.deepEqual(contact.map(a => [a.type, a.href]), [["PHONE", "tel:+56912345678"], ["LOCATION", "https://maps.app.goo.gl/demo"], ["WEB", "https://www.ejemplo.cl"]]);
  assert.deepEqual(buildContactActions(resolveLocalBrand({ company: { name: "Negocio Demo" } }), { interactive: true }), []);
  const tracked = toPublicActions(resolveContactActions(brand), { interactive: true, code: "abc123def456", version: 3, visitId: "v-9" });
  assert.equal(tracked[0].href, "tel:+56912345678", "el teléfono se abre directo");
  assert.equal(tracked[0].ping, "/p/abc123def456/go?action=contact-phone&version=3&v=v-9", "y su clic se registra con ping");
  assert.equal(tracked[1].href, "/p/abc123def456/go?action=contact-location&version=3&v=v-9");
  const list = [{ ...contact[0], order: 5 }, { ...contact[1], order: 1 }, { ...contact[2], enabled: false }];
  assert.deepEqual(visibleActions(list, "contact").map(a => a.type), ["LOCATION", "PHONE"]);
});

test("Íconos: el registro cubre todos los tipos de acción sin emojis", () => {
  for (const type of PUBLIC_ACTION_TYPES) {
    assert.ok(ACTION_ICONS[type], type);
    const svg = renderToStaticMarkup(createElement(ACTION_ICONS[type], { className: "h-5 w-5" }));
    assert.match(svg, /^<svg[\s\S]*<\/svg>$/, type);
  }
});

test("Modo de presentación: DIRECT por defecto, LANDING permitido salvo en CLUB", () => {
  const base = { name: "Caja", location: "Caja principal", medium: "NFC_QR", isActive: true, smartLinks: [] };
  assert.equal(pointConfigurationSchema.parse({ ...base, objective: "MENU", destinationUrl: "https://ejemplo.cl/menu" }).presentationMode, "DIRECT");
  assert.equal(pointConfigurationSchema.safeParse({ ...base, objective: "MENU", destinationUrl: "https://ejemplo.cl/menu", presentationMode: "LANDING" }).success, true);
  assert.equal(pointConfigurationSchema.safeParse({ ...base, objective: "CLUB", presentationMode: "LANDING" }).success, false);
  assert.equal(pointConfigurationSchema.safeParse({ ...base, objective: "CLUB", presentationMode: "DIRECT" }).success, true);
  assert.equal(pointConfigurationSchema.safeParse({ ...base, objective: "MENU", destinationUrl: "https://ejemplo.cl/menu", presentationMode: "POPUP" }).success, false);
});

test("Modo efectivo: Smart Landing siempre es Página del Local; Club siempre su página; el resto respeta el modo", () => {
  assert.equal(effectivePresentationMode("SMART_LANDING", "DIRECT"), "LANDING");
  assert.equal(effectivePresentationMode("SMART_LANDING", "LANDING"), "LANDING");
  assert.equal(effectivePresentationMode("CLUB", "LANDING"), "DIRECT");
  for (const objective of ["WHATSAPP", "GOOGLE_REVIEW", "SOCIAL", "MENU", "PROMOTION"] as const) {
    assert.equal(effectivePresentationMode(objective, "DIRECT"), "DIRECT", objective);
    assert.equal(effectivePresentationMode(objective, "LANDING"), "LANDING", objective);
  }
  assert.equal(effectivePresentationLabel("SMART_LANDING", "DIRECT"), "Página del local");
});

test("Landing: jerarquía identidad → principal → secundarias → contacto, sin campos vacíos y con texto escapado", () => {
  const actions = [
    ...links(point("SMART_LANDING", null, [{ label: "Menú <script>alert(1)</script>", url: "https://ejemplo.cl" }, { label: "Instagram", url: "https://instagram.com/d" }])),
    ...buildContactActions(brand, { interactive: true }),
  ];
  const html = renderToStaticMarkup(createElement(LocalLandingView, { brand, actions }));
  const at = (s: string) => { const i = html.indexOf(s); assert.ok(i >= 0, s); return i; };
  assert.ok(at("Café Demo") < at("Menú &lt;script&gt;") && at("Menú &lt;script&gt;") < at("Instagram") && at("Instagram") < at("Contacto") && at("Contacto") < at("Tecnología SmartNFC"));
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("Sucursal Centro"), "nunca el nombre interno del local");
  const empty = renderToStaticMarkup(createElement(LocalLandingView, { brand: resolveLocalBrand({ company: { name: "Negocio Demo" } }), actions: [] }));
  assert.ok(!empty.includes("Contacto") && !empty.includes("<img"), "sin datos no aparecen secciones ni imágenes vacías");
  assert.ok(!empty.includes("Aquí aparecerán"), "el aviso de vista previa nunca aparece en la landing pública");
});

test("Vista previa del editor = LocalLandingView (misma composición, sin enlaces)", () => {
  const preview = renderToStaticMarkup(createElement(LocalIdentityPreview, { brand, framed: true }));
  const same = renderToStaticMarkup(createElement(LocalLandingView, { brand, framed: true, actions: buildContactActions(brand, { interactive: false }),
    emptyHint: "Aquí aparecerán las acciones de cada Punto Inteligente, con la identidad de tu local." }));
  assert.equal(preview, same);
  assert.ok(!preview.includes("href="), "la vista previa no navega");
});

// ── Integración: PostgreSQL desechable en loopback ──────────────────────────
const url = process.env.LOCAL_TEST_DATABASE_URL;
const allowed = url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname);
test("Landing Pública: DIRECT intacto, LANDING sin doble visita, Smart Landing y Club compatibles", { skip: !allowed }, async t => {
  process.env.DATABASE_URL = url!;
  process.env.NEXTAUTH_SECRET = "local-test-secret-only";
  process.env.NEXT_PUBLIC_APP_URL = "https://landing.example.test";
  let session: { user: { id: string; companyId: string; role: string } } | null = null;
  require("next-auth");
  require.cache[require.resolve("next-auth")]!.exports = { getServerSession: async () => session };
  const { prisma } = require("../../lib/prisma") as { prisma: PrismaClient };
  const { resolveLocalPoint, resolvePointAction } = require("../../lib/local/point-resolver");
  const { loadPointLanding } = require("../../lib/local/landing");
  const { saveLocalPoint } = require("../../lib/local/point-management");
  const { GET: nfcGet } = require("../../app/t/[token]/route");
  const { default: LandingPage } = require("../../app/l/[code]/page");
  const suffix = randomUUID().slice(0, 8);
  const headers = () => new Headers({ "x-forwarded-for": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, "user-agent": "landing-test" });

  const company = await prisma.company.create({ data: { name: "Negocio Demo " + suffix, slug: "landing-" + suffix } });
  const owner = await prisma.user.create({ data: { companyId: company.id, email: `landing-${suffix}@example.test`, role: "COMPANY_OWNER" } });
  await prisma.companyProductLicense.create({ data: { companyId: company.id, product: "LOCAL", planCode: "LOCAL_PERSONALIZADO", includedCampaigns: 10, includedTouchpoints: 40 } });
  const location = await prisma.localLocation.create({ data: { companyId: company.id, key: "centro-" + suffix, name: "Sucursal Centro Interna",
    displayName: "Café Demo", shortDescription: "Café de especialidad.", primaryColor: "#0f766e", phone: "+56912345678" } });
  const campaign = await prisma.localCampaign.create({ data: { companyId: company.id, locationId: location.id, name: "Campaña Interna Demo", slug: "landing-c-" + suffix, businessName: null } });
  session = { user: { id: owner.id, companyId: company.id, role: "COMPANY_OWNER" } };

  const destinations = { WHATSAPP: "https://wa.me/56912345678", GOOGLE_REVIEW: "https://g.page/r/demo/review", SOCIAL: "https://www.instagram.com/demo",
    MENU: "https://ejemplo.cl/menu.pdf", PROMOTION: "https://ejemplo.cl/oferta" } as const;
  const make = async (objective: string, presentationMode?: "DIRECT" | "LANDING", extra: Record<string, unknown> = {}) => {
    const id = await saveLocalPoint({ name: "Punto Interno " + objective, location: "Mesa interna 4", medium: "NFC_QR", isActive: true, objective,
      destinationUrl: (destinations as Record<string, string>)[objective] || "", smartLinks: [], ...(presentationMode ? { presentationMode } : {}), ...extra }, undefined, undefined, campaign.id);
    return prisma.localTouchpoint.findUniqueOrThrow({ where: { id } });
  };
  const counts = async (touchpointId: string) => ({
    visits: await prisma.localVisit.count({ where: { touchpointId } }),
    events: await prisma.localEvent.count({ where: { touchpointId } }),
  });

  await t.test("Sin modo explícito el punto queda DIRECT (compatibilidad con puntos existentes)", async () => {
    const p = await make("MENU");
    assert.equal(p.presentationMode, "DIRECT");
  });

  await t.test("DIRECT: los cinco objetivos redirigen como hoy (302 al destino, llegada + salida)", async () => {
    for (const [objective, destination] of Object.entries(destinations)) {
      const p = await make(objective, "DIRECT");
      const res = await resolveLocalPoint(p.code, "QR", headers());
      assert.equal(res.status, 302); assert.equal(res.headers.get("location"), destination, objective);
      const events = await prisma.localEvent.findMany({ where: { touchpointId: p.id }, select: { eventType: true } });
      assert.deepEqual(events.map(e => e.eventType).sort(), ["QR_SCAN", objective === "WHATSAPP" ? "WHATSAPP_REDIRECT" : "DESTINATION_REDIRECT"].sort());
    }
  });

  await t.test("LANDING: una sola visita en la entrada; /l no crea visitas (solo LANDING_VIEW); la acción registra un clic", async () => {
    const p = await make("WHATSAPP", "LANDING");
    const res = await resolveLocalPoint(p.code, "QR", headers());
    assert.equal(res.status, 302);
    const location = new URL(res.headers.get("location")!);
    assert.equal(location.pathname, `/l/${p.code}`);
    const v = location.searchParams.get("v")!;
    assert.ok(v);
    assert.deepEqual(await counts(p.id), { visits: 1, events: 1 }, "solo QR_SCAN; aún sin salida");

    const landing = await loadPointLanding(p.code, v);
    assert.equal(landing.status, "ok"); assert.equal(landing.visitAttributed, true);
    await loadPointLanding(p.code, v);
    const html = renderToStaticMarkup(await LandingPage({ params: Promise.resolve({ code: p.code }), searchParams: Promise.resolve({ v }) }));
    assert.deepEqual(await counts(p.id), { visits: 1, events: 2 }, "renderizar /l no duplica visitas ni escaneos: QR_SCAN + un LANDING_VIEW");
    assert.ok(html.includes("Café Demo") && html.includes("Escríbenos por WhatsApp"));
    for (const internal of ["Punto Interno", "Mesa interna", "Campaña Interna", "Sucursal Centro Interna", "wa.me"]) assert.ok(!html.includes(internal), internal);
    assert.ok(html.includes(`/p/${p.code}/go?action=primary&amp;version=${p.configurationVersion}&amp;v=${v}`));

    const go = (q: string) => resolvePointAction(p.code, new URLSearchParams(q));
    const click = await go(`action=primary&version=${p.configurationVersion}&v=${v}&url=https://evil.example`);
    assert.equal(click.status, 302); assert.equal(click.headers.get("location"), destinations.WHATSAPP, "ignora URLs inyectadas");
    await go(`action=primary&version=${p.configurationVersion}&v=${v}`);
    const events = await prisma.localEvent.findMany({ where: { touchpointId: p.id }, select: { eventType: true } });
    assert.deepEqual(events.map(e => e.eventType).sort(), ["LANDING_VIEW", "QR_SCAN"], "el clic en la landing no se mezcla con las salidas DIRECT");
    const clicks = await prisma.localActionClick.findMany({ where: { touchpointId: p.id } });
    assert.equal(clicks.length, 1, "un clic por visita y acción, sin duplicar");
    assert.deepEqual([clicks[0].actionId, clicks[0].actionType, clicks[0].actionRole, clicks[0].source, clicks[0].presentationMode, clicks[0].visitId],
      ["primary", "WHATSAPP", "primary", "QR", "LANDING", v]);
    assert.equal((await go(`action=primary&version=${p.configurationVersion + 1}&v=${v}`)).status, 409);
    assert.equal(await prisma.localVisit.count({ where: { touchpointId: p.id } }), 1);
  });

  await t.test("LANDING: /l sin v muestra la página sin inventar visitas; v ajena no se atribuye", async () => {
    const p = await make("MENU", "LANDING");
    const other = await make("PROMOTION", "LANDING");
    const res = await resolveLocalPoint(other.code, "DIRECT", headers());
    const foreignV = new URL(res.headers.get("location")!).searchParams.get("v");
    for (const v of [undefined, foreignV, "no-es-uuid"]) {
      const landing = await loadPointLanding(p.code, v);
      assert.equal(landing.status, "ok"); assert.equal(landing.visitAttributed, false);
      assert.ok(landing.actions.every((a: { href?: string }) => !a.href?.includes("&v=")));
    }
    assert.deepEqual(await counts(p.id), { visits: 0, events: 0 });
    const click = await resolvePointAction(p.code, new URLSearchParams(`action=primary&version=${p.configurationVersion}&v=${foreignV}`));
    assert.equal(click.status, 302);
    assert.equal(await prisma.localEvent.count({ where: { touchpointId: p.id } }), 0, "una visita de otro punto no registra eventos aquí");
    assert.equal(await prisma.localActionClick.count({ where: { touchpointId: p.id } }), 0, "ni clics");
  });

  await t.test("NFC existente: el mismo token conduce a la landing al cambiar a LANDING, sin regrabar", async () => {
    const p = await make("GOOGLE_REVIEW", "DIRECT");
    await prisma.physicalNfcCard.create({ data: { companyId: company.id, token: "chip-landing-" + suffix, localTouchpointId: p.id, status: "ACTIVA" } });
    const nfc = () => nfcGet(new Request("https://example.test/t/chip-landing-" + suffix, { headers: headers() }), { params: Promise.resolve({ token: "chip-landing-" + suffix }) });
    assert.equal((await nfc()).headers.get("location"), destinations.GOOGLE_REVIEW);
    await saveLocalPoint({ name: p.name, location: p.location, medium: p.medium, isActive: true, objective: p.objective, destinationUrl: p.destinationUrl, smartLinks: [], presentationMode: "LANDING" }, p.id, p.configurationVersion);
    const after = await prisma.localTouchpoint.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal(after.code, p.code, "el código no cambia");
    const res = await nfc();
    assert.equal(new URL(res.headers.get("location")!).pathname, `/l/${p.code}`);
    const scans = await prisma.localEvent.count({ where: { touchpointId: p.id, eventType: "NFC_SCAN" } });
    assert.equal(scans, 2, "un NFC_SCAN por toque");
  });

  await t.test("SMART_LANDING siempre es Página del Local, también con presentationMode histórico DIRECT", async () => {
    const links = [{ label: "Menú", url: "https://ejemplo.cl/menu" }, { label: "Instagram", url: "https://www.instagram.com/demo" }];
    // Guardar normaliza el modo: un Smart Landing nunca queda en DIRECT.
    const saved = await make("SMART_LANDING", "DIRECT", { smartLinks: links });
    assert.equal(saved.presentationMode, "LANDING");
    // Punto histórico: el valor DIRECT viene de la base (anterior a esta decisión); no se migra.
    await prisma.localTouchpoint.update({ where: { id: saved.id }, data: { presentationMode: "DIRECT" } });
    const legacy = await prisma.localTouchpoint.findUniqueOrThrow({ where: { id: saved.id } });
    assert.equal(legacy.presentationMode, "DIRECT");
    const res = await resolveLocalPoint(legacy.code, "QR", headers());
    assert.equal(res.status, 302);
    const location = new URL(res.headers.get("location")!);
    assert.equal(location.pathname, `/l/${legacy.code}`, "va a la Página del Local, nunca al HTML heredado");
    const v = location.searchParams.get("v");
    const landing = await loadPointLanding(legacy.code, v);
    assert.equal(landing.status, "ok");
    assert.deepEqual(landing.actions.filter((a: { group: string }) => a.group !== "contact").map((a: { label: string; type: string; group: string; href: string }) => [a.label, a.type, a.group, a.href]), [
      ["Menú", "WEB", "primary", `/p/${legacy.code}/go?action=link-0&version=${legacy.configurationVersion}&v=${v}`],
      ["Instagram", "INSTAGRAM", "secondary", `/p/${legacy.code}/go?action=link-1&version=${legacy.configurationVersion}&v=${v}`]], "smartLinks históricos como acciones tipadas");
    const html = renderToStaticMarkup(await LandingPage({ params: Promise.resolve({ code: legacy.code }), searchParams: Promise.resolve({ v }) }));
    assert.ok(html.includes("Café Demo"), "identidad del Local");
    for (const legacyText of ["Elige cómo quieres conectar con nosotros.", "Punto Interno"]) assert.ok(!html.includes(legacyText), legacyText);
    const click = await resolvePointAction(legacy.code, new URLSearchParams(`action=link-1&version=${legacy.configurationVersion}&v=${v}`));
    assert.equal(click.headers.get("location"), "https://www.instagram.com/demo");
    const events = (await prisma.localEvent.findMany({ where: { touchpointId: legacy.id }, select: { eventType: true } })).map(e => e.eventType).sort();
    assert.deepEqual(events, ["LANDING_VIEW", "QR_SCAN"], "vista de página, sin salida DIRECT heredada");
    const clicks = await prisma.localActionClick.findMany({ where: { touchpointId: legacy.id } });
    assert.deepEqual(clicks.map(c => [c.actionId, c.actionType, c.presentationMode]), [["link-1", "INSTAGRAM", "LANDING"]]);
    assert.equal((await resolvePointAction(legacy.code, new URLSearchParams(`action=primary&version=${legacy.configurationVersion}`))).status, 404, "Smart Landing no tiene acción única");
    // Enlaces index=N de páginas heredadas que sigan abiertas en un teléfono siguen funcionando.
    assert.equal((await resolvePointAction(legacy.code, new URLSearchParams(`index=0&version=${legacy.configurationVersion}`))).headers.get("location"), "https://ejemplo.cl/menu");
    // /p directo también lleva a la Página del Local.
    assert.equal(new URL((await resolveLocalPoint(legacy.code, "DIRECT", headers())).headers.get("location")!).pathname, `/l/${legacy.code}`);
  });

  await t.test("CLUB: siempre DIRECT; LANDING se rechaza y se ignora aunque se fuerce en la base", async () => {
    await prisma.localCampaign.update({ where: { id: campaign.id }, data: { status: "PUBLISHED", publishedSnapshot: { businessName: "Café Demo", clubName: "Club Demo", benefitTitle: "Beneficio" }, publishedVersion: 1 } });
    await assert.rejects(() => make("CLUB", "LANDING"));
    const club = await make("CLUB");
    await prisma.localTouchpoint.update({ where: { id: club.id }, data: { presentationMode: "LANDING" } });
    const res = await resolveLocalPoint(club.code, "QR", headers());
    assert.match(res.headers.get("location")!, new RegExp(`/club/${campaign.slug}\\?ref=${club.code}`));
    assert.equal((await loadPointLanding(club.code)).status, "direct");
  });

  await t.test("Licencia inactiva o punto pausado: estado neutral, sin datos del local", async () => {
    const p = await make("MENU", "LANDING");
    await prisma.localTouchpoint.update({ where: { id: p.id }, data: { isActive: false } });
    assert.equal((await loadPointLanding(p.code)).status, "inactive");
    const html = renderToStaticMarkup(await LandingPage({ params: Promise.resolve({ code: p.code }), searchParams: Promise.resolve({}) }));
    assert.ok(html.includes("Punto Inteligente temporalmente inactivo") && !html.includes("Café Demo"));
    assert.equal((await resolveLocalPoint(p.code, "QR", headers())).status, 403);
    assert.equal((await loadPointLanding("../../etc")).status, "inactive");
  });
  await prisma.$disconnect();
});
