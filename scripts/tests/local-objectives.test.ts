import "./helpers/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { resolvePointActions, whatsappFromUrl, whatsappUrl } from "../../lib/local/public-actions";
import { objectiveConfigSchema, readObjectiveConfig } from "../../lib/local/objective-config";
import { pointConfigurationSchema } from "../../lib/local/point-config";

const base = { name: "Punto Demo", location: "Caja", medium: "NFC_QR", isActive: true, smartLinks: [] };

test("WhatsApp: número y mensaje se reconstruyen sin pérdida desde el enlace guardado", () => {
  for (const message of ["", "Hola", "¿Tienen mesa para 4? 😀 & más", "a".repeat(300)]) {
    assert.deepEqual(whatsappFromUrl(whatsappUrl("+56912345678", message)), { phone: "+56912345678", message });
  }
  assert.equal(whatsappFromUrl("https://evil.example/56912345678"), null);
  assert.equal(whatsappFromUrl(""), null);
  assert.equal(pointConfigurationSchema.safeParse({ ...base, objective: "WHATSAPP", destinationUrl: whatsappUrl("+56912345678", "Hola") }).success, true);
  const bad = pointConfigurationSchema.safeParse({ ...base, objective: "WHATSAPP", destinationUrl: "https://ejemplo.cl/x" });
  assert.equal(bad.success, false);
  assert.match(bad.error!.issues[0].message, /número de WhatsApp/);
});

test("Texto del botón principal: opcional, acotado y sin claves extra; lectura tolerante", () => {
  assert.deepEqual(objectiveConfigSchema.parse({}), { ctaLabel: "" });
  assert.equal(objectiveConfigSchema.safeParse({ ctaLabel: "x".repeat(61) }).success, false);
  assert.equal(objectiveConfigSchema.safeParse({ ctaLabel: "Reserva", url: "https://evil.example" }).success, false);
  assert.deepEqual(readObjectiveConfig({ ctaLabel: 7 }), { ctaLabel: "" });
  assert.deepEqual(readObjectiveConfig(null), { ctaLabel: "" });
  const [primary] = resolvePointActions({ objective: "MENU", destinationUrl: "https://ejemplo.cl/menu", smartLinks: [], actions: [], ctaLabel: "Mira nuestra carta" });
  assert.equal(primary.label, "Mira nuestra carta");
  assert.equal(resolvePointActions({ objective: "MENU", destinationUrl: "https://ejemplo.cl/menu", smartLinks: [], actions: [], ctaLabel: " " })[0].label, "Ver menú");
});

test("Google y Redes: el editor y el servidor validan igual y todo lo aceptado antes sigue aceptado", () => {
  const ok = (objective: string, destinationUrl: string) => pointConfigurationSchema.safeParse({ ...base, objective, destinationUrl }).success;
  for (const host of ["g.page", "maps.app.goo.gl", "google.com", "www.google.com", "search.google.com", "maps.google.com", "google.cl", "www.google.cl"]) {
    assert.equal(ok("GOOGLE_REVIEW", `https://${host}/r/demo`), true, host);
  }
  assert.equal(ok("GOOGLE_REVIEW", "https://ejemplo.cl/review"), false);
  for (const host of ["instagram.com", "www.facebook.com", "tiktok.com", "linkedin.com", "youtube.com", "youtu.be", "x.com", "twitter.com", "threads.net", "threads.com", "m.facebook.com"]) {
    assert.equal(ok("SOCIAL", `https://${host}/demo`), true, host);
  }
  assert.equal(ok("SOCIAL", "https://instagram.com.evil.example/demo"), false);
  assert.equal(ok("SOCIAL", "https://wa.me/56912345678"), false);
});

