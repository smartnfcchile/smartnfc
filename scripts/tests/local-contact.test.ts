import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { generateBusinessVcf, generateSingleVcfString, vcfFilename } from "../../lib/vcf";
import { resolveLocalBrand } from "../../lib/local/brand";
import {
  PUBLIC_ACTION_TYPES, contactCardUseful, dedupeContactActions, landingActions, localContactCard, normalizedDestination, normalizeActionValue,
  resolveContactActions, storedActionSchema, toPublicActions, type ResolvedAction,
} from "../../lib/local/public-actions";
import { ACTION_VISUALS, ActionGlyph } from "../../components/local/public/action-icons";
import LocalLandingView from "../../components/local/public/LocalLandingView";

const brand = resolveLocalBrand({
  location: { name: "Sucursal Interna", displayName: "Café Ñandú, Norte; Sur", shortDescription: "Café de especialidad.\nDesde 2020", primaryColor: "#0f766e",
    phone: "+56 9 1234 5678", websiteUrl: "https://www.ejemplo.cl/", mapsUrl: "https://maps.app.goo.gl/demo", address: "Calle Ñuñoa 123, Of. 4" },
  company: { name: "Local Demo" },
});
const act = (id: string, type: ResolvedAction["type"], destination: string, role: ResolvedAction["role"] = "secondary"): ResolvedAction =>
  ({ id, type, label: id, destination, role });

