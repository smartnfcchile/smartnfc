import "./helpers/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { promotionPeriodText, promotionSchema, promotionStatus, promotionView, readObjectiveConfig, todayInChile } from "../../lib/local/objective-config";
import { isAllowedBrandImageUrl, resolveLocalBrand } from "../../lib/local/brand";
import LocalLandingView from "../../components/local/public/LocalLandingView";

const LOC = "cm0locdemo0000000000000001";
const blob = (path: string) => `https://abc123.public.blob.vercel-storage.com/${path}`;
const shift = (day: string, days: number) => new Date(Date.parse(day + "T12:00:00Z") + days * 86400000).toISOString().slice(0, 10);

test("Promoción: fechas reales, término posterior al inicio, sin claves extra y con límites", () => {
  assert.equal(promotionSchema.safeParse({ title: "2x1", startDate: "2026-10-01", endDate: "2026-10-31" }).success, true);
  assert.equal(promotionSchema.safeParse({ title: "2x1", startDate: "2026-02-30" }).success, false, "día inexistente");
  assert.equal(promotionSchema.safeParse({ title: "2x1", startDate: "01-10-2026" }).success, false);
  assert.equal(promotionSchema.safeParse({ title: "2x1", startDate: "2026-10-31", endDate: "2026-10-01" }).success, false);
  assert.equal(promotionSchema.safeParse({ title: "x".repeat(81) }).success, false);
  assert.equal(promotionSchema.safeParse({ title: "2x1", price: 1000 }).success, false, "strict");
});

test("Vigencia: días inclusivos en hora de Chile, también cerca de medianoche", () => {
  const promo = { startDate: "2026-10-01", endDate: "2026-10-31" };
  assert.equal(promotionStatus(promo, new Date("2026-10-01T02:30:00Z")), "scheduled", "30-sep 23:30 en Chile: aún no comienza");
  assert.equal(promotionStatus(promo, new Date("2026-10-01T03:30:00Z")), "active", "01-oct 00:30 en Chile");
  assert.equal(promotionStatus(promo, new Date("2026-11-01T02:59:00Z")), "active", "31-oct 23:59 en Chile: último minuto");
  assert.equal(promotionStatus(promo, new Date("2026-11-01T03:01:00Z")), "ended");
  assert.equal(promotionStatus({ startDate: "", endDate: "" }), "active", "sin fechas: vigente");
  assert.equal(promotionStatus(undefined), "active");
  assert.equal(promotionPeriodText(promo, "scheduled"), "Esta promoción comienza el 1 de octubre de 2026.");
  assert.equal(promotionPeriodText(promo, "active"), "Válida hasta el 31 de octubre de 2026.");
  assert.equal(promotionPeriodText(promo, "ended"), "Esta promoción terminó.");
});

test("Lectura tolerante por partes y vista pública sin imágenes inseguras", () => {
  assert.deepEqual(readObjectiveConfig({ ctaLabel: "Canjear", promotion: { title: 7 } }), { ctaLabel: "Canjear" }, "la promoción inválida se omite, el texto se conserva");
  const view = promotionView({ title: "2x1", description: "", imageUrl: "http://inseguro.example/x.png", startDate: "", endDate: "" }, "active");
  assert.equal(view!.imageUrl, null);
  assert.equal(promotionView(undefined, "active"), null);
});

test("Imagen de promoción: solo en la carpeta del Local y como imagen de promoción", () => {
  assert.equal(isAllowedBrandImageUrl(blob(`local-brand/${LOC}/promo-Ab12.png`), LOC, ["promo"]), true);
  assert.equal(isAllowedBrandImageUrl(blob(`local-brand/${LOC}/promo-Ab12.png`), LOC), false, "no sirve como logo o portada");
  assert.equal(isAllowedBrandImageUrl(blob(`local-brand/${LOC}/logo-Ab12.png`), LOC, ["promo"]), false);
  assert.equal(isAllowedBrandImageUrl(blob(`local-brand/otro-local/promo-Ab12.png`), LOC, ["promo"]), false);
});

test("Landing: la promoción terminada muestra su estado y el texto se escapa", () => {
  const brand = resolveLocalBrand({ location: { displayName: "Tienda Demo" } });
  const html = renderToStaticMarkup(createElement(LocalLandingView, { brand, actions: [],
    promotion: { title: "2x1 <b>hoy</b>", description: "Solo en caja.", imageUrl: null, status: "ended", periodText: "Esta promoción terminó." } }));
  assert.ok(html.includes("2x1 &lt;b&gt;hoy&lt;/b&gt;") && html.includes("Esta promoción terminó."));
  assert.ok(!/licencia|deuda|suspend/i.test(html));
});

