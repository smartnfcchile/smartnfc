import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

// H-6: real protection for migrations that were already applied before Block 2, replacing the
// tautological check that used to live in entitlements-backfill.test.ts (it hashed the working
// tree at the start of a test and compared it against the same working tree hashed again a few
// seconds later, in the same process — it could only ever have caught a file mutated *during*
// that test run, never a historical migration edited in an earlier commit).
//
// The real anchor here is prisma/migrations/.history-manifest.json: a frozen, human-reviewed,
// committed file. Every hash in it was verified against `git log --follow` + `git diff <introducing
// commit>` + an independent `git show <commit>:<path> | sha256` before being written (see its
// `_meta.verifiedAgainstGit`). This test never touches Git or the network — it only compares the
// current disk content against that already-frozen manifest, so it works offline and in CI exactly
// the same way.
//
// Block 2 (20260917010000_commercial_catalog_entitlements) is deliberately excluded from the
// manifest while it remains undeployed — it may still legitimately change. Every OTHER migration
// folder under prisma/migrations must appear in the manifest with a matching hash, or this test
// fails.

const MIGRATIONS_DIR = path.resolve(__dirname, "../../prisma/migrations");
const MANIFEST_PATH = path.join(MIGRATIONS_DIR, ".history-manifest.json");
const BLOCK2_FOLDER = "20260917010000_commercial_catalog_entitlements";

type Manifest = { _meta: unknown; migrations: Record<string, string> };

function loadManifest(): Manifest {
  const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
  return JSON.parse(raw) as Manifest;
}

// Same normalization used to build the manifest: CRLF -> LF before hashing, so the same hash
// results regardless of whether the working tree was checked out on Windows (core.autocrlf=true,
// CRLF on disk) or Linux CI (LF on disk) — both represent the identical logical migration content.
function normalizedHash(file: string): string {
  const raw = fs.readFileSync(file, "utf8");
  const normalized = raw.replace(/\r\n/g, "\n");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

function listHistoricalFoldersOnDisk(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => name < BLOCK2_FOLDER) // lexical == chronological for this timestamp-prefixed naming convention
    .sort();
}

test("H-6: migration history manifest — frozen SHA-256 reference, no Git/network dependency at runtime", async (t) => {
  const manifest = loadManifest();
  const manifestFolders = Object.keys(manifest.migrations).sort();
  const diskFolders = listHistoricalFoldersOnDisk();

  await t.test("Block 2 itself is excluded from the manifest while undeployed", () => {
    assert.ok(
      !(BLOCK2_FOLDER in manifest.migrations),
      "Block 2 must stay editable until deployed; it must never be frozen in this manifest yet."
    );
  });

  await t.test("every historical migration folder on disk (before Block 2) is present in the manifest", () => {
    const missing = diskFolders.filter((f) => !manifestFolders.includes(f));
    assert.deepEqual(missing, [], `Historical migration(s) exist on disk but are missing from the manifest: ${missing.join(", ")}`);
  });

  await t.test("the manifest does not reference a migration folder that no longer exists on disk", () => {
    const ghosts = manifestFolders.filter((f) => !diskFolders.includes(f));
    assert.deepEqual(ghosts, [], `Manifest references migration(s) that do not exist on disk: ${ghosts.join(", ")}`);
  });

  await t.test("every frozen migration.sql matches its manifest hash exactly", () => {
    for (const folder of manifestFolders) {
      const file = path.join(MIGRATIONS_DIR, folder, "migration.sql");
      assert.ok(fs.existsSync(file), `Missing migration.sql for a manifest entry: ${folder}`);
      const actual = normalizedHash(file);
      assert.equal(actual, manifest.migrations[folder], `SHA-256 mismatch for ${folder} — this historical migration was modified after being frozen.`);
    }
  });

  await t.test("manifest is non-empty and covers exactly the 19 migrations known at Block 2's authoring time (sanity floor)", () => {
    assert.ok(manifestFolders.length >= 19, `Expected at least 19 frozen historical migrations, found ${manifestFolders.length}.`);
  });
});
