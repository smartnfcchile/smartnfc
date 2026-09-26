import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { resolveAnalyticsPeriod } from "../../lib/local/analytics-period";

// Viernes 25-sep-2026 12:00 en Chile (horario de verano desde el 6-sep: UTC-3).
const NOW = new Date("2026-09-25T15:00:00Z");
const iso = (d: Date) => d.toISOString();

test("Períodos: hoy, esta semana, última semana y este mes en hora de Chile, comparados con el mismo tramo", () => {
  const today = resolveAnalyticsPeriod({ period: "today" }, NOW);
  assert.deepEqual([iso(today.start), iso(today.end)], ["2026-09-25T03:00:00.000Z", iso(NOW)]);
  assert.deepEqual([iso(today.compare!.start), iso(today.compare!.end)], ["2026-09-24T03:00:00.000Z", "2026-09-24T15:00:00.000Z"]);
  const week = resolveAnalyticsPeriod({}, NOW);
  assert.equal(week.key, "week", "por defecto: esta semana");
  assert.equal(iso(week.start), "2026-09-21T03:00:00.000Z", "lunes");
  assert.deepEqual([iso(week.compare!.start), iso(week.compare!.end)], ["2026-09-14T03:00:00.000Z", "2026-09-18T15:00:00.000Z"]);
  const last = resolveAnalyticsPeriod({ period: "lastweek" }, NOW);
  assert.deepEqual([iso(last.start), iso(last.end), last.days.length], ["2026-09-14T03:00:00.000Z", "2026-09-21T03:00:00.000Z", 7]);
  const month = resolveAnalyticsPeriod({ period: "month" }, NOW);
  assert.equal(iso(month.start), "2026-09-01T04:00:00.000Z", "1-sep aún en horario de invierno (UTC-4)");
  assert.equal(iso(month.compare!.start), "2026-08-01T04:00:00.000Z");
  assert.ok(month.compare!.end <= month.start);
  assert.equal(resolveAnalyticsPeriod({ period: "otro" }, NOW).key, "week", "valor desconocido: esta semana");
});

test("Período personalizado: días inclusivos, orden, futuro recortado y máximo de un año", () => {
  const c = resolveAnalyticsPeriod({ period: "custom", from: "2026-09-20", to: "2026-09-22" }, NOW);
  assert.deepEqual(c.days, ["2026-09-20", "2026-09-21", "2026-09-22"]);
  assert.equal(iso(c.end), "2026-09-23T03:00:00.000Z");
  assert.deepEqual([iso(c.compare!.start), iso(c.compare!.end)], ["2026-09-17T03:00:00.000Z", "2026-09-20T03:00:00.000Z"]);
  assert.deepEqual(resolveAnalyticsPeriod({ period: "custom", from: "2026-09-22", to: "2026-09-20" }, NOW).days, c.days, "fechas invertidas");
  const future = resolveAnalyticsPeriod({ period: "custom", from: "2026-09-24", to: "2026-12-31" }, NOW);
  assert.deepEqual([future.days.at(-1), iso(future.end)], ["2026-09-25", iso(NOW)], "no incluye días futuros");
  const dst = resolveAnalyticsPeriod({ period: "custom", from: "2026-09-05", to: "2026-09-07" }, NOW);
  assert.deepEqual(dst.days, ["2026-09-05", "2026-09-06", "2026-09-07"], "el cambio de hora no pierde ni duplica días");
  assert.equal(resolveAnalyticsPeriod({ period: "custom", from: "2020-01-01", to: "2026-09-25" }, NOW).days.length, 366);
  assert.equal(resolveAnalyticsPeriod({ period: "custom", from: "2026-02-30" }, NOW).days.length, 7, "fecha inválida: últimos 7 días");
});