// ── Integración: PostgreSQL desechable en loopback ──────────────────────────
const url = process.env.LOCAL_TEST_DATABASE_URL;
const allowed = url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname);
test("Promociones: vigente, programada, terminada y reactivada con el mismo código", { skip: !allowed }, async t => {
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
  const headers = () => new Headers({ "x-forwarded-for": `10.6.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, "user-agent": "promotions-test" });
  const company = await prisma.company.create({ data: { name: "Restaurante Demo " + suffix, slug: "promos-" + suffix } });
  const owner = await prisma.user.create({ data: { companyId: company.id, email: `promos-${suffix}@example.test`, role: "COMPANY_OWNER" } });
  await prisma.companyProductLicense.create({ data: { companyId: company.id, product: "LOCAL", planCode: "LOCAL_PERSONALIZADO", includedCampaigns: 10, includedTouchpoints: 40 } });
  const location = await prisma.localLocation.create({ data: { companyId: company.id, key: "loc-" + suffix, name: "Interno", displayName: "Restaurante Demo" } });
  const campaign = await prisma.localCampaign.create({ data: { companyId: company.id, locationId: location.id, name: "Campaña Demo", slug: "promos-c-" + suffix } });
  session = { user: { id: owner.id, companyId: company.id, role: "COMPANY_OWNER" } };
  const today = todayInChile();
  const base = { name: "Punto Demo", location: "Caja", medium: "NFC_QR", isActive: true, smartLinks: [], objective: "PROMOTION", destinationUrl: "https://ejemplo.cl/oferta" };
  const promo = (startDate: string, endDate: string, extra: Record<string, string> = {}) =>
    ({ ctaLabel: "Ver la oferta", promotion: { title: "2x1 en cafés", description: "Solo en el local.", imageUrl: "", startDate, endDate, ...extra } });
  const save = async (config: Record<string, unknown>, id?: string, version?: number) =>
    prisma.localTouchpoint.findUniqueOrThrow({ where: { id: await saveLocalPoint({ ...base, ...config }, id, version, id ? undefined : campaign.id) } });
  const enter = async (code: string) => (await resolveLocalPoint(code, "QR", headers())).headers.get("location")!;

  await t.test("Vigente: LANDING muestra contenido y CTA; el clic se mide", async () => {
    const p = await save({ presentationMode: "LANDING", objectiveConfig: promo(today, shift(today, 10)) });
    const v = new URL(await enter(p.code)).searchParams.get("v");
    const landing = await loadPointLanding(p.code, v);
    assert.equal(landing.promotion.status, "active"); assert.equal(landing.promotion.title, "2x1 en cafés");
    assert.equal(landing.actions[0].label, "Ver la oferta");
    assert.equal((await resolvePointAction(p.code, new URLSearchParams(`action=primary&version=1&v=${v}`))).headers.get("location"), "https://ejemplo.cl/oferta");
    assert.equal(await prisma.localActionClick.count({ where: { touchpointId: p.id } }), 1);
  });

  await t.test("Programada (DIRECT): se muestra el aviso de inicio en la página del local, sin botón ni salida", async () => {
    const p = await save({ objectiveConfig: promo(shift(today, 3), shift(today, 10)) });
    const location = new URL(await enter(p.code));
    assert.equal(location.pathname, `/l/${p.code}`, "no redirige a una oferta que aún no comienza");
    const landing = await loadPointLanding(p.code, location.searchParams.get("v"));
    assert.equal(landing.status, "ok"); assert.equal(landing.promotion.status, "scheduled");
    assert.match(landing.promotion.periodText, /comienza el/);
    assert.ok(!landing.actions.some((a: { key: string }) => a.key === "primary"));
    const go = await resolvePointAction(p.code, new URLSearchParams(`action=primary&version=1&v=${location.searchParams.get("v")}`));
    assert.equal(new URL(go.headers.get("location")!).pathname, `/l/${p.code}`);
    assert.equal(await prisma.localActionClick.count({ where: { touchpointId: p.id } }), 0);
    assert.equal(await prisma.localEvent.count({ where: { touchpointId: p.id, eventType: "DESTINATION_REDIRECT" } }), 0);
  });

  await t.test("Terminada y reactivada: mismo código, mismo historial", async () => {
    const p = await save({ presentationMode: "LANDING", objectiveConfig: promo(shift(today, -10), shift(today, -1)) });
    const ended = await loadPointLanding(p.code, new URL(await enter(p.code)).searchParams.get("v"));
    assert.equal(ended.promotion.status, "ended"); assert.equal(ended.promotion.periodText, "Esta promoción terminó.");
    assert.ok(!ended.actions.some((a: { key: string }) => a.key === "primary"));
    const renewed = await save({ presentationMode: "LANDING", objectiveConfig: promo(shift(today, -10), shift(today, 30)) }, p.id, 1);
    assert.equal(renewed.code, p.code);
    const active = await loadPointLanding(p.code, new URL(await enter(p.code)).searchParams.get("v"));
    assert.equal(active.promotion.status, "active"); assert.equal(active.actions[0].key, "primary");
    assert.equal(await prisma.localVisit.count({ where: { touchpointId: p.id } }), 2, "las visitas anteriores se conservan");
  });

  await t.test("Desactivada: estado neutral, sin contenido de la promoción", async () => {
    const p = await save({ isActive: false, presentationMode: "LANDING", objectiveConfig: promo(today, "") });
    assert.equal((await loadPointLanding(p.code)).status, "inactive");
  });

  await t.test("Imagen: solo de la carpeta del Local del punto; el contenido se ignora en otros objetivos", async () => {
    const own = blob(`local-brand/${location.id}/promo-Ab12.webp`);
    const ok = await save({ objectiveConfig: promo(today, "", { imageUrl: own }) });
    assert.equal((ok.objectiveConfig as { promotion: { imageUrl: string } }).promotion.imageUrl, own);
    await assert.rejects(() => save({ objectiveConfig: promo(today, "", { imageUrl: blob(`local-brand/otro-local/promo-Ab12.webp`) }) }), /imagen de la promoción/);
    await assert.rejects(() => save({ objectiveConfig: promo(today, "", { imageUrl: "https://ejemplo.cl/x.png" }) }), /imagen de la promoción/);
    const menu = await save({ objective: "MENU", destinationUrl: "https://ejemplo.cl/menu", objectiveConfig: promo(today, "") });
    assert.deepEqual(menu.objectiveConfig, { ctaLabel: "Ver la oferta" });
  });

  await prisma.localActionClick.deleteMany({ where: { companyId: company.id } });
  await prisma.localEvent.deleteMany({ where: { campaign: { companyId: company.id } } });
  await prisma.localVisit.deleteMany({ where: { companyId: company.id } });
  await prisma.$disconnect();
});