// ── Integración: PostgreSQL desechable en loopback ──────────────────────────
const url = process.env.LOCAL_TEST_DATABASE_URL;
const allowed = url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname);
test("Editores por objetivo: WhatsApp estructurado, varias redes y texto del botón", { skip: !allowed }, async t => {
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
  const headers = () => new Headers({ "x-forwarded-for": `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, "user-agent": "objectives-test" });
  const company = await prisma.company.create({ data: { name: "Tienda Demo " + suffix, slug: "objectives-" + suffix } });
  const owner = await prisma.user.create({ data: { companyId: company.id, email: `objectives-${suffix}@example.test`, role: "COMPANY_OWNER" } });
  await prisma.companyProductLicense.create({ data: { companyId: company.id, product: "LOCAL", planCode: "LOCAL_PERSONALIZADO", includedCampaigns: 10, includedTouchpoints: 40 } });
  const location = await prisma.localLocation.create({ data: { companyId: company.id, key: "loc-" + suffix, name: "Interno", displayName: "Tienda Demo" } });
  const campaign = await prisma.localCampaign.create({ data: { companyId: company.id, locationId: location.id, name: "Campaña Demo", slug: "objectives-c-" + suffix } });
  session = { user: { id: owner.id, companyId: company.id, role: "COMPANY_OWNER" } };
  const save = async (config: Record<string, unknown>) => prisma.localTouchpoint.findUniqueOrThrow({ where: { id: await saveLocalPoint({ ...base, ...config }, undefined, undefined, campaign.id) } });
  const landingOf = async (code: string) => {
    const v = new URL((await resolveLocalPoint(code, "QR", headers())).headers.get("location")!).searchParams.get("v");
    return { v, landing: await loadPointLanding(code, v) };
  };

  await t.test("WhatsApp: el enlace se guarda construido; DIRECT abre el chat con el mensaje; LANDING usa el texto elegido", async () => {
    const destinationUrl = whatsappUrl("+56912345678", "Hola, quiero reservar");
    const direct = await save({ objective: "WHATSAPP", destinationUrl, objectiveConfig: { ctaLabel: "Reserva por WhatsApp" } });
    assert.equal((await resolveLocalPoint(direct.code, "QR", headers())).headers.get("location"), "https://wa.me/56912345678?text=Hola%2C%20quiero%20reservar");
    const landingPoint = await save({ objective: "WHATSAPP", destinationUrl, presentationMode: "LANDING", objectiveConfig: { ctaLabel: "Reserva por WhatsApp" } });
    const { landing } = await landingOf(landingPoint.code);
    assert.equal(landing.actions[0].label, "Reserva por WhatsApp");
    assert.equal(landing.actions[0].type, "WHATSAPP");
  });

  await t.test("Redes: la primera red es la principal; DIRECT la abre; LANDING muestra todas y mide cada red", async () => {
    const actions = [{ id: "tiktokred1", type: "TIKTOK", value: "https://www.tiktok.com/@demo" }, { id: "youtubered", type: "YOUTUBE", value: "https://www.youtube.com/@demo" }];
    const direct = await save({ objective: "SOCIAL", destinationUrl: "https://www.instagram.com/demo", actions });
    assert.equal((await resolveLocalPoint(direct.code, "QR", headers())).headers.get("location"), "https://www.instagram.com/demo");
    const multi = await save({ objective: "SOCIAL", destinationUrl: "https://www.instagram.com/demo", actions, presentationMode: "LANDING", objectiveConfig: { ctaLabel: "Síguenos" } });
    const { v, landing } = await landingOf(multi.code);
    assert.deepEqual(landing.actions.filter((a: { group: string }) => a.group !== "contact").map((a: { type: string; label: string }) => [a.type, a.label]),
      [["INSTAGRAM", "Síguenos"], ["TIKTOK", "Míranos en TikTok"], ["YOUTUBE", "Míranos en YouTube"]]);
    await resolvePointAction(multi.code, new URLSearchParams(`action=youtubered&version=1&v=${v}`));
    await resolvePointAction(multi.code, new URLSearchParams(`action=primary&version=1&v=${v}`));
    const clicks = await prisma.localActionClick.findMany({ where: { touchpointId: multi.id }, orderBy: { createdAt: "asc" } });
    assert.deepEqual(clicks.map(c => c.actionType), ["YOUTUBE", "INSTAGRAM"], "cada red se mide por separado; un clic no es un seguidor");
  });

  await t.test("Configuración dañada en la base: el punto sigue funcionando con el texto por defecto", async () => {
    const p = await save({ objective: "MENU", destinationUrl: "https://ejemplo.cl/menu", presentationMode: "LANDING", objectiveConfig: { ctaLabel: "Carta" } });
    await prisma.localTouchpoint.update({ where: { id: p.id }, data: { objectiveConfig: { ctaLabel: 42, extra: true } } });
    const { landing } = await landingOf(p.code);
    assert.equal(landing.status, "ok");
    assert.equal(landing.actions[0].label, "Ver menú");
  });

  await t.test("Club ignora la configuración de objetivo", async () => {
    await prisma.localCampaign.update({ where: { id: campaign.id }, data: { status: "PUBLISHED", publishedSnapshot: { businessName: "Tienda Demo", clubName: "Club Demo", benefitTitle: "Beneficio" }, publishedVersion: 1 } });
    const club = await save({ objective: "CLUB", objectiveConfig: { ctaLabel: "No aplica" } });
    assert.deepEqual(club.objectiveConfig, { ctaLabel: "" });
  });

  await prisma.localActionClick.deleteMany({ where: { companyId: company.id } });
  await prisma.localEvent.deleteMany({ where: { campaign: { companyId: company.id } } });
  await prisma.localVisit.deleteMany({ where: { companyId: company.id } });
  await prisma.$disconnect();
});
