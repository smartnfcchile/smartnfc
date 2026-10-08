import "./helpers/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  ACTION_REGISTRY, MAX_POINT_ACTIONS, PUBLIC_ACTION_TYPES, legacyLinkToAction, newActionId, normalizeActionValue, pointActionsSchema,
  readStoredActions, resolvePointActions, storedActionSchema, whatsappUrl, type StoredAction,
} from "../../lib/local/public-actions";
import { pointConfigurationSchema } from "../../lib/local/point-config";
import { CAMPAIGN_DEFAULT_COLORS, campaignPublicBrand, newCampaignBrandSource, resolveLocalBrand } from "../../lib/local/brand";
import { ACTION_ICONS } from "../../components/local/public/action-icons";

const action = (type: StoredAction["type"], value: string, extra: Partial<StoredAction> = {}) =>
  storedActionSchema.parse({ id: newActionId(), type, value, ...extra });

test("Registro: cada tipo tiene nombre, texto honesto, ícono y validación", () => {
  for (const type of PUBLIC_ACTION_TYPES) {
    const def = ACTION_REGISTRY[type];
    assert.ok(def.name && def.defaultLabel && ACTION_ICONS[type], type);
    assert.ok(!/enviado|publicada|seguidor|compra|conversi/i.test(def.defaultLabel), `${type}: el texto no afirma resultados`);
  }
  assert.match(newActionId(), /^[a-z0-9]{8,24}$/);
});

test("Validación: WhatsApp y teléfono se normalizan; las redes exigen su propio dominio", () => {
  assert.deepEqual(normalizeActionValue("WHATSAPP", "+56 9 1234 5678"), { ok: true, value: "+56912345678" });
  assert.deepEqual(normalizeActionValue("WHATSAPP", "912345678"), { ok: true, value: "+56912345678" });
  assert.deepEqual(normalizeActionValue("WHATSAPP", "https://wa.me/56912345678?text=hola"), { ok: true, value: "+56912345678" });
  assert.equal(normalizeActionValue("WHATSAPP", "https://evil.example/56912345678").ok, false);
  assert.deepEqual(normalizeActionValue("PHONE", "(+56) 2 2345 6789"), { ok: true, value: "+56223456789" });
  assert.equal(normalizeActionValue("INSTAGRAM", "https://www.instagram.com/demo").ok, true);
  assert.equal(normalizeActionValue("INSTAGRAM", "https://www.facebook.com/demo").ok, false, "el ícono no puede prometer otra red");
  assert.equal(normalizeActionValue("INSTAGRAM", "https://instagram.com.evil.example/demo").ok, false, "dominio impostor");
  for (const bad of ["http://ejemplo.cl", "javascript:alert(1)", "https://localhost/x", "https://user:pass@ejemplo.cl", "https://10.0.0.1/x", "data:text/html,x"]) {
    assert.equal(normalizeActionValue("LINK", bad).ok, false, bad);
  }
  assert.equal(normalizeActionValue("GOOGLE_REVIEW", "https://g.page/r/demo/review").ok, true);
  assert.equal(normalizeActionValue("GOOGLE_REVIEW", "https://ejemplo.cl/review").ok, false);
  assert.equal(whatsappUrl("+56912345678", "Hola & chau?"), "https://wa.me/56912345678?text=Hola%20%26%20chau%3F", "el mensaje nunca altera el destino");
});

test("Acción guardada: ids reservados, claves extra, duplicados y máximo se rechazan", () => {
  for (const id of ["primary", "link-0", "contact-phone", "ABCDEFGH", "abc"]) {
    assert.equal(storedActionSchema.safeParse({ id, type: "WEB", value: "https://ejemplo.cl" }).success, false, id);
  }
  assert.equal(storedActionSchema.safeParse({ id: "abcdefgh1", type: "WEB", value: "https://ejemplo.cl", url: "https://evil.example" }).success, false, "strict");
  assert.equal(action("WEB", "https://ejemplo.cl", { message: "no aplica" }).message, "", "el mensaje solo existe en WhatsApp");
  const one = action("WEB", "https://ejemplo.cl");
  assert.equal(pointActionsSchema.safeParse([one, one]).success, false, "ids duplicados");
  assert.equal(pointActionsSchema.safeParse(Array.from({ length: MAX_POINT_ACTIONS + 1 }, () => action("WEB", "https://ejemplo.cl"))).success, false);
});

