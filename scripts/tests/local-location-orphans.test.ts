import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";
// H-4: scripts/maintenance/backfill-local-location-orphans.ts. Requires a disposable PostgreSQL
// (same "block2_disposable" convention as the entitlements suites). Never Neon, never production.
const url = process.env.BLOCK2_TEST_DATABASE_URL;
const allowed = !!url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname) && new URL(url).pathname.includes("block2_disposable");

function runSweep(extraArgs: string[] = []) {
  const r = execFileSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/maintenance/backfill-local-location-orphans.ts", ...extraArgs], {
    cwd: process.cwd(), env: { ...process.env, DATABASE_URL: url! }, encoding: "utf8",
  });
  return r;
}

test("H-4: backfill-local-location-orphans.ts reconciles LocalCampaign.locationId IS NULL, idempotently, without touching anything else", { skip: !allowed }, async (t) => {
  const { prisma: db } = require("../../lib/prisma") as { prisma: PrismaClient };
  const suffix = randomUUID().slice(0, 8);

  const mkCompany = (label: string) => db.company.create({ data: { name: `H4 ${label} ${suffix}` } });
  const mkOrphanCampaign = (companyId: string, tag: string) =>
    // Simulates pre-Block-2 code: no locationId field exists in that Prisma client at all.
    db.localCampaign.create({ data: { companyId, name: `Campaign ${tag}`, slug: `h4-${tag}-${suffix}` } });
  const mkAssignedCampaign = (companyId: string, locationId: string, tag: string) =>
    db.localCampaign.create({ data: { companyId, locationId, name: `Assigned ${tag}`, slug: `h4-assigned-${tag}-${suffix}` } });

  await t.test("A company with no campaigns at all: never mentioned, never touched, regardless of unrelated global state", async () => {
    // This suite can share its disposable database with other scripts/tests/local-*.test.ts files
    // (e.g. local-integration.test.ts creates its own LocalCampaign fixtures, unrelated to H-4, and
    // never sets locationId either). So this asserts scoped, company-specific state — never a global
    // "nothing found anywhere" claim, which would be unreliable outside full isolation.
    const company = await mkCompany("zero");
    const out = runSweep();
    assert.ok(!out.includes(company.id), "a company with zero campaigns must never appear in the report");
    assert.equal(await db.localLocation.count({ where: { companyId: company.id } }), 0);
    const outApply = runSweep(["--apply"]);
    assert.ok(!outApply.includes(company.id));
    assert.equal(await db.localLocation.count({ where: { companyId: company.id } }), 0, "--apply never creates a location for a company with no orphan campaigns");
  });

  await t.test("Full isolation only: with truly zero orphans anywhere, the sweep reports so explicitly", { skip: !process.env.H4_ASSUME_ISOLATED_DB }, async () => {
    // Opt-in, skipped by default: only meaningful immediately after `prisma migrate deploy` on a fresh
    // database with nothing else running against it (as in the authoritative, isolated H-4 test run).
    assert.equal(await db.localCampaign.count({ where: { locationId: null } }), 0);
    const out = runSweep();
    assert.match(out, /No se encontraron campañas huérfanas/);
  });

  await t.test("One company, one orphan campaign: dry-run writes nothing; --apply creates legacy-initial and assigns it", async () => {
    const company = await mkCompany("one");
    const campaign = await mkOrphanCampaign(company.id, "single");

    const dry = runSweep();
    assert.match(dry, /Campañas huérfanas encontradas: 1/);
    assert.match(dry, new RegExp(company.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(dry, /sería creado \(LEGACY_TECHNICAL\)/);
    assert.match(dry, /DRY-RUN. Ningún cambio fue escrito/);
    assert.equal(await db.localLocation.count({ where: { companyId: company.id } }), 0, "dry-run must not write");
    assert.equal((await db.localCampaign.findUniqueOrThrow({ where: { id: campaign.id } })).locationId, null);

    const apply = runSweep(["--apply"]);
    assert.match(apply, /APPLY COMPLETADO/);
    assert.match(apply, /Campañas huérfanas restantes: 0/);

    const location = await db.localLocation.findUniqueOrThrow({ where: { companyId_key: { companyId: company.id, key: "legacy-initial" } } });
    assert.equal(location.origin, "LEGACY_TECHNICAL");
    const updated = await db.localCampaign.findUniqueOrThrow({ where: { id: campaign.id } });
    assert.equal(updated.locationId, location.id);
    assert.equal(updated.slug, campaign.slug, "the campaign itself is never recreated");

    const audit = await db.adminAuditLog.findMany({ where: { action: "LOCAL_LOCATION_ORPHAN_RECONCILED", companyId: company.id } });
    assert.equal(audit.length, 1);
    assert.equal(audit[0].actorUserId, "SYSTEM_CLI_MAINTENANCE");
    assert.ok(JSON.parse(audit[0].metadata!).campaignIds.includes(campaign.id));
  });

  await t.test("One company, several orphan campaigns: all get the same technical location in one pass", async () => {
    const company = await mkCompany("several");
    const c1 = await mkOrphanCampaign(company.id, "s1");
    const c2 = await mkOrphanCampaign(company.id, "s2");
    const c3 = await mkOrphanCampaign(company.id, "s3");

    const dry = runSweep();
    assert.match(dry, /Campañas huérfanas encontradas: \d+/);
    const countBefore = Number(/Campañas huérfanas encontradas: (\d+)/.exec(dry)![1]);
    assert.ok(countBefore >= 3);

    runSweep(["--apply"]);
    const location = await db.localLocation.findUniqueOrThrow({ where: { companyId_key: { companyId: company.id, key: "legacy-initial" } } });
    for (const c of [c1, c2, c3]) {
      assert.equal((await db.localCampaign.findUniqueOrThrow({ where: { id: c.id } })).locationId, location.id);
    }
    assert.equal(await db.localLocation.count({ where: { companyId: company.id } }), 1, "exactly one technical location per company, not one per campaign");
  });

  await t.test("Several companies: reconciliation is scoped per company (multi-tenant isolation)", async () => {
    const companyA = await mkCompany("multiA");
    const companyB = await mkCompany("multiB");
    const campaignA = await mkOrphanCampaign(companyA.id, "a");
    const campaignB = await mkOrphanCampaign(companyB.id, "b");

    runSweep(["--apply"]);

    const locA = await db.localLocation.findUniqueOrThrow({ where: { companyId_key: { companyId: companyA.id, key: "legacy-initial" } } });
    const locB = await db.localLocation.findUniqueOrThrow({ where: { companyId_key: { companyId: companyB.id, key: "legacy-initial" } } });
    assert.notEqual(locA.id, locB.id);
    assert.equal((await db.localCampaign.findUniqueOrThrow({ where: { id: campaignA.id } })).locationId, locA.id);
    assert.equal((await db.localCampaign.findUniqueOrThrow({ where: { id: campaignB.id } })).locationId, locB.id);
    // Company A's campaign was never assigned company B's location or vice versa.
    assert.notEqual((await db.localCampaign.findUniqueOrThrow({ where: { id: campaignA.id } })).locationId, locB.id);
  });

  await t.test("Reuses an existing legacy-initial location instead of creating a second one", async () => {
    const company = await mkCompany("reuse");
    const existingLocation = await db.localLocation.create({ data: { companyId: company.id, key: "legacy-initial", origin: "LEGACY_TECHNICAL" } });
    const campaign = await mkOrphanCampaign(company.id, "reuse-target");

    const dry = runSweep();
    assert.match(dry, /ya existe, sería reutilizado/);

    runSweep(["--apply"]);
    assert.equal(await db.localLocation.count({ where: { companyId: company.id } }), 1, "no second technical location was created");
    assert.equal((await db.localCampaign.findUniqueOrThrow({ where: { id: campaign.id } })).locationId, existingLocation.id);
  });

  await t.test("Campaigns that already have a locationId are never touched", async () => {
    const company = await mkCompany("already-assigned");
    const manualLocation = await db.localLocation.create({ data: { companyId: company.id, key: "manual-office", name: "Oficina real", origin: "MANUAL" } });
    const assigned = await mkAssignedCampaign(company.id, manualLocation.id, "kept");
    const orphan = await mkOrphanCampaign(company.id, "still-orphan");

    runSweep(["--apply"]);

    const afterAssigned = await db.localCampaign.findUniqueOrThrow({ where: { id: assigned.id } });
    assert.equal(afterAssigned.locationId, manualLocation.id, "an already-assigned campaign keeps its real location untouched");
    const afterOrphan = await db.localCampaign.findUniqueOrThrow({ where: { id: orphan.id } });
    assert.notEqual(afterOrphan.locationId, null);
    assert.notEqual(afterOrphan.locationId, manualLocation.id, "the orphan gets the technical location, never the manual one");
  });

  await t.test("Second execution after full reconciliation makes zero changes", async () => {
    const company = await mkCompany("second-run");
    await mkOrphanCampaign(company.id, "once");
    runSweep(["--apply"]);
    const locationsBefore = await db.localLocation.count({ where: { companyId: company.id } });
    const auditBefore = await db.adminAuditLog.count({ where: { action: "LOCAL_LOCATION_ORPHAN_RECONCILED", companyId: company.id } });

    const second = runSweep(["--apply"]);
    assert.match(second, /No se encontraron campañas huérfanas/);
    assert.equal(await db.localLocation.count({ where: { companyId: company.id } }), locationsBefore);
    assert.equal(await db.adminAuditLog.count({ where: { action: "LOCAL_LOCATION_ORPHAN_RECONCILED", companyId: company.id } }), auditBefore, "no new audit rows on a no-op run");
  });

  await t.test("The sweep never touches Card, CardProfileRight, CompanyProductLicense, overrides, Company.isActive or PhysicalNfcCard", async () => {
    const company = await mkCompany("scope-guard");
    const user = await db.user.create({ data: { companyId: company.id, role: "COMPANY_OWNER", email: `scope-${suffix}@example.test` } });
    const card = await db.card.create({ data: { companyId: company.id, userId: user.id, name: "Untouched", slug: `h4-card-${suffix}` } });
    await db.physicalNfcCard.create({ data: { companyId: company.id, cardId: card.id, token: `h4-token-${suffix}` } });
    await mkOrphanCampaign(company.id, "scope");

    const cardBefore = await db.card.findUniqueOrThrow({ where: { id: card.id } });
    const physicalBefore = await db.physicalNfcCard.findFirstOrThrow({ where: { cardId: card.id } });

    runSweep(["--apply"]);

    assert.equal(await db.cardProfileRight.count({ where: { cardId: card.id } }), 0, "no profile right was invented for this Card");
    const cardAfter = await db.card.findUniqueOrThrow({ where: { id: card.id } });
    assert.deepEqual({ ...cardAfter, updatedAt: null }, { ...cardBefore, updatedAt: null }, "Card row is byte-for-byte unchanged (ignoring updatedAt)");
    const physicalAfter = await db.physicalNfcCard.findFirstOrThrow({ where: { cardId: card.id } });
    assert.deepEqual({ ...physicalAfter, updatedAt: null }, { ...physicalBefore, updatedAt: null }, "PhysicalNfcCard row is untouched");
    assert.equal(await db.companyProductLicense.count({ where: { companyId: company.id } }), 0);
    assert.equal(await db.companyCapabilityOverride.count({ where: { companyId: company.id } }), 0);
    assert.equal(await db.companyLimitOverride.count({ where: { companyId: company.id } }), 0);
    assert.equal((await db.company.findUniqueOrThrow({ where: { id: company.id } })).isActive, true);
  });

  await t.test("Preserves campaign and touchpoint data across the reconciliation", async () => {
    const company = await mkCompany("preserve");
    const campaign = await mkOrphanCampaign(company.id, "preserve-data");
    const touchpoint = await db.localTouchpoint.create({ data: { campaignId: campaign.id, code: `h4-pt-${suffix}`, name: "Punto histórico", location: "Mostrador", objective: "WHATSAPP", medium: "QR", destinationUrl: "https://wa.me/56911112222" } });

    runSweep(["--apply"]);

    const afterCampaign = await db.localCampaign.findUniqueOrThrow({ where: { id: campaign.id } });
    assert.equal(afterCampaign.id, campaign.id);
    assert.equal(afterCampaign.slug, campaign.slug);
    assert.notEqual(afterCampaign.locationId, null);
    const afterTouchpoint = await db.localTouchpoint.findUniqueOrThrow({ where: { id: touchpoint.id } });
    assert.equal(afterTouchpoint.code, touchpoint.code, "the public NFC/QR code is preserved exactly");
    assert.equal(afterTouchpoint.campaignId, campaign.id);
  });

  await t.test("Window simulation: migration/backfill already ran, old code creates a Campaign without locationId, sweep reconciles it", async () => {
    // 1. The migration's own backfill already ran (this disposable DB was created via `migrate deploy`,
    //    so any campaign that existed before the migration would already have a location). This test
    //    starts fresh, so there is nothing pre-existing to backfill — that part is exercised by
    //    entitlements-backfill.test.ts. What matters here is step 2 onward.
    const company = await mkCompany("window");
    // 2. Old (pre-Block-2) code creates a new LocalCampaign. Its generated Prisma client has no
    //    `locationId` field at all, so the column keeps its SQL default (NULL) automatically — this is
    //    reproduced faithfully by simply never passing locationId, exactly like the old client would.
    const campaign = await db.localCampaign.create({ data: { companyId: company.id, name: "Created by old code", slug: `h4-old-code-${suffix}` } });
    assert.equal(campaign.locationId, null);
    // 3. Sweep runs (as the runbook's SWEEP APPLY step would, once the new code is live).
    const out = runSweep(["--apply"]);
    assert.match(out, /APPLY COMPLETADO/);
    // 4. The campaign is correctly reconciled: same id/slug, now has a technical location, capacity
    //    checks for new touchpoints on it now work exactly as for any other located campaign.
    const after = await db.localCampaign.findUniqueOrThrow({ where: { id: campaign.id } });
    assert.equal(after.id, campaign.id);
    assert.equal(after.slug, campaign.slug);
    assert.notEqual(after.locationId, null);
    const location = await db.localLocation.findUniqueOrThrow({ where: { id: after.locationId! } });
    assert.equal(location.companyId, company.id);
    assert.equal(location.origin, "LEGACY_TECHNICAL");
  });

  await db.$disconnect();
});