test("vCard: UTF-8, escape de ; , \\ y saltos de línea, CRLF y plegado sin partir caracteres", () => {
  const vcf = generateBusinessVcf({ name: "Café Ñandú, Norte; Sur", note: "Línea 1\nEND:VCARD\r\nBEGIN:VCARD", address: "Calle Ñuñoa 123, Of. 4",
    phones: [{ number: "+56 9 1234 5678" }, { number: "+56987654321", label: "WhatsApp" }], emails: ["hola@ejemplo.cl"],
    urls: [{ url: "https://www.ejemplo.cl/", label: "Sitio web" }, { url: "https://www.instagram.com/" + "cafe".repeat(20), label: "Instagram" }] });
  assert.ok(vcf.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n") && vcf.endsWith("END:VCARD\r\n"));
  assert.deepEqual(vcf.split("\r\n").filter(l => l === "BEGIN:VCARD" || l === "END:VCARD"), ["BEGIN:VCARD", "END:VCARD"], "el texto no puede inyectar otra tarjeta");
  assert.match(vcf, /FN:Café Ñandú\\, Norte\\; Sur\r\n/);
  assert.match(vcf, /TEL;TYPE=WORK,VOICE:\+56912345678\r\n/);
  assert.match(vcf, /item1\.TEL;TYPE=CELL:\+56987654321\r\nitem1\.X-ABLabel:WhatsApp\r\n/);
  assert.match(vcf, /EMAIL;TYPE=INTERNET,WORK:hola@ejemplo\.cl\r\n/);
  assert.match(vcf, /ADR;TYPE=WORK:;;Calle Ñuñoa 123\\, Of\. 4;;;;\r\n/);
  assert.ok(!/(^|[^\r])\n/.test(vcf), "solo CRLF, sin LF sueltos");
  for (const line of vcf.split("\r\n")) {
    assert.ok(new TextEncoder().encode(line).length <= 75, "línea física ≤ 75 octetos: " + line.slice(0, 20));
    assert.ok(!line.includes("�"), "no parte caracteres UTF-8");
  }
  assert.ok(vcf.replace(/\r\n /g, "").includes("https://www.instagram.com/" + "cafe".repeat(20)), "el plegado se deshace sin perder datos");
  // La utilidad existente de tarjetas y leads no cambia.
  assert.equal(generateSingleVcfString({ fullName: "Ana", phone: "+56911112222" }), "BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Ana\r\nTEL;TYPE=CELL,VOICE:+56911112222\r\nEND:VCARD\r\n");
});

test("vCard: nombre de archivo sanitizado", () => {
  assert.equal(vcfFilename("Café Ñandú & Co."), "cafe-nandu-co.vcf");
  assert.equal(vcfFilename("../../etc/passwd"), "etc-passwd.vcf");
  assert.equal(vcfFilename("   "), "contacto.vcf");
  assert.equal(vcfFilename("ñ".repeat(200)).length, 64);
});

test("Contacto del Local: solo identidad pública y medios visibles del punto, sin duplicar", () => {
  const card = localContactCard(brand, [act("wa", "WHATSAPP", "https://wa.me/56987654321?text=Hola"), act("wa2", "WHATSAPP", "https://wa.me/56912345678"),
    act("ig", "INSTAGRAM", "https://www.instagram.com/demo"), act("mail", "EMAIL", "mailto:hola@ejemplo.cl"), act("web", "WEB", "https://ejemplo.cl")]);
  assert.equal(card.name, "Café Ñandú, Norte; Sur");
  assert.deepEqual(card.phones, [{ number: "+56912345678", kind: "phone" }, { number: "+56987654321", kind: "whatsapp" }], "el WhatsApp igual al teléfono no se repite");
  assert.deepEqual(card.emails, ["hola@ejemplo.cl"]);
  assert.deepEqual(card.urls.map(u => u.label), ["Sitio web", "Instagram", "Ubicación"], "la web del punto igual a la del Local no se repite");
  assert.ok(!JSON.stringify(card).includes("Sucursal Interna"), "nunca el nombre interno");
  assert.equal(contactCardUseful(localContactCard(resolveLocalBrand({ company: { name: "Local Demo" } }))), false, "solo el nombre no alcanza");
  assert.equal(resolveContactActions(resolveLocalBrand({ location: { displayName: "Local Demo", address: "Calle 1" } }))[0].type, "SAVE_CONTACT", "con dirección ya es útil");
});

test("Deduplicación: misma función y mismo destino normalizado; Guardar contacto siempre queda", () => {
  assert.equal(normalizedDestination("https://WWW.Ejemplo.cl/menu/?utm_source=qr&fbclid=1#top"), "https://ejemplo.cl/menu");
  assert.equal(normalizedDestination("https://ejemplo.cl/?b=2&a=1&utm_medium=x"), "https://ejemplo.cl?a=1&b=2");
  assert.equal(normalizedDestination("tel:+56 9 1234-5678"), "tel:+56912345678");
  const contact = resolveContactActions(brand);
  const dedup = (point: ResolvedAction[]) => dedupeContactActions(point, contact).map(a => a.id);
  assert.deepEqual(dedup([]), ["contact-save", "contact-phone", "contact-location", "contact-web"]);
  assert.deepEqual(dedup([act("w", "WEB", "https://ejemplo.cl?utm_source=nfc")]), ["contact-save", "contact-phone", "contact-location"], "web equivalente");
  assert.deepEqual(dedup([act("p", "PHONE", "tel:+56912345678")]), ["contact-save", "contact-location", "contact-web"], "teléfono en otro formato");
  assert.deepEqual(dedup([act("l", "LOCATION", "https://maps.app.goo.gl/demo/")]), ["contact-save", "contact-phone", "contact-web"]);
  assert.deepEqual(dedup([act("w", "WEB", "https://ejemplo.cl/reservas")]), ["contact-save", "contact-phone", "contact-location", "contact-web"], "otra página: no es duplicado");
  assert.deepEqual(dedup([act("w", "WEB", "https://ejemplo.cl/?sucursal=2")]), ["contact-save", "contact-phone", "contact-location", "contact-web"], "parámetros reales distintos: no es duplicado");
  assert.deepEqual(dedup([act("wa", "WHATSAPP", "https://wa.me/56912345678")]), ["contact-save", "contact-phone", "contact-location", "contact-web"], "WhatsApp no reemplaza Llamar");
  const all = landingActions([act("primary", "WEB", "https://www.ejemplo.cl", "primary")], brand).map(a => a.id);
  assert.deepEqual(all, ["primary", "contact-save", "contact-phone", "contact-location"]);
});

test("Registro visual: cada tipo tiene ícono e identidad; marcas con su color y el resto con el del Local", () => {
  for (const type of PUBLIC_ACTION_TYPES) assert.ok(ACTION_VISUALS[type]?.icon, type);
  const glyph = (type: (typeof PUBLIC_ACTION_TYPES)[number], extra: Record<string, unknown> = {}) =>
    renderToStaticMarkup(createElement(ActionGlyph, { type, primaryColor: "#0f766e", ...extra }));
  const expected: Array<[(typeof PUBLIC_ACTION_TYPES)[number], string]> = [["WHATSAPP", "#25D366"], ["FACEBOOK", "#1877F2"], ["YOUTUBE", "#FF0000"], ["LINKEDIN", "#0A66C2"], ["X", "#000000"], ["TIKTOK", "#000000"], ["THREADS", "#000000"]];
  for (const [type, color] of expected) assert.match(glyph(type), new RegExp(`background-color:${color}`, "i"), type);
  assert.match(glyph("INSTAGRAM"), /linear-gradient/);
  const google = glyph("GOOGLE_REVIEW");
  for (const color of ["#4285F4", "#34A853", "#FBBC05", "#EA4335"]) assert.ok(google.includes(color), "G multicolor " + color);
  for (const type of ["WEB", "PHONE", "LOCATION", "EMAIL", "SAVE_CONTACT", "MENU", "LINK"] as const) assert.match(glyph(type), /color:#0f766e/, type);
  assert.match(glyph("WHATSAPP", { onFill: true }), /ring-2/, "sobre el botón principal la marca se separa con un aro");
  for (const type of PUBLIC_ACTION_TYPES) assert.ok(!/\p{Extended_Pictographic}/u.test(glyph(type)), "sin emojis");
});

test("Correo: acción tipada con mailto: directo y ping; Guardar contacto no se puede guardar desde el editor", () => {
  assert.deepEqual(normalizeActionValue("EMAIL", " Hola@Ejemplo.CL "), { ok: true, value: "hola@ejemplo.cl" });
  for (const bad of ["hola", "a@b", "hola@ejemplo.cl?cc=otro@x.cl", "a b@ejemplo.cl", "hola@ejemplo.cl\r\nBcc:x@y.cl"]) assert.equal(normalizeActionValue("EMAIL", bad).ok, false, bad);
  const email = storedActionSchema.parse({ id: "correo0001", type: "EMAIL", value: "hola@ejemplo.cl" });
  const [pub] = toPublicActions([act("correo0001", "EMAIL", "mailto:" + email.value)], { interactive: true, code: "abc123def456", version: 1, visitId: "v" });
  assert.deepEqual([pub.href, pub.ping], ["mailto:hola@ejemplo.cl", "/p/abc123def456/go?action=correo0001&version=1&v=v"]);
  assert.equal(storedActionSchema.safeParse({ id: "guardar001", type: "SAVE_CONTACT", value: "x" }).success, false);
});

test("Página del Local: Guardar contacto en CONTACTO antes de Llamar y sin duplicar la web del punto", () => {
  const actions = toPublicActions(landingActions([act("primary", "WHATSAPP", "https://wa.me/56987654321", "primary"), act("web", "WEB", "https://ejemplo.cl")], brand),
    { interactive: true, code: "abc123def456", version: 1 });
  const html = renderToStaticMarkup(createElement(LocalLandingView, { brand, actions }));
  const at = (s: string) => { const i = html.indexOf(s); assert.ok(i >= 0, s); return i; };
  assert.ok(at("Contacto") < at("Guardar contacto") && at("Guardar contacto") < at("Agrégalo a tu teléfono") && at("Agrégalo a tu teléfono") < at("Llamar"));
  assert.equal(html.split("Sitio web").length - 1, 0, "la web ya está como acción del punto");
  assert.ok(html.includes("background-color:#25D366"), "WhatsApp con su color");
});

// ── Integración: PostgreSQL desechable en loopback ──────────────────────────
const url = process.env.LOCAL_TEST_DATABASE_URL;
const allowed = url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname);
test("Guardar contacto: vCard del Local, clic honesto, deduplicación solo visual y aislamiento", { skip: !allowed }, async t => {
  process.env.DATABASE_URL = url!;
  process.env.NEXTAUTH_SECRET = "local-test-secret-only";
  let session: { user: { id: string; companyId: string; role: string } } | null = null;
  require("next-auth");
  require.cache[require.resolve("next-auth")]!.exports = { getServerSession: async () => session };
  const { prisma } = require("../../lib/prisma") as { prisma: PrismaClient };
  const { resolveLocalPoint, resolvePointAction } = require("../../lib/local/point-resolver");
  const { loadPointLanding } = require("../../lib/local/landing");
  const { saveLocalPoint } = require("../../lib/local/point-management");
  const suffix = randomUUID().slice(0, 8);
  const headers = () => new Headers({ "x-forwarded-for": `10.5.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, "user-agent": "contact-test" });
  const seed = async (tag: string, display: string) => {
    const company = await prisma.company.create({ data: { name: `Local Demo ${tag} ${suffix}`, slug: `contact-${tag}-${suffix}` } });
    const owner = await prisma.user.create({ data: { companyId: company.id, email: `contact-${tag}-${suffix}@example.test`, role: "COMPANY_OWNER" } });
    await prisma.companyProductLicense.create({ data: { companyId: company.id, product: "LOCAL", planCode: "LOCAL_PERSONALIZADO", includedCampaigns: 10, includedTouchpoints: 40 } });
    const location = await prisma.localLocation.create({ data: { companyId: company.id, key: `loc-${tag}-${suffix}`, name: `Nombre Interno ${tag}`, displayName: display,
      phone: "+56912345678", websiteUrl: "https://www.ejemplo.cl/", mapsUrl: "https://maps.app.goo.gl/demo", address: "Calle Ñuñoa 123" } });
    const campaign = await prisma.localCampaign.create({ data: { companyId: company.id, locationId: location.id, name: "Campaña Demo", slug: `contact-c-${tag}-${suffix}` } });
    return { company, owner, campaign };
  };
  const a = await seed("a", "Café Ñandú"), b = await seed("b", "Tienda Demo B");
  session = { user: { id: a.owner.id, companyId: a.company.id, role: "COMPANY_OWNER" } };
  const id = await saveLocalPoint({ name: "Punto Demo", location: "Caja", medium: "NFC_QR", isActive: true, objective: "SMART_LANDING", destinationUrl: "", smartLinks: [],
    actions: [{ id: "whatsapp01", type: "WHATSAPP", value: "+56987654321" }, { id: "sitioweb01", type: "WEB", value: "https://ejemplo.cl?utm_source=qr" },
      { id: "correo0001", type: "EMAIL", value: "hola@ejemplo.cl" }, { id: "llamar0001", type: "PHONE", value: "9 1234 5678" }] }, undefined, undefined, a.campaign.id);
  const p = await prisma.localTouchpoint.findUniqueOrThrow({ where: { id } });
  const v = new URL((await resolveLocalPoint(p.code, "QR", headers())).headers.get("location")!).searchParams.get("v")!;

  await t.test("CONTACTO: Guardar contacto primero; web y teléfono duplicados se ocultan (solo presentación)", async () => {
    const landing = await loadPointLanding(p.code, v);
    const contact = landing.actions.filter((x: { group: string }) => x.group === "contact").map((x: { key: string }) => x.key);
    assert.deepEqual(contact, ["contact-save", "contact-location"]);
    // /go sigue resolviendo lo oculto (enlaces antiguos): la deduplicación no cambia datos ni rutas.
    assert.equal((await resolvePointAction(p.code, new URLSearchParams(`action=contact-web&version=1&v=${v}`))).headers.get("location"), "https://www.ejemplo.cl/");
  });

  await t.test("vCard: identidad pública del Local, UTF-8, adjunto con nombre seguro y clic registrado una vez", async () => {
    const go = () => resolvePointAction(p.code, new URLSearchParams(`action=contact-save&version=1&v=${v}`));
    const res = await go(); await go();
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "text/vcard; charset=utf-8");
    assert.match(res.headers.get("content-disposition")!, /^attachment; filename="cafe-nandu\.vcf"; filename\*=UTF-8''cafe-nandu\.vcf$/);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    const vcf = await res.text();
    for (const expected of ["FN:Café Ñandú", "TEL;TYPE=WORK,VOICE:+56912345678", "item1.TEL;TYPE=CELL:+56987654321", "item1.X-ABLabel:WhatsApp",
      "EMAIL;TYPE=INTERNET,WORK:hola@ejemplo.cl", "URL:https://www.ejemplo.cl/", "ADR;TYPE=WORK:;;Calle Ñuñoa 123;;;;"]) assert.ok(vcf.includes(expected), expected);
    for (const hidden of ["Nombre Interno", "Punto Demo", "Campaña Demo", "Tienda Demo B", a.company.name]) assert.ok(!vcf.includes(hidden), hidden);
    const clicks = await prisma.localActionClick.findMany({ where: { touchpointId: p.id, actionId: "contact-save" } });
    assert.deepEqual(clicks.map(c => [c.actionType, c.actionRole]), [["SAVE_CONTACT", "contact"]], "un clic por visita; no afirma que el contacto quedó guardado");
  });

  await t.test("Aislamiento: una visita de otra empresa no se atribuye y la vCard nunca mezcla datos", async () => {
    session = { user: { id: b.owner.id, companyId: b.company.id, role: "COMPANY_OWNER" } };
    const idB = await saveLocalPoint({ name: "Punto Demo", location: "Caja", medium: "NFC_QR", isActive: true, objective: "SMART_LANDING", destinationUrl: "", smartLinks: [],
      actions: [{ id: "webdemob01", type: "WEB", value: "https://ejemplo.cl/b" }] }, undefined, undefined, b.campaign.id);
    const pB = await prisma.localTouchpoint.findUniqueOrThrow({ where: { id: idB } });
    const vB = new URL((await resolveLocalPoint(pB.code, "QR", headers())).headers.get("location")!).searchParams.get("v")!;
    const res = await resolvePointAction(p.code, new URLSearchParams(`action=contact-save&version=1&v=${vB}`));
    assert.equal(res.status, 200);
    assert.ok(!(await res.text()).includes("Tienda Demo B"));
    assert.equal(await prisma.localActionClick.count({ where: { touchpointId: p.id, actionId: "contact-save" } }), 1);
    const vcfB = await (await resolvePointAction(pB.code, new URLSearchParams(`action=contact-save&version=1&v=${vB}`))).text();
    assert.ok(vcfB.includes("FN:Tienda Demo B") && !vcfB.includes("Ñandú") && !vcfB.includes("hola@ejemplo.cl"));
  });

  await t.test("Analítica: el clic cuenta como acción SAVE_CONTACT, sin métricas de éxito inventadas", async () => {
    const { localAnalytics } = require("../../lib/local/analytics");
    const now = new Date();
    const r = await localAnalytics(a.company.id, { start: new Date(now.getTime() - 3600_000), end: new Date(now.getTime() + 60_000) }, null);
    assert.deepEqual(r.actions.find((x: { type: string }) => x.type === "SAVE_CONTACT"), { type: "SAVE_CONTACT", clicks: 1 });
  });

  for (const s of [a, b]) {
    await prisma.localActionClick.deleteMany({ where: { companyId: s.company.id } });
    await prisma.localEvent.deleteMany({ where: { campaign: { companyId: s.company.id } } });
    await prisma.localVisit.deleteMany({ where: { companyId: s.company.id } });
  }
  await prisma.$disconnect();
});
