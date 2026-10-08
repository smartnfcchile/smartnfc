import "./helpers/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
// H-1: INTERNAL / PILOT / PURCHASE / LEGACY_PRESERVED. Requires a disposable PostgreSQL (see
// entitlements-integration.test.ts); skipped otherwise. Never Neon, never production.
const url = process.env.BLOCK2_TEST_DATABASE_URL;
const allowed = !!url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname) && new URL(url).pathname.includes("block2_disposable");
test("H-1: INTERNAL/PILOT/PURCHASE profile rights, Teams without a permanent right, and multi-tenant isolation", { skip: !allowed }, async (t) => {
  process.env.DATABASE_URL = url!;
  let session: { user: { id: string; companyId: string; role: string } } | null = null;
  require("next-auth"); require.cache[require.resolve("next-auth")]!.exports = { getServerSession: async () => session };
  require("next/cache"); require.cache[require.resolve("next/cache")]!.exports = { revalidatePath: () => {} };
  const { prisma: db } = require("../../lib/prisma") as { prisma: PrismaClient };
  const { hasCardProfileRight, getCompanyEntitlements } = require("../../lib/entitlements");
  const { assignCardProfileRightAction, revokeCardProfileRightAction } = require("../../app/superadmin/actions");
  const { createVirtualCard } = require("../../app/dashboard/cards/actions");
  const suffix = randomUUID().slice(0, 8);

  const a = await db.company.create({ data: { name: "H1 A " + suffix } });
  const b = await db.company.create({ data: { name: "H1 B " + suffix } });
  const owner = await db.user.create({ data: { companyId: a.id, role: "COMPANY_OWNER", email: "owner-" + suffix + "@example.test" } });
  const superadmin = await db.user.create({ data: { companyId: a.id, role: "SUPERADMIN", email: "super-" + suffix + "@example.test" } });
  const teams = await db.companyProductLicense.create({ data: { companyId: a.id, product: "EMPRESAS", planCode: "EMPRESAS_TEAM_5" } });

  const mkCard = (companyId: string, userId: string, tag: string) =>
    db.card.create({ data: { companyId, userId, name: tag, slug: tag + "-" + suffix } });

  await t.test("Creating a Card grants no profile right by itself (ADMIN_GRANTED is gone)", async () => {
    session = { user: { id: owner.id, companyId: a.id, role: owner.role } };
    const res = await createVirtualCard("Teams Person", "teams-person-" + suffix, owner.id);
    assert.equal(res.success, true, res.error);
    const card = await db.card.findUniqueOrThrow({ where: { slug: "teams-person-" + suffix } });
    assert.equal(await db.cardProfileRight.count({ where: { cardId: card.id } }), 0);
    // Works via the active Teams license, not via a right of its own.
    assert.equal(await hasCardProfileRight(card.id, a.id), true);
    await db.companyProductLicense.update({ where: { id: teams.id }, data: { status: "EXPIRED" } });
    assert.equal(await hasCardProfileRight(card.id, a.id), false, "Teams identity has no permanent right once the license lapses");
    await db.companyProductLicense.update({ where: { id: teams.id }, data: { status: "ACTIVE" } });
  });

  await t.test("Teams identity later buys a physical card: the same Card is reused, never recreated", async () => {
    const card = await db.card.findUniqueOrThrow({ where: { slug: "teams-person-" + suffix } });
    session = { user: { id: superadmin.id, companyId: a.id, role: "SUPERADMIN" } };
    const r = await assignCardProfileRightAction({ cardId: card.id, origin: "PURCHASE", reference: "ORD-" + suffix, reason: "Venta confirmada" });
    assert.equal(r.success, true, r.error);
    assert.equal(await db.card.count({ where: { slug: "teams-person-" + suffix } }), 1, "no second Card was created");
    await db.companyProductLicense.update({ where: { id: teams.id }, data: { status: "CANCELLED" } });
    assert.equal(await hasCardProfileRight(card.id, a.id), true, "PURCHASE is permanent and survives Teams cancellation");
    await db.companyProductLicense.update({ where: { id: teams.id }, data: { status: "ACTIVE" } });
  });

  await t.test("INTERNAL: permanent, revocable by Superadmin, never expiring", async () => {
    const card = await mkCard(a.id, owner.id, "internal");
    const r1 = await assignCardProfileRightAction({ cardId: card.id, origin: "INTERNAL", reason: "Uso interno SmartNFC" });
    assert.equal(r1.success, true, r1.error);
    await db.companyProductLicense.update({ where: { id: teams.id }, data: { status: "CANCELLED" } });
    assert.equal(await hasCardProfileRight(card.id, a.id), true);
    // Reject INTERNAL with an expiry.
    const bad = await assignCardProfileRightAction({ cardId: card.id, origin: "INTERNAL", expiresAt: "2099-01-01", reason: "x" });
    assert.equal(bad.success, false);
    const right = await db.cardProfileRight.findUniqueOrThrow({ where: { cardId: card.id } });
    assert.equal(right.origin, "INTERNAL"); assert.equal(right.expiresAt, null);
    const rev = await revokeCardProfileRightAction(card.id);
    assert.equal(rev.success, true, rev.error);
    assert.equal(await hasCardProfileRight(card.id, a.id), false, "revoked INTERNAL loses access once Teams is also inactive");
    const revoked = await db.cardProfileRight.findUniqueOrThrow({ where: { cardId: card.id } });
    assert.ok(revoked.revokedAt); assert.equal(revoked.revokedByUserId, superadmin.id);
    await db.companyProductLicense.update({ where: { id: teams.id }, data: { status: "ACTIVE" } });
  });

  await t.test("PILOT vigente/vencido: requires expiresAt, blocks without it, and expires correctly", async () => {
    const card = await mkCard(a.id, owner.id, "pilot");
    const missing = await assignCardProfileRightAction({ cardId: card.id, origin: "PILOT", reason: "Piloto" });
    assert.equal(missing.success, false, "PILOT must require expiresAt");
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const r = await assignCardProfileRightAction({ cardId: card.id, origin: "PILOT", expiresAt: future, reference: "Piloto Pulpograf", reason: "Piloto comercial 12 meses" });
    assert.equal(r.success, true, r.error);
    await db.companyProductLicense.update({ where: { id: teams.id }, data: { status: "CANCELLED" } });
    assert.equal(await hasCardProfileRight(card.id, a.id), true, "PILOT is effective before it expires");
    // Force it into the past directly (the action itself refuses a past date). grantedAt must stay
    // before expiresAt (CHECK constraint), so both are pushed back safely into the past.
    await db.cardProfileRight.update({ where: { cardId: card.id }, data: {
      grantedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    } });
    assert.equal(await hasCardProfileRight(card.id, a.id), false, "PILOT vencido loses access");
    // Nothing about the underlying data is touched by expiry.
    const stillThere = await db.card.findUniqueOrThrow({ where: { id: card.id } });
    assert.equal(stillThere.slug, card.slug);
    await db.companyProductLicense.update({ where: { id: teams.id }, data: { status: "ACTIVE" } });
  });

  await t.test("PILOT -> PURCHASE conversion preserves Card/slug/PhysicalNfcCard/Lead/Event and clears expiry/revocation", async () => {
    const card = await mkCard(a.id, owner.id, "convert");
    const physical = await db.physicalNfcCard.create({ data: { companyId: a.id, cardId: card.id, token: "chip-" + suffix, status: "ENTREGADA" } });
    const lead = await db.lead.create({ data: { companyId: a.id, cardId: card.id, name: "Historical lead" } });
    await db.event.create({ data: { cardId: card.id, eventType: "VIEW" } });
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await assignCardProfileRightAction({ cardId: card.id, origin: "PILOT", expiresAt: future, reason: "Piloto" });
    await db.cardProfileRight.update({ where: { cardId: card.id }, data: { revokedAt: new Date(), revokedByUserId: superadmin.id } });
    // Isolate the check to the right itself: with Teams still active, empresasOperational would mask it.
    await db.companyProductLicense.update({ where: { id: teams.id }, data: { status: "CANCELLED" } });
    assert.equal(await hasCardProfileRight(card.id, a.id), false, "a revoked pilot is not effective even before its own expiry");
    await db.companyProductLicense.update({ where: { id: teams.id }, data: { status: "ACTIVE" } });

    const conv = await assignCardProfileRightAction({ cardId: card.id, origin: "PURCHASE", reference: "ORD-CONV-" + suffix, reason: "Conversión piloto -> venta confirmada" });
    assert.equal(conv.success, true, conv.error);

    const afterCard = await db.card.findUniqueOrThrow({ where: { id: card.id } });
    assert.equal(afterCard.id, card.id); assert.equal(afterCard.slug, card.slug);
    assert.equal(await db.physicalNfcCard.count({ where: { id: physical.id, cardId: card.id } }), 1, "same PhysicalNfcCard, same association");
    assert.equal(await db.lead.count({ where: { id: lead.id } }), 1);
    assert.equal(await db.event.count({ where: { cardId: card.id } }), 1);
    assert.equal(await db.cardProfileRight.count({ where: { cardId: card.id } }), 1, "no second right row was created (cardId is the PK)");
    const right = await db.cardProfileRight.findUniqueOrThrow({ where: { cardId: card.id } });
    assert.equal(right.origin, "PURCHASE"); assert.equal(right.expiresAt, null);
    assert.equal(right.revokedAt, null); assert.equal(right.revokedByUserId, null);
    await db.companyProductLicense.update({ where: { id: teams.id }, data: { status: "CANCELLED" } });
    assert.equal(await hasCardProfileRight(card.id, a.id), true, "PURCHASE survives Teams cancellation");
    await db.companyProductLicense.update({ where: { id: teams.id }, data: { status: "ACTIVE" } });
  });

  await t.test("Card.isActive keeps its own, separate control (unaffected by CardProfileRight)", async () => {
    const card = await mkCard(a.id, owner.id, "inactive-card");
    await assignCardProfileRightAction({ cardId: card.id, origin: "PURCHASE", reason: "Venta" });
    await db.card.update({ where: { id: card.id }, data: { isActive: false } });
    // hasCardProfileRight does not read Card.isActive: /c and /t check it separately and unchanged.
    assert.equal(await hasCardProfileRight(card.id, a.id), true);
    const stillInactive = await db.card.findUniqueOrThrow({ where: { id: card.id } });
    assert.equal(stillInactive.isActive, false);
  });

  await t.test("Company.isActive=false prevails over any origin (INTERNAL/PILOT/PURCHASE)", async () => {
    const internalCard = await mkCard(a.id, owner.id, "sec-internal");
    const purchaseCard = await mkCard(a.id, owner.id, "sec-purchase");
    await assignCardProfileRightAction({ cardId: internalCard.id, origin: "INTERNAL", reason: "Interno" });
    await assignCardProfileRightAction({ cardId: purchaseCard.id, origin: "PURCHASE", reason: "Venta" });
    await db.company.update({ where: { id: a.id }, data: { isActive: false } });
    try {
      assert.equal(await hasCardProfileRight(internalCard.id, a.id), false);
      assert.equal(await hasCardProfileRight(purchaseCard.id, a.id), false);
      assert.equal((await getCompanyEntitlements(a.id)).capabilities.length, 0);
    } finally { await db.company.update({ where: { id: a.id }, data: { isActive: true } }); }
    // Restored once security suspension is lifted.
    assert.equal(await hasCardProfileRight(internalCard.id, a.id), true);
    assert.equal(await hasCardProfileRight(purchaseCard.id, a.id), true);
  });

  await t.test("Multi-tenant: a PILOT (vigente or vencido) in company A never affects company B", async () => {
    const otherOwner = await db.user.create({ data: { companyId: b.id, role: "COMPANY_OWNER", email: "ownerb-" + suffix + "@example.test" } });
    const foreignCard = await db.card.create({ data: { companyId: b.id, userId: otherOwner.id, name: "Foreign", slug: "foreign-" + suffix } });
    // A PILOT already expired: created with grantedAt before expiresAt (CHECK constraint), both in the past.
    await db.cardProfileRight.create({ data: { cardId: foreignCard.id, companyId: b.id, origin: "PILOT",
      grantedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), reason: "Vencido" } });
    assert.equal(await hasCardProfileRight(foreignCard.id, b.id), false);
    const aCard = await mkCard(a.id, owner.id, "isolation-check");
    await assignCardProfileRightAction({ cardId: aCard.id, origin: "PURCHASE", reason: "Venta" });
    assert.equal(await hasCardProfileRight(aCard.id, a.id), true, "company A's PURCHASE is unaffected by company B's expired pilot");
    // Cross-tenant assignment must be rejected by the composite FK: the Card belongs to a different company.
    const anotherForeignCard = await db.card.create({ data: { companyId: b.id, userId: otherOwner.id, name: "Foreign 2", slug: "foreign2-" + suffix } });
    await assert.rejects(() => db.cardProfileRight.create({ data: { cardId: anotherForeignCard.id, companyId: a.id, origin: "PURCHASE", reason: "invalid tenant" } }));
  });

  await t.test("assignCardProfileRightAction rejects a non-existent Card and requires Superadmin", async () => {
    session = { user: { id: superadmin.id, companyId: a.id, role: "SUPERADMIN" } };
    const missing = await assignCardProfileRightAction({ cardId: "does-not-exist", origin: "INTERNAL", reason: "x" });
    assert.equal(missing.success, false);
    session = { user: { id: owner.id, companyId: a.id, role: "COMPANY_OWNER" } };
    const card = await mkCard(a.id, owner.id, "not-superadmin");
    const denied = await assignCardProfileRightAction({ cardId: card.id, origin: "INTERNAL", reason: "x" });
    assert.equal(denied.success, false, "a non-Superadmin session must not be able to assign a profile right");
    assert.equal(await db.cardProfileRight.count({ where: { cardId: card.id } }), 0);
  });

  await db.$disconnect();
});