// ── Integración: PostgreSQL desechable en loopback ──────────────────────────
const url = process.env.LOCAL_TEST_DATABASE_URL;
const allowed = url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname);
test("Analítica: métricas separadas, días de Chile y aislamiento entre empresas", { skip: !allowed }, async () => {
  process.env.DATABASE_URL = url!;
  const { prisma } = require("../../lib/prisma") as { prisma: PrismaClient };
  const { localAnalytics } = require("../../lib/local/analytics");
  const suffix = randomUUID().slice(0, 8);
  const seed = async (tag: string) => {
    const company = await prisma.company.create({ data: { name: `Local Demo ${tag} ${suffix}`, slug: `analytics-${tag}-${suffix}` } });
    const location = await prisma.localLocation.create({ data: { companyId: company.id, key: `loc-${tag}-${suffix}`, name: "Interno", displayName: "Local Demo" } });
    const campaign = await prisma.localCampaign.create({ data: { companyId: company.id, locationId: location.id, name: "Campaña Demo", slug: `analytics-c-${tag}-${suffix}` } });
    const point = (code: string, objective: "MENU" | "CLUB" | "WHATSAPP", presentationMode: "DIRECT" | "LANDING") => prisma.localTouchpoint.create({ data: {
      campaignId: campaign.id, code: `${code}${tag}${suffix}`, name: `Punto Demo ${code}`, objective, presentationMode, destinationUrl: "https://ejemplo.cl" } });
    return { company, campaign, landing: await point("landing", "MENU", "LANDING"), direct: await point("direct", "WHATSAPP", "DIRECT"), club: await point("club", "CLUB", "DIRECT") };
  };
  const a = await seed("a"), b = await seed("b");
  const visit = async (s: typeof a, tp: { id: string; objective: "MENU" | "CLUB" | "WHATSAPP" | string }, source: "NFC" | "QR" | "DIRECT", at: string) => {
    const id = randomUUID();
    await prisma.localVisit.create({ data: { id, companyId: s.company.id, campaignId: s.campaign.id, touchpointId: tp.id, source, objective: tp.objective as "MENU" | "CLUB" | "WHATSAPP", createdAt: new Date(at) } });
    return id;
  };
  const event = (s: typeof a, visitId: string, tp: { id: string }, eventType: "LANDING_VIEW" | "WHATSAPP_REDIRECT" | "DESTINATION_REDIRECT" | "VCF_DOWNLOAD", at: string) =>
    prisma.localEvent.create({ data: { visitId, campaignId: s.campaign.id, touchpointId: tp.id, eventType, createdAt: new Date(at) } });
  const click = (s: typeof a, visitId: string, tp: { id: string }, actionId: string, actionType: string, at: string) =>
    prisma.localActionClick.create({ data: { companyId: s.company.id, campaignId: s.campaign.id, touchpointId: tp.id, visitId, actionId, actionType, actionRole: "primary",
      source: "NFC", objective: "MENU", presentationMode: "LANDING", createdAt: new Date(at) } });

  // Empresa A, semana del 21-sep. 24-sep 23:30 en Chile = 25-sep 02:30 UTC → cuenta el 24.
  const v1 = await visit(a, a.landing, "NFC", "2026-09-25T02:30:00Z");
  await event(a, v1, a.landing, "LANDING_VIEW", "2026-09-25T02:30:05Z");
  await click(a, v1, a.landing, "primary", "MENU", "2026-09-25T02:30:10Z");
  await click(a, v1, a.landing, "insta00001", "INSTAGRAM", "2026-09-25T02:30:20Z");
  const v2 = await visit(a, a.landing, "QR", "2026-09-25T12:00:00Z");
  await event(a, v2, a.landing, "LANDING_VIEW", "2026-09-25T12:00:05Z");
  const v3 = await visit(a, a.direct, "QR", "2026-09-22T12:00:00Z");
  await event(a, v3, a.direct, "WHATSAPP_REDIRECT", "2026-09-22T12:00:01Z");
  const v4 = await visit(a, a.club, "DIRECT", "2026-09-23T12:00:00Z");
  await event(a, v4, a.club, "WHATSAPP_REDIRECT", "2026-09-23T12:01:00Z");
  await event(a, v4, a.club, "VCF_DOWNLOAD", "2026-09-23T12:02:00Z");
  await visit(a, a.direct, "NFC", "2026-09-15T12:00:00Z"); // semana anterior (comparación)
  // Empresa B: nunca debe aparecer en A.
  const vb = await visit(b, b.landing, "NFC", "2026-09-24T12:00:00Z");
  await click(b, vb, b.landing, "primary", "MENU", "2026-09-24T12:00:10Z");

  const period = resolveAnalyticsPeriod({ period: "week" }, NOW);
  const r = await localAnalytics(a.company.id, period, period.compare);
  assert.deepEqual(r.totals, { visits: 4, nfc: 1, qr: 2, direct: 1, landingViews: 2, actionClicks: 2, directExits: 1, newSubscribers: 0, clubWhatsapp: 1, clubContacts: 1 },
    "la confirmación por WhatsApp del Club no se cuenta como salida directa");
  assert.equal(r.previous.visits, 1);
  assert.deepEqual(r.daily, [{ day: "2026-09-22", visits: 1, clicks: 0 }, { day: "2026-09-23", visits: 1, clicks: 0 },
    { day: "2026-09-24", visits: 1, clicks: 2 }, { day: "2026-09-25", visits: 1, clicks: 0 }], "agrupado por día de Chile");
  assert.deepEqual(r.actions.map((x: { type: string; clicks: number }) => [x.type, x.clicks]).sort(), [["INSTAGRAM", 1], ["MENU", 1]]);
  assert.deepEqual(r.points.map((p: { name: string; visits: number; clicks: number }) => [p.name, p.visits, p.clicks]),
    [["Punto Demo landing", 2, 2], ["Punto Demo direct", 1, 0], ["Punto Demo club", 1, 0]]);
  assert.deepEqual(r.locations.map((l: { name: string; visits: number }) => [l.name, l.visits]), [["Local Demo", 4]]);
  assert.ok(!JSON.stringify(r).includes(b.company.id) && !JSON.stringify(r).includes(b.landing.id), "sin datos de otra empresa");
  const rb = await localAnalytics(b.company.id, period, null);
  assert.deepEqual([rb.totals.visits, rb.totals.actionClicks, rb.previous], [1, 1, null]);

  for (const s of [a, b]) {
    await prisma.localActionClick.deleteMany({ where: { companyId: s.company.id } });
    await prisma.localEvent.deleteMany({ where: { campaignId: s.campaign.id } });
    await prisma.localVisit.deleteMany({ where: { companyId: s.company.id } });
  }
  await prisma.$disconnect();
});
