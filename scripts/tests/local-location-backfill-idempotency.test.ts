import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";

// H-6: direct idempotency proof for the LocalLocation/LocalCampaign backfill SQL embedded in
// prisma/migrations/20260917010000_commercial_catalog_entitlements/migration.sql.
//
// This is deliberately NOT the same thing as calling `prisma migrate deploy` twice — once a
// migration is registered in `_prisma_migrations`, a second `migrate deploy` does not re-run its
// SQL at all, so it cannot prove anything about that SQL's idempotency (see
// entitlements-backfill.test.ts, and docs/BLOCK_2_ENTITLEMENTS.md for the H-6 audit finding this
// replaces). Here the two raw SQL statements are extracted from the actual migration file (not
// retyped by hand, so they cannot silently drift from what really ships) and executed directly,
// twice, completely outside of Prisma's migration bookkeeping.

const MIGRATION_FILE = path.resolve(
  __dirname,
  "../../prisma/migrations/20260917010000_commercial_catalog_entitlements/migration.sql"
);

// Anchored on SQL text that is unique in the file (verified: exactly one occurrence of the INSERT
// and exactly one occurrence of the UPDATE's closing predicate) — no comment markers were added to
// migration.sql for this; it stays untouched.
function extractBackfillStatements(): [insert: string, update: string] {
  const sql = fs.readFileSync(MIGRATION_FILE, "utf8");
  const startMarker = 'INSERT INTO "LocalLocation"';
  const endMarker = 'AND c."locationId" IS NULL;';
  const start = sql.indexOf(startMarker);
  const endMarkerIndex = sql.indexOf(endMarker);
  assert.notEqual(start, -1, "Could not locate the LocalLocation backfill INSERT in migration.sql — has it moved or changed shape?");
  assert.notEqual(endMarkerIndex, -1, "Could not locate the LocalCampaign backfill UPDATE's terminator in migration.sql — has it moved or changed shape?");
  const end = endMarkerIndex + endMarker.length;
  const block = sql.slice(start, end);

  const statements = block
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  assert.equal(statements.length, 2, `Expected exactly 2 statements in the extracted backfill block, found ${statements.length}. migration.sql may have changed shape.`);
  const [insert, update] = statements;
  assert.ok(insert.startsWith('INSERT INTO "LocalLocation"'), "First extracted statement is not the LocalLocation INSERT.");
  assert.ok(update.startsWith('UPDATE "LocalCampaign"'), "Second extracted statement is not the LocalCampaign UPDATE.");
  return [insert, update];
}

const url = process.env.BLOCK2_TEST_DATABASE_URL;
const allowed = !!url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname) && new URL(url).pathname.includes("block2_disposable");