test("Lectura tolerante: una acción que ya no valida se omite sin invalidar el punto", () => {
  const good = action("MENU", "https://ejemplo.cl/menu");
  const list = readStoredActions([good, { id: "zzzzzzzz1", type: "INSTAGRAM", value: "https://otra.example/x" }, { basura: true }, good]);
  assert.deepEqual(list.map(a => a.id), [good.id]);
  assert.deepEqual(readStoredActions(null), []);
  assert.deepEqual(readStoredActions("[]"), []);
});

test("Resolución: principal + adicionales activas; Smart Landing usa sus acciones o sus enlaces heredados; Club ninguna", () => {
  const extra = action("INSTAGRAM", "https://www.instagram.com/demo");
  const hidden = action("FACEBOOK", "https://www.facebook.com/demo", { enabled: false });
  const menu = resolvePointActions({ objective: "MENU", destinationUrl: "https://ejemplo.cl/menu.pdf", smartLinks: [], actions: [extra, hidden] });
  assert.deepEqual(menu.map(a => [a.id, a.type, a.role]), [["primary", "MENU", "primary"], [extra.id, "INSTAGRAM", "secondary"]]);
  const wa = action("WHATSAPP", "+56912345678", { message: "Hola", label: "Reserva tu mesa" });
  const smart = resolvePointActions({ objective: "SMART_LANDING", destinationUrl: null, smartLinks: [{ label: "Viejo", url: "https://ejemplo.cl/viejo" }], actions: [wa, extra] });
  assert.deepEqual(smart.map(a => [a.id, a.label, a.destination, a.role]), [
    [wa.id, "Reserva tu mesa", "https://wa.me/56912345678?text=Hola", "primary"], [extra.id, "Síguenos en Instagram", "https://www.instagram.com/demo", "secondary"]]);
  assert.deepEqual(resolvePointActions({ objective: "CLUB", destinationUrl: null, smartLinks: [], actions: [extra] }), []);
});

test("Enlaces heredados → acciones: conserva el mensaje de WhatsApp y cae a enlace genérico si el tipo no valida", () => {
  assert.deepEqual(legacyLinkToAction({ label: "Escríbenos", url: "https://wa.me/56912345678?text=Hola%20local" }),
    { type: "WHATSAPP", label: "Escríbenos", value: "+56912345678", message: "Hola local" });
  assert.deepEqual(legacyLinkToAction({ label: "Opina", url: "https://www.google.com.ar/search?q=x&lrd=1" }),
    { type: "LINK", label: "Opina", value: "https://www.google.com.ar/search?q=x&lrd=1", message: "" });
});

test("Configuración: Smart Landing exige una acción activa; los objetivos únicos aceptan acciones adicionales", () => {
  const base = { name: "Caja", location: "Caja principal", medium: "NFC_QR", isActive: true, smartLinks: [], presentationMode: "LANDING" };
  const off = { id: "offaction1", type: "WEB", value: "https://ejemplo.cl", enabled: false };
  assert.equal(pointConfigurationSchema.safeParse({ ...base, objective: "SMART_LANDING", actions: [off] }).success, false);
  assert.equal(pointConfigurationSchema.safeParse({ ...base, objective: "SMART_LANDING", actions: [{ ...off, enabled: true }] }).success, true);
  assert.equal(pointConfigurationSchema.safeParse({ ...base, objective: "MENU", destinationUrl: "https://ejemplo.cl/menu", actions: [{ ...off, enabled: true }] }).success, true);
});

test("M-1: la vista previa de una campaña nueva usa exactamente los valores con que nace la campaña", () => {
  const schema = readFileSync(join(__dirname, "../../prisma/schema.prisma"), "utf8");
  const model = schema.slice(schema.indexOf("model LocalCampaign {"));
  assert.match(model, new RegExp(`primaryColor\\s+String\\s+@default\\("${CAMPAIGN_DEFAULT_COLORS.primaryColor}"\\)`));
  assert.match(model, new RegExp(`secondaryColor\\s+String\\s+@default\\("${CAMPAIGN_DEFAULT_COLORS.secondaryColor}"\\)`));
  const location = { name: "Interno", displayName: null, primaryColor: null, secondaryColor: null };
  const preview = resolveLocalBrand({ location, campaign: newCampaignBrandSource("Cafetería Demo"), company: { name: "Cafetería Demo" } });
  const published = campaignPublicBrand({ ...newCampaignBrandSource("Cafetería Demo"), logoUrl: null, heroImageUrl: null, address: null, localLocation: location }, "Cafetería Demo");
  assert.deepEqual(preview, published);
  assert.equal(published.secondaryColor, CAMPAIGN_DEFAULT_COLORS.secondaryColor);
});

