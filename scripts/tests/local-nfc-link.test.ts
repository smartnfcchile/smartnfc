import { checkDisposableDatabaseUrl, selectDisposableDatabase } from "./helpers/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { PrismaClient } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";

// Sesión y caché simuladas ANTES de cargar cualquier módulo que importe next-auth (nfc-link → entitlements →
// permissions). Un import estático capturaría la implementación real y toda llamada fallaría como "No autorizado".
let session: { user: { id: string; companyId: string; role: string } } | null = null;
// Prisma fixes its URL right after the client is built, and the module-level requires below build it.
// The database must therefore be chosen first; otherwise the client stays on whatever DATABASE_URL held
// at that moment (before the guard existed, that was .env, i.e. production).
if (checkDisposableDatabaseUrl(process.env.LOCAL_TEST_DATABASE_URL).ok) selectDisposableDatabase(process.env.LOCAL_TEST_DATABASE_URL);
require("next-auth");
require.cache[require.resolve("next-auth")]!.exports = { getServerSession: async () => session };
require("next/cache"); require.cache[require.resolve("next/cache")]!.exports = { revalidatePath: () => {} };
const { normalizeNfcToken, nfcReadiness, tokenHint } = require("../../lib/local/nfc-link") as typeof import("../../lib/local/nfc-link");
const { pointPreviewTarget } = require("../../lib/local/point-preview") as typeof import("../../lib/local/point-preview");

// ── Unitarias (sin base de datos) ───────────────────────────────────────────
test("Token NFC: acepta el token o la URL grabada en el chip; rechaza formatos inventados", () => {
  assert.equal(normalizeNfcToken("abc123def4567890"), "abc123def4567890");
  assert.equal(normalizeNfcToken("  https://smartnfc.cl/t/abc_123-XYZ  "), "abc_123-XYZ");
  assert.equal(normalizeNfcToken("smartnfc.cl/t/abc123/"), "abc123");
  assert.equal(normalizeNfcToken("https://smartnfc.cl/t/abc123?x=1"), "abc123");
  for (const bad of ["", "   ", "../x", "a b", "https://smartnfc.cl/c/perfil", "<script>", 42, null, "x".repeat(129)]) assert.equal(normalizeNfcToken(bad), null, String(bad));
  assert.equal(tokenHint("secret-token-ABCD"), "…ABCD");
});

test("Preparación del NFC según el estado que exige /t (Entregada o Activa)", () => {
  assert.equal(nfcReadiness("ACTIVA").ready, true);
  assert.equal(nfcReadiness("ENTREGADA").ready, true);
  for (const status of ["PENDIENTE_GRABACION", "GRABADA", "ENVIADA", "SUSPENDIDA"] as const) assert.equal(nfcReadiness(status).ready, false, status);
});

test("Vista previa administrativa (D7): nunca apunta a /p, /q, /t ni /club", () => {
  const base = { code: "abc123", presentationMode: "DIRECT" as const, destinationUrl: "https://ejemplo.cl/menu", objectiveConfig: {} };
  assert.deepEqual(pointPreviewTarget({ ...base, objective: "CLUB" }), { kind: "CLUB" });
  assert.deepEqual(pointPreviewTarget({ ...base, objective: "SMART_LANDING" }), { kind: "LANDING", href: "/l/abc123" });
  assert.deepEqual(pointPreviewTarget({ ...base, objective: "MENU", presentationMode: "LANDING" }), { kind: "LANDING", href: "/l/abc123" });
  assert.deepEqual(pointPreviewTarget({ ...base, objective: "MENU" }), { kind: "DIRECT", href: "https://ejemplo.cl/menu" });
  assert.deepEqual(pointPreviewTarget({ ...base, objective: "MENU", destinationUrl: null }), { kind: "UNCONFIGURED" });
});

test("El panel Local del cliente ya no expone acciones de vinculación NFC", () => {
  const actions = readFileSync("app/dashboard/local/actions.ts", "utf8");
  for (const name of ["associateNfcCardAction", "disassociateNfcCardAction", "getCompanyAvailableNfcCardsAction"]) assert.ok(!actions.includes(`function ${name}`), name);
  const editor = readFileSync("app/dashboard/local/campanas/[campaignId]/CampanaEditorClient.tsx", "utf8");
  assert.ok(!/associateNfcCardAction/.test(editor));
});