test(
  "H-6: the migration's own LocalLocation/LocalCampaign backfill SQL is idempotent when executed directly, twice, outside prisma migrate deploy",
  { skip: !allowed },
  async (t) => {
    process.env.DATABASE_URL = url!;
    const { prisma: db } = require("../../lib/prisma") as { prisma: PrismaClient };
    const [insertSql, updateSql] = extractBackfillStatements();
    const suffix = randomUUID().slice(0, 8);

    async function runBackfillOnce() {
      await db.$executeRawUnsafe(insertSql);
      await db.$executeRawUnsafe(updateSql);
    }

    // Fixtures, all scoped by suffix so this can safely share BLOCK2_TEST_DATABASE_URL with other
    // suites (see docs/BLOCK_2_DEPLOYMENT_RUNBOOK.md and the H-4 sweep tests for the same pattern):
    //   - Company A: campaigns with locationId IS NULL (the orphan case the backfill must fix).
    //   - Company B: already has its own legacy-initial LocalLocation AND an orphan campaign — the
    //     backfill must reuse the existing location, not create a second one.
    //   - Company C: every campaign already has a locationId pointing at a NON-legacy-initial
    //     location — the backfill must never touch it.
    //   - Company D: has no campaigns at all — the backfill must not create anything for it.
    //   - An unrelated commercial fixture (CompanyProductLicense, Card, CardProfileRight) attached
    //     to Company A, to prove the backfill never touches commercial data.
    const companyA = await db.company.create({ data: { name: `H6 Idem A ${suffix}` } });
    const companyB = await db.company.create({ data: { name: `H6 Idem B ${suffix}` } });
    const companyC = await db.company.create({ data: { name: `H6 Idem C ${suffix}` } });
    const companyD = await db.company.create({ data: { name: `H6 Idem D ${suffix}` } });

    const orphanA1 = await db.localCampaign.create({ data: { companyId: companyA.id, name: "A1", slug: `h6-a1-${suffix}` } });
    const orphanA2 = await db.localCampaign.create({ data: { companyId: companyA.id, name: "A2", slug: `h6-a2-${suffix}` } });

    const existingLegacyB = await db.localLocation.create({
      data: { id: `legacy_location_${companyB.id}`, companyId: companyB.id, key: "legacy-initial", origin: "LEGACY_TECHNICAL" },
    });
    const orphanB1 = await db.localCampaign.create({ data: { companyId: companyB.id, name: "B1", slug: `h6-b1-${suffix}` } });

    const manualLocationC = await db.localLocation.create({
      data: { companyId: companyC.id, key: `manual-${suffix}`, name: "Sede manual", origin: "PURCHASE" },
    });
    const assignedC1 = await db.localCampaign.create({ data: { companyId: companyC.id, name: "C1", slug: `h6-c1-${suffix}`, locationId: manualLocationC.id } });

    const owner = await db.user.create({ data: { companyId: companyA.id, email: `h6-owner-${suffix}@example.test` } });
    const card = await db.card.create({ data: { companyId: companyA.id, userId: owner.id, name: "Card A", slug: `h6-card-${suffix}` } });
    const license = await db.companyProductLicense.create({ data: { companyId: companyA.id, product: "LOCAL", planCode: "LOCAL_PRO", status: "ACTIVE", includedBranches: 1 } });
    const right = await db.cardProfileRight.create({ data: { cardId: card.id, companyId: companyA.id, origin: "INTERNAL", grantedByUserId: owner.id, reason: "H-6 idempotency fixture, not a real profile" } });

    async function scopedSnapshot() {
      const [locations, campaigns] = await Promise.all([
        db.localLocation.findMany({ where: { companyId: { in: [companyA.id, companyB.id, companyC.id, companyD.id] } }, orderBy: [{ companyId: "asc" }, { id: "asc" }] }),
        db.localCampaign.findMany({ where: { companyId: { in: [companyA.id, companyB.id, companyC.id, companyD.id] } }, orderBy: [{ companyId: "asc" }, { id: "asc" }] }),
      ]);
      return { locations, campaigns };
    }

    async function foreignSnapshot() {
      const [company, lic, cardRow, profileRight] = await Promise.all([
        db.company.findUniqueOrThrow({ where: { id: companyA.id } }),
        db.companyProductLicense.findUniqueOrThrow({ where: { id: license.id } }),
        db.card.findUniqueOrThrow({ where: { id: card.id } }),
        db.cardProfileRight.findUniqueOrThrow({ where: { cardId: right.cardId } }),
      ]);
      return { company, lic, cardRow, profileRight };
    }

    const foreignBefore = await foreignSnapshot();

    await t.test("first pass: creates legacy-initial where missing, reuses it where present, assigns only orphans", async () => {
      await runBackfillOnce();

      const locA = await db.localLocation.findUniqueOrThrow({ where: { companyId_key: { companyId: companyA.id, key: "legacy-initial" } } });
      assert.equal(locA.id, `legacy_location_${companyA.id}`);
      assert.equal(locA.origin, "LEGACY_TECHNICAL");

      const a1 = await db.localCampaign.findUniqueOrThrow({ where: { id: orphanA1.id } });
      const a2 = await db.localCampaign.findUniqueOrThrow({ where: { id: orphanA2.id } });
      assert.equal(a1.locationId, locA.id);
      assert.equal(a2.locationId, locA.id);

      // Company B: existing legacy-initial location must be REUSED, not duplicated.
      const locationsB = await db.localLocation.findMany({ where: { companyId: companyB.id } });
      assert.equal(locationsB.length, 1);
      assert.equal(locationsB[0].id, existingLegacyB.id);
      const b1 = await db.localCampaign.findUniqueOrThrow({ where: { id: orphanB1.id } });
      assert.equal(b1.locationId, existingLegacyB.id);

      // Company C: every campaign is already assigned elsewhere — the backfill must not touch it,
      // and must not invent an unused legacy-initial location for it either. The INSERT's own SELECT
      // is scoped to `WHERE "locationId" IS NULL`, so a company with zero orphan campaigns never
      // contributes a group, matching the sweep's own copy of this same statement (see
      // scripts/maintenance/backfill-local-location-orphans.ts).
      const c1 = await db.localCampaign.findUniqueOrThrow({ where: { id: assignedC1.id } });
      assert.equal(c1.locationId, manualLocationC.id, "The already-assigned campaign must keep pointing at its original location.");
      const legacyC = await db.localLocation.findUnique({ where: { companyId_key: { companyId: companyC.id, key: "legacy-initial" } } });
      assert.equal(legacyC, null, "Company C has no orphan campaigns; no legacy-initial location should ever be created for it.");
      assert.equal(await db.localLocation.count({ where: { companyId: companyC.id } }), 1, "Company C's only location remains the manually created one — nothing else.");

      // Company D: no campaigns, nothing created.
      assert.equal(await db.localLocation.count({ where: { companyId: companyD.id } }), 0);
      assert.equal(await db.localCampaign.count({ where: { companyId: companyD.id } }), 0);
    });

    const afterFirstPass = await scopedSnapshot();
    const foreignAfterFirstPass = await foreignSnapshot();

    await t.test("commercial data outside LocalLocation/LocalCampaign is untouched by the first pass", () => {
      assert.deepEqual(foreignAfterFirstPass, foreignBefore);
    });

    await t.test("second pass: identical SQL, executed again directly — produces zero changes", async () => {
      await runBackfillOnce();
      const afterSecondPass = await scopedSnapshot();

      // Same row counts — nothing duplicated.
      assert.equal(afterSecondPass.locations.length, afterFirstPass.locations.length);
      assert.equal(afterSecondPass.campaigns.length, afterFirstPass.campaigns.length);

      // Same IDs, same field values, in the same order — the second pass' end state is byte-for-byte
      // identical to the first pass' end state, not merely "the same count".
      assert.deepEqual(afterSecondPass.locations, afterFirstPass.locations, "LocalLocation rows changed on the second pass.");
      assert.deepEqual(afterSecondPass.campaigns, afterFirstPass.campaigns, "LocalCampaign rows changed on the second pass.");
    });

    await t.test("commercial data outside LocalLocation/LocalCampaign is still untouched after the second pass", async () => {
      assert.deepEqual(await foreignSnapshot(), foreignBefore);
    });
  }
);
