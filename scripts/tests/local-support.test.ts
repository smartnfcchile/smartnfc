import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";

// ── Integración: PostgreSQL desechable en loopback ──────────────────────────
const url = process.env.LOCAL_TEST_DATABASE_URL;
const allowed = url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname);
test("Soporte SuperAdmin Local: solo lectura, aislado por empresa y auditado", { skip: !allowed }, async t => {
  process.env.DATABASE_URL = url!;
  process.env.NEXTAUTH_SECRET = "local-test-secret-only";
  let session: { user: { id: string; companyId: string; role: string } } | null = null;
  require("next-auth");
  require.cache[require.resolve("next-auth")]!.exports = { getServerSession: async () => session };
  const { prisma } = require("../../lib/prisma") as { prisma: PrismaClient };
  const { loadLocalSupport, recordSupportView, SUPPORT_VIEW_ACTION } = require("../../lib/local/support");
  const { default: SupportPage } = require("../../app/superadmin/locales/[companyId]/page");
  const suffix = randomUUID().slice(0, 8);

  const platform = await prisma.company.create({ data: { name: "Plataforma Demo " + suffix, slug: "platform-" + suffix } });
  const admin = await prisma.user.create({ data: { companyId: platform.id, email: `support-${suffix}@example.test`, role: "SUPERADMIN" } });
  const seed = async (tag: string) => {
    const company = await prisma.company.create({ data: { name: `Tienda Demo ${tag} ${suffix}`, slug: `support-${tag}-${suffix}` } });
    const owner = await prisma.user.create({ data: { companyId: company.id, email: `owner-${tag}-${suffix}@example.test`, role: "COMPANY_OWNER" } });
    await prisma.companyProductLicense.create({ data: { companyId: company.id, product: "LOCAL", planCode: "LOCAL_PERSONALIZADO", includedCampaigns: 10, includedTouchpoints: 40 } });
    const location = await prisma.localLocation.create({ data: { companyId: company.id, key: `loc-${tag}-${suffix}`, name: `Sucursal Interna ${tag}`, displayName: `Tienda Demo ${tag}` } });
    const campaign = await prisma.localCampaign.create({ data: { companyId: company.id, locationId: location.id, name: `Campaña Demo ${tag}`, slug: `support-c-${tag}-${suffix}` } });
    const point = await prisma.localTouchpoint.create({ data: { campaignId: campaign.id, code: `code${tag}${suffix}`, name: `Punto Demo ${tag}`, objective: "MENU",
      presentationMode: "LANDING", destinationUrl: "https://ejemplo.cl/menu" } });
    const card = await prisma.physicalNfcCard.create({ data: { companyId: company.id, token: `secret-token-${tag}-${suffix}-ABCD`, localTouchpointId: point.id, status: "ACTIVA" } });
    return { company, owner, location, campaign, point, card };
  };
  const a = await seed("a"), b = await seed("b");
  const render = async (companyId: string) => renderToStaticMarkup(await SupportPage({ params: Promise.resolve({ companyId }), searchParams: Promise.resolve({ period: "month" }) }));

  await t.test("Solo SuperAdmin: el dueño de otra empresa (o sin sesión) es rechazado", async () => {
    session = null;
    await assert.rejects(() => render(a.company.id));
    session = { user: { id: b.owner.id, companyId: b.company.id, role: "COMPANY_OWNER" } };
    await assert.rejects(() => render(a.company.id), /SuperAdmin/);
  });

  await t.test("Muestra solo la empresa solicitada: locales, puntos, código, NFC enmascarada y licencia", async () => {
    session = { user: { id: admin.id, companyId: platform.id, role: "SUPERADMIN" } };
    const html = await render(a.company.id);
    for (const text of ["Tienda Demo a", "Sucursal Interna a", "Punto Demo a", a.point.code, "…ABCD", "LOCAL_TOUCHPOINTS", "Vista de solo lectura"]) assert.ok(html.includes(text), text);
    assert.ok(!html.includes(a.card.token), "nunca el token NFC completo");
    for (const other of ["Tienda Demo b", "Punto Demo b", b.point.code, b.company.id]) assert.ok(!html.includes(other), other);
    assert.ok(!html.includes(`/p/${a.point.code}`) && !html.includes(`/q/${a.point.code}`), "no enlaza entradas públicas (no contamina la analítica)");
  });

  await t.test("No escribe datos del cliente; la auditoría registra el acceso una vez cada 10 minutos", async () => {
    const before = { tp: await prisma.localTouchpoint.findUniqueOrThrow({ where: { id: a.point.id } }), visits: await prisma.localVisit.count({ where: { companyId: a.company.id } }) };
    await render(a.company.id); await render(a.company.id);
    const after = { tp: await prisma.localTouchpoint.findUniqueOrThrow({ where: { id: a.point.id } }), visits: await prisma.localVisit.count({ where: { companyId: a.company.id } }) };
    assert.deepEqual(after, before);
    const logs = await prisma.adminAuditLog.findMany({ where: { companyId: a.company.id, action: SUPPORT_VIEW_ACTION } });
    assert.equal(logs.length, 1);
    assert.equal(logs[0].actorUserId, admin.id);
    assert.equal(await recordSupportView(admin.id, a.company.id, new Date(Date.now() + 11 * 60 * 1000)), true, "pasado el intervalo se registra de nuevo");
  });

  await t.test("Carga acotada: ids inválidos o inexistentes no devuelven nada; una tarjeta de otra empresa no se muestra", async () => {
    assert.equal(await loadLocalSupport("../x"), null);
    assert.equal(await loadLocalSupport("noexiste" + suffix), null);
    await prisma.physicalNfcCard.update({ where: { id: b.card.id }, data: { localTouchpointId: null } });
    await prisma.physicalNfcCard.update({ where: { id: a.card.id }, data: { localTouchpointId: null } });
    await prisma.physicalNfcCard.update({ where: { id: b.card.id }, data: { localTouchpointId: a.point.id } });
    const support = await loadLocalSupport(a.company.id);
    assert.equal(support.points[0].nfc, null, "vínculo inconsistente con otra empresa: oculto");
  });

  await prisma.adminAuditLog.deleteMany({ where: { companyId: { in: [a.company.id, b.company.id] } } });
  await prisma.$disconnect();
});