// ── Integración: PostgreSQL desechable en loopback ──────────────────────────
const url = process.env.LOCAL_TEST_DATABASE_URL;
const allowed = url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname);
test("Vinculación NFC ↔ Punto Inteligente: solo SuperAdmin, validada, auditada y sin analítica", { skip: !allowed }, async t => {
  process.env.DATABASE_URL = url!;
  process.env.NEXTAUTH_SECRET = "local-test-secret-only";
  const { prisma } = require("../../lib/prisma") as { prisma: PrismaClient };
  const actions = require("../../app/superadmin/locales/[companyId]/nfc-actions");
  const { loadPointLanding } = require("../../lib/local/landing");
  const { default: SupportPage } = require("../../app/superadmin/locales/[companyId]/page");
  const suffix = randomUUID().slice(0, 8);

  const platform = await prisma.company.create({ data: { name: "Plataforma NFC " + suffix, slug: "nfc-platform-" + suffix } });
  const superadmin = await prisma.user.create({ data: { companyId: platform.id, email: `nfc-sa-${suffix}@example.test`, role: "SUPERADMIN" } });
  const asSuperadmin = () => { session = { user: { id: superadmin.id, companyId: platform.id, role: "SUPERADMIN" } }; };
  let n = 0;
  const seed = async (tag: string) => {
    const company = await prisma.company.create({ data: { name: `Café NFC ${tag} ${suffix}`, slug: `nfc-${tag}-${suffix}` } });
    const owner = await prisma.user.create({ data: { companyId: company.id, email: `nfc-owner-${tag}-${suffix}@example.test`, role: "COMPANY_OWNER" } });
    const admin = await prisma.user.create({ data: { companyId: company.id, email: `nfc-admin-${tag}-${suffix}@example.test`, role: "COMPANY_ADMIN" } });
    await prisma.companyProductLicense.create({ data: { companyId: company.id, product: "LOCAL", planCode: "LOCAL_PERSONALIZADO", includedCampaigns: 10, includedTouchpoints: 40 } });
    const location = await prisma.localLocation.create({ data: { companyId: company.id, key: `nfc-loc-${tag}-${suffix}`, name: `Sucursal ${tag}`, displayName: `Café NFC ${tag}` } });
    const campaign = await prisma.localCampaign.create({ data: { companyId: company.id, locationId: location.id, name: `Puntos ${tag}`, slug: `nfc-c-${tag}-${suffix}` } });
    const point = (data: Record<string, unknown> = {}) => prisma.localTouchpoint.create({ data: { campaignId: campaign.id, code: `nfc${tag}${suffix}${++n}`, name: `Caja ${tag} ${n}`, location: "Mostrador",
      objective: "MENU", presentationMode: "LANDING", medium: "NFC_QR", destinationUrl: "https://ejemplo.cl/menu", ...data } });
    const card = (status: "ENTREGADA" | "ACTIVA" | "PENDIENTE_GRABACION" = "ENTREGADA") => prisma.physicalNfcCard.create({ data: { companyId: company.id, token: `nfc-${tag}-${suffix}-${++n}wxyz`, status } });
    return { company, owner, admin, location, campaign, point, card };
  };
  const a = await seed("a"), b = await seed("b");
  const pointA = await a.point(), qrPoint = await a.point({ medium: "QR" }), pointB = await b.point();
  const archived = await prisma.localCampaign.create({ data: { companyId: a.company.id, locationId: a.location.id, name: "Archivada", slug: `nfc-arch-${suffix}`, status: "ARCHIVED" } });
  const archivedPoint = await prisma.localTouchpoint.create({ data: { campaignId: archived.id, code: `nfcarch${suffix}`, name: "Archivado", objective: "MENU", presentationMode: "LANDING", destinationUrl: "https://ejemplo.cl/menu" } });
  const freeA = await a.card(), freeA2 = await a.card(), freeA3 = await a.card("ACTIVA"), cardB = await b.card();
  const profile = await prisma.card.create({ data: { name: "Perfil A", slug: `nfc-perfil-${suffix}`, companyId: a.company.id, userId: a.owner.id } });
  const b2bCard = await prisma.physicalNfcCard.create({ data: { companyId: a.company.id, token: `nfc-b2b-${suffix}`, status: "ACTIVA", cardId: profile.id } });

  const cardState = (id: string) => prisma.physicalNfcCard.findUniqueOrThrow({ where: { id }, select: { localTouchpointId: true, cardId: true, companyId: true, status: true, activatedAt: true } });
  const analytics = async () => ({ visits: await prisma.localVisit.count({ where: { companyId: a.company.id } }),
    events: await prisma.localEvent.count({ where: { campaign: { companyId: a.company.id } } }),
    clicks: await prisma.localActionClick.count({ where: { touchpointId: pointA.id } }) });

  await t.test("Usuarios no autorizados no pueden revisar, vincular, comprobar ni desvincular (aunque llamen la acción directamente)", async () => {
    for (const s of [null, { user: { id: a.owner.id, companyId: a.company.id, role: "COMPANY_OWNER" } }, { user: { id: a.admin.id, companyId: a.company.id, role: "COMPANY_ADMIN" } }]) {
      session = s;
      for (const res of [await actions.previewPointNfcLinkAction(a.company.id, pointA.id, freeA.token), await actions.linkPointNfcAction(a.company.id, pointA.id, freeA.token),
        await actions.checkPointNfcDestinationAction(a.company.id, pointA.id), await actions.unlinkPointNfcAction(a.company.id, pointA.id, freeA.id)]) {
        assert.deepEqual(res, { success: false, error: "No autorizado." });
      }
    }
    assert.equal((await cardState(freeA.id)).localTouchpointId, null);
    assert.equal(await prisma.adminAuditLog.count({ where: { companyId: a.company.id } }), 0);
  });

  await t.test("Revisar la vinculación valida y muestra datos reales sin escribir nada", async () => {
    asSuperadmin();
    const res = await actions.previewPointNfcLinkAction(a.company.id, pointA.id, `https://smartnfc.cl/t/${freeA.token}`);
    assert.equal(res.success, true, res.error);
    assert.equal(res.data.client, a.company.name);
    assert.equal(res.data.local, "Café NFC a");
    assert.equal(res.data.point, pointA.name);
    assert.equal(res.data.nfc.hint, "…" + freeA.token.slice(-4));
    assert.equal(res.data.nfc.status, "Entregada");
    assert.match(res.data.destination.summary, /Página del local/);
    assert.deepEqual(res.data.destination.preview?.href, `/l/${pointA.code}`);
    assert.ok(!JSON.stringify(res.data).includes(freeA.token), "nunca el token completo");
    assert.equal((await cardState(freeA.id)).localTouchpointId, null);
  });

  await t.test("Asociaciones inválidas o de otra empresa se rechazan con mensajes comprensibles", async () => {
    asSuperadmin();
    const cases: Array<[string, string, string, RegExp]> = [
      [a.company.id, pointA.id, "no-existe-" + suffix, /No existe un NFC registrado/],
      [a.company.id, pointA.id, "../x", /Ingresa el token/],
      [a.company.id, pointA.id, cardB.token, /otra empresa/],
      [a.company.id, pointA.id, b2bCard.token, /identidad digital/],
      [a.company.id, qrPoint.id, freeA.token, /solo para QR/],
      [a.company.id, archivedPoint.id, freeA.token, /archivada/],
      [a.company.id, pointB.id, freeA.token, /no encontrado/],     // punto de otra empresa con el companyId propio
      [b.company.id, pointA.id, cardB.token, /no encontrado/],     // companyId manipulado
      [a.company.id, "id inválido", freeA.token, /no encontrado/],
    ];
    for (const [companyId, pointId, token, expected] of cases) {
      for (const res of [await actions.previewPointNfcLinkAction(companyId, pointId, token), await actions.linkPointNfcAction(companyId, pointId, token)]) {
        assert.equal(res.success, false); assert.match(res.error, expected); assert.doesNotMatch(res.error, /prisma|invocation/i);
      }
    }
    for (const id of [freeA.id, cardB.id, b2bCard.id]) assert.equal((await cardState(id)).localTouchpointId, null);
    assert.equal((await cardState(b2bCard.id)).cardId, profile.id);
  });

  await t.test("SuperAdmin vincula un NFC válido; queda auditado sin el token completo y sin cambiar su estado", async () => {
    asSuperadmin();
    const res = await actions.linkPointNfcAction(a.company.id, pointA.id, freeA.token);
    assert.deepEqual(res, { success: true, data: { hint: "…" + freeA.token.slice(-4) } });
    const state = await cardState(freeA.id);
    assert.equal(state.localTouchpointId, pointA.id);
    assert.equal(state.status, "ENTREGADA"); assert.equal(state.activatedAt, null); assert.equal(state.companyId, a.company.id);
    const logs = await prisma.adminAuditLog.findMany({ where: { companyId: a.company.id, action: "LOCAL_NFC_LINKED" } });
    assert.equal(logs.length, 1); assert.equal(logs[0].actorUserId, superadmin.id); assert.equal(logs[0].entityId, freeA.id);
    assert.ok(!(logs[0].metadata || "").includes(freeA.token));
  });

  await t.test("No reemplaza silenciosamente: un punto con NFC no acepta otro y un NFC vinculado no se mueve", async () => {
    asSuperadmin();
    const other = await actions.linkPointNfcAction(a.company.id, pointA.id, freeA2.token);
    assert.equal(other.success, false); assert.match(other.error, /ya tiene un NFC vinculado/);
    const pointA2 = await a.point();
    const moved = await actions.linkPointNfcAction(a.company.id, pointA2.id, freeA.token);
    assert.equal(moved.success, false); assert.match(moved.error, /otro Punto Inteligente/);
    assert.equal((await cardState(freeA.id)).localTouchpointId, pointA.id);
    assert.equal((await cardState(freeA2.id)).localTouchpointId, null);
  });

  await t.test("Concurrencia: dos NFC distintos al mismo punto en paralelo, solo uno queda vinculado", async () => {
    asSuperadmin();
    const target = await a.point();
    const results: Array<{ success: boolean; error?: string }> = await Promise.all([actions.linkPointNfcAction(a.company.id, target.id, freeA2.token), actions.linkPointNfcAction(a.company.id, target.id, freeA3.token)]);
    assert.equal(results.filter(r => r.success).length, 1);
    for (const r of results.filter(r => !r.success)) assert.match(r.error ?? "", /ya tiene un NFC vinculado|cambió/);
    assert.equal(await prisma.physicalNfcCard.count({ where: { localTouchpointId: target.id } }), 1);
  });

  await t.test("Comprobar destino y la vista previa no registran analítica ni activan el NFC", async () => {
    asSuperadmin();
    const before = await analytics();
    const res = await actions.checkPointNfcDestinationAction(a.company.id, pointA.id);
    assert.equal(res.success, true, res.error);
    assert.equal(res.data.destination.publiclyAvailable, true);
    assert.equal(res.data.nfc.status, "Entregada"); assert.equal(res.data.nfc.ready, true);
    await actions.previewPointNfcLinkAction(a.company.id, pointA.id, freeA.token);
    assert.equal((await loadPointLanding(pointA.code, null)).status, "ok");
    assert.deepEqual(await analytics(), before);
    const state = await cardState(freeA.id);
    assert.equal(state.status, "ENTREGADA"); assert.equal(state.activatedAt, null);
  });

  await t.test("La vista de soporte muestra el estado NFC sin el token completo", async () => {
    asSuperadmin();
    const html = renderToStaticMarkup(await SupportPage({ params: Promise.resolve({ companyId: a.company.id }), searchParams: Promise.resolve({ period: "month" }) }));
    for (const text of ["NFC vinculado", "Sin NFC vinculado", "Vincular NFC", "Comprobar destino", "Desvincular NFC", "No aplica (solo QR)", "Vista de solo lectura", "…" + freeA.token.slice(-4)]) assert.ok(html.includes(text), text);
    assert.ok(!html.includes(freeA.token), "nunca el token completo");
    assert.ok(!html.includes(`/p/${pointA.code}`) && !html.includes(`/q/${pointA.code}`) && !html.includes("/t/"), "no enlaza entradas que registran analítica");
  });

  await t.test("Desvincular quita solo la asociación: conserva punto, historial y tarjeta reutilizable", async () => {
    asSuperadmin();
    const visitId = randomUUID();
    await prisma.localVisit.create({ data: { id: visitId, companyId: a.company.id, campaignId: a.campaign.id, touchpointId: pointA.id, source: "NFC", objective: "MENU" } });
    const stale = await actions.unlinkPointNfcAction(a.company.id, pointA.id, freeA2.id);
    assert.equal(stale.success, false); assert.match(stale.error, /cambió/);
    const manipulated = await actions.unlinkPointNfcAction(b.company.id, pointA.id, freeA.id);
    assert.equal(manipulated.success, false); assert.match(manipulated.error, /no encontrado/);
    assert.equal((await cardState(freeA.id)).localTouchpointId, pointA.id);

    const res = await actions.unlinkPointNfcAction(a.company.id, pointA.id, freeA.id);
    assert.deepEqual(res, { success: true, data: { hint: "…" + freeA.token.slice(-4) } });
    const state = await cardState(freeA.id);
    assert.equal(state.localTouchpointId, null); assert.equal(state.companyId, a.company.id); assert.equal(state.status, "ENTREGADA");
    const point = await prisma.localTouchpoint.findUnique({ where: { id: pointA.id } });
    assert.ok(point && point.isActive && point.code === pointA.code, "el punto y su código QR siguen existiendo");
    assert.equal((await prisma.localVisit.findUniqueOrThrow({ where: { id: visitId } })).touchpointId, pointA.id, "historial conservado");
    assert.equal(await prisma.adminAuditLog.count({ where: { companyId: a.company.id, action: "LOCAL_NFC_UNLINKED" } }), 1);

    const again = await actions.unlinkPointNfcAction(a.company.id, pointA.id, freeA.id);
    assert.equal(again.success, false); assert.match(again.error, /ya no tiene un NFC/);
    const relink = await actions.linkPointNfcAction(a.company.id, pointA.id, freeA.token);
    assert.equal(relink.success, true, "la tarjeta queda disponible para reutilizarse");
  });

  await prisma.adminAuditLog.deleteMany({ where: { companyId: { in: [a.company.id, b.company.id] } } });
  await prisma.$disconnect();
});