// ── Integración: PostgreSQL desechable en loopback ──────────────────────────
const url = process.env.LOCAL_TEST_DATABASE_URL;
const allowed = url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname);
test("Action Builder: tracking por acción, deduplicación, aislamiento y compatibilidad", { skip: !allowed }, async t => {
  process.env.DATABASE_URL = url!;
  process.env.NEXTAUTH_SECRET = "local-test-secret-only";
  let session: { user: { id: string; companyId: string; role: string } } | null = null;
  require("next-auth");
  require.cache[require.resolve("next-auth")]!.exports = { getServerSession: async () => session };
  const { prisma } = require("../../lib/prisma") as { prisma: PrismaClient };
  const { resolveLocalPoint, resolvePointAction } = require("../../lib/local/point-resolver");
  const { loadPointLanding } = require("../../lib/local/landing");
  const { saveLocalPoint } = require("../../lib/local/point-management");
  const { POST: goPost } = require("../../app/p/[code]/go/route");
  const suffix = randomUUID().slice(0, 8);
  const headers = () => new Headers({ "x-forwarded-for": `10.8.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, "user-agent": "actions-test" });

  const setup = async (tag: string) => {
    const company = await prisma.company.create({ data: { name: `Cafetería Demo ${tag} ${suffix}`, slug: `actions-${tag}-${suffix}` } });
    const owner = await prisma.user.create({ data: { companyId: company.id, email: `actions-${tag}-${suffix}@example.test`, role: "COMPANY_OWNER" } });
    await prisma.companyProductLicense.create({ data: { companyId: company.id, product: "LOCAL", planCode: "LOCAL_PERSONALIZADO", includedCampaigns: 10, includedTouchpoints: 40 } });
    const location = await prisma.localLocation.create({ data: { companyId: company.id, key: `loc-${tag}-${suffix}`, name: "Nombre Interno Local",
      displayName: "Cafetería Demo", websiteUrl: "https://www.ejemplo.cl", phone: "+56912345678" } });
    const campaign = await prisma.localCampaign.create({ data: { companyId: company.id, locationId: location.id, name: "Campaña Demo", slug: `actions-c-${tag}-${suffix}` } });
    return { company, owner, location, campaign };
  };
  const a = await setup("a"), b = await setup("b");
  const as = (x: { owner: { id: string }; company: { id: string } }) => { session = { user: { id: x.owner.id, companyId: x.company.id, role: "COMPANY_OWNER" } }; };
  as(a);
  const wa = { id: "whatsapp01", type: "WHATSAPP", value: "+56 9 1234 5678", message: "Hola, quiero reservar", label: "" };
  const ig = { id: "instagram1", type: "INSTAGRAM", value: "https://www.instagram.com/demo", label: "Síguenos" };
  const phone = { id: "llamar0001", type: "PHONE", value: "+56 2 2345 6789" };
  const fb = { id: "facebook01", type: "FACEBOOK", value: "https://www.facebook.com/demo", enabled: false };
  const smartConfig = { name: "Punto Demo", location: "Mesa 1", medium: "NFC_QR", isActive: true, objective: "SMART_LANDING", destinationUrl: "",
    smartLinks: [], presentationMode: "LANDING", actions: [wa, ig, phone, fb] };
  const id = await saveLocalPoint(smartConfig, undefined, undefined, a.campaign.id);
  const p = await prisma.localTouchpoint.findUniqueOrThrow({ where: { id } });
  const clicks = (touchpointId = p.id) => prisma.localActionClick.findMany({ where: { touchpointId }, orderBy: { createdAt: "asc" } });

  await t.test("Se guardan normalizadas y con espejo heredado seguro en smartLinks", async () => {
    const stored = p.actions as Array<{ id: string; value: string; enabled: boolean }>;
    assert.deepEqual(stored.map(x => [x.id, x.value, x.enabled]), [["whatsapp01", "+56912345678", true], ["instagram1", "https://www.instagram.com/demo", true],
      ["llamar0001", "+56223456789", true], ["facebook01", "https://www.facebook.com/demo", false]]);
    assert.deepEqual(p.smartLinks, [{ label: "Escríbenos por WhatsApp", url: "https://wa.me/56912345678?text=Hola%2C%20quiero%20reservar" },
      { label: "Síguenos", url: "https://www.instagram.com/demo" }], "sin tel: ni acciones ocultas");
  });

  let v = "";
  await t.test("LANDING_VIEW una vez por visita; los enlaces identifican cada acción", async () => {
    const res = await resolveLocalPoint(p.code, "NFC", headers());
    v = new URL(res.headers.get("location")!).searchParams.get("v")!;
    const first = await loadPointLanding(p.code, v);
    await loadPointLanding(p.code, v);
    assert.equal(await prisma.localEvent.count({ where: { visitId: v, eventType: "LANDING_VIEW" } }), 1);
    assert.deepEqual(first.actions.filter((x: { group: string }) => x.group !== "contact").map((x: { key: string; href: string; ping?: string }) => [x.key, x.href, x.ping ?? null]), [
      ["whatsapp01", `/p/${p.code}/go?action=whatsapp01&version=1&v=${v}`, null],
      ["instagram1", `/p/${p.code}/go?action=instagram1&version=1&v=${v}`, null],
      ["llamar0001", "tel:+56223456789", `/p/${p.code}/go?action=llamar0001&version=1&v=${v}`]]);
    assert.ok(!JSON.stringify(first).includes("facebook01"), "una acción oculta no se publica");
  });

  await t.test("Cada acción registra su propio clic, una vez por visita; el destino lo decide el servidor", async () => {
    const go = (q: string) => resolvePointAction(p.code, new URLSearchParams(q));
    const w = await go(`action=whatsapp01&version=1&v=${v}&url=https://evil.example`);
    assert.equal(w.headers.get("location"), "https://wa.me/56912345678?text=Hola%2C%20quiero%20reservar");
    await go(`action=whatsapp01&version=1&v=${v}`);
    assert.equal((await go(`action=instagram1&version=1&v=${v}`)).headers.get("location"), "https://www.instagram.com/demo");
    const ping = await goPost(new Request(`https://x.test/p/${p.code}/go?action=llamar0001&version=1&v=${v}`, { method: "POST", body: "PING" }), { params: Promise.resolve({ code: p.code }) });
    assert.equal(ping.status, 204); assert.equal(ping.headers.get("location"), null);
    assert.equal((await go(`action=contact-web&version=1&v=${v}`)).headers.get("location"), "https://www.ejemplo.cl");
    assert.deepEqual((await clicks()).map(c => [c.actionId, c.actionType, c.actionRole, c.source]), [
      ["whatsapp01", "WHATSAPP", "primary", "NFC"], ["instagram1", "INSTAGRAM", "secondary", "NFC"],
      ["llamar0001", "PHONE", "secondary", "NFC"], ["contact-web", "WEB", "contact", "NFC"]]);
    assert.equal(await prisma.localEvent.count({ where: { visitId: v, eventType: { in: ["WHATSAPP_REDIRECT", "DESTINATION_REDIRECT"] } } }), 0,
      "un clic de landing no se cuenta como salida DIRECT");
  });

  await t.test("Acciones ocultas, desconocidas, reservadas o de versión anterior no redirigen", async () => {
    const go = (q: string) => resolvePointAction(p.code, new URLSearchParams(q));
    assert.equal((await go(`action=facebook01&version=1&v=${v}`)).status, 404);
    assert.equal((await go(`action=noexiste01&version=1&v=${v}`)).status, 404);
    assert.equal((await go(`action=${encodeURIComponent("https://evil.example")}&version=1`)).status, 404);
    assert.equal((await go(`action=primary&version=1`)).status, 404, "Smart Landing no tiene acción única");
    assert.equal((await go(`action=instagram1&version=0&v=${v}`)).status, 409);
  });

  await t.test("Aislamiento: una visita de otra empresa nunca se atribuye", async () => {
    as(b);
    const idB = await saveLocalPoint({ ...smartConfig, actions: [ig] }, undefined, undefined, b.campaign.id);
    const pB = await prisma.localTouchpoint.findUniqueOrThrow({ where: { id: idB } });
    const vB = new URL((await resolveLocalPoint(pB.code, "QR", headers())).headers.get("location")!).searchParams.get("v")!;
    const before = (await clicks()).length;
    const res = await resolvePointAction(p.code, new URLSearchParams(`action=instagram1&version=1&v=${vB}`));
    assert.equal(res.status, 302);
    assert.equal((await clicks()).length, before);
    assert.equal(await prisma.localActionClick.count({ where: { companyId: b.company.id } }), 0);
    await assert.rejects(() => saveLocalPoint({ ...smartConfig, actions: [ig] }, p.id, 1), "otra empresa no edita el punto");
    as(a);
  });

  await t.test("Editar acciones no cambia el código; la lectura tolerante mantiene el punto vivo", async () => {
    await saveLocalPoint({ ...smartConfig, actions: [ig, wa] }, p.id, 1);
    const after = await prisma.localTouchpoint.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal(after.code, p.code); assert.equal(after.configurationVersion, 2);
    await prisma.localTouchpoint.update({ where: { id: p.id }, data: { actions: [...(after.actions as object[]), { id: "rota000001", type: "INSTAGRAM", value: "https://otra.example/x" }] } });
    const landing = await loadPointLanding(p.code);
    assert.equal(landing.status, "ok");
    assert.deepEqual(landing.actions.filter((x: { group: string }) => x.group !== "contact").map((x: { key: string }) => x.key), ["instagram1", "whatsapp01"]);
  });

  await t.test("Smart Landing histórico (DIRECT, solo smartLinks): Página del Local con acciones tipadas y clic honesto", async () => {
    const legacyId = await saveLocalPoint({ ...smartConfig, presentationMode: "DIRECT", actions: [], smartLinks: [{ label: "Menú", url: "https://ejemplo.cl/menu" }] }, undefined, undefined, a.campaign.id);
    await prisma.localTouchpoint.update({ where: { id: legacyId }, data: { presentationMode: "DIRECT" } }); // valor histórico, sin migrar
    const legacy = await prisma.localTouchpoint.findUniqueOrThrow({ where: { id: legacyId } });
    assert.deepEqual(legacy.actions, [], "sin acciones guardadas sigue usando sus enlaces");
    const res = await resolveLocalPoint(legacy.code, "QR", headers());
    const location = new URL(res.headers.get("location")!);
    assert.equal(location.pathname, `/l/${legacy.code}`);
    const landing = await loadPointLanding(legacy.code, location.searchParams.get("v"));
    const [primary] = landing.actions;
    assert.deepEqual([primary.key, primary.type, primary.group], ["link-0", "WEB", "primary"]);
    const query = new URL("https://x.test" + primary.href).searchParams;
    assert.equal((await resolvePointAction(legacy.code, query)).headers.get("location"), "https://ejemplo.cl/menu");
    assert.deepEqual((await clicks(legacy.id)).map(c => [c.actionId, c.presentationMode]), [["link-0", "LANDING"]]);
    assert.equal(await prisma.localEvent.count({ where: { visitId: query.get("v"), eventType: "DESTINATION_REDIRECT" } }), 0, "sin salida DIRECT heredada");
    assert.equal(await prisma.localEvent.count({ where: { visitId: query.get("v"), eventType: "LANDING_VIEW" } }), 1);
  });

  await t.test("DIRECT de objetivo único: el escaneo es salida automática, no clic", async () => {
    const directId = await saveLocalPoint({ name: "Punto Demo", location: "Caja", medium: "NFC_QR", isActive: true, objective: "MENU",
      destinationUrl: "https://ejemplo.cl/menu.pdf", smartLinks: [], actions: [ig] }, undefined, undefined, a.campaign.id);
    const direct = await prisma.localTouchpoint.findUniqueOrThrow({ where: { id: directId } });
    assert.equal((await resolveLocalPoint(direct.code, "QR", headers())).headers.get("location"), "https://ejemplo.cl/menu.pdf");
    assert.equal((await clicks(direct.id)).length, 0);
  });

  await t.test("M-1: la campaña creada desde un punto nace con los valores que mostró la vista previa", async () => {
    const newId = await saveLocalPoint({ name: "Punto Demo", location: "Caja", medium: "NFC_QR", isActive: false, objective: "MENU",
      destinationUrl: "https://ejemplo.cl/menu.pdf", smartLinks: [] }, undefined, undefined, "__new", "Campaña Demo Nueva", a.location.id);
    const created = await prisma.localTouchpoint.findUniqueOrThrow({ where: { id: newId }, include: { campaign: { include: { localLocation: true } } } });
    assert.equal(created.campaign.secondaryColor, CAMPAIGN_DEFAULT_COLORS.secondaryColor);
    assert.deepEqual(campaignPublicBrand(created.campaign, a.company.name),
      resolveLocalBrand({ location: created.campaign.localLocation, campaign: newCampaignBrandSource(a.company.name), company: a.company }));
  });

  const ids = [a.company.id, b.company.id];
  await prisma.localActionClick.deleteMany({ where: { companyId: { in: ids } } });
  await prisma.localEvent.deleteMany({ where: { campaign: { companyId: { in: ids } } } });
  await prisma.localVisit.deleteMany({ where: { companyId: { in: ids } } });
  await prisma.$disconnect();
});
