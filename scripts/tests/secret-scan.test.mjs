import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { scanText, scanRepository } from "../check-secrets.mjs";

test("detects credential used as an environment property without exposing it", () => {
  const sample = ["re", "_", "synthetic".repeat(4)].join("");
  const findings = scanText(`const x = process.env.${sample};`, "sample.ts");
  assert.deepEqual(findings, [{ file: "sample.ts", line: 1, rule: "email-provider-key" }]);
  assert.ok(!JSON.stringify(findings).includes(sample));
});

test("reports locations for multiple credential types", () => {
  const samples = [
    ["ghp", "_", "a".repeat(36)].join(""),
    ["AKIA", "A".repeat(16)].join(""),
    ["-----BEGIN ", "PRIVATE KEY-----"].join(""),
    ["postgresql://", "someone:secret@remote.example/db"].join(""),
  ];
  assert.equal(scanText(samples.join("\n"), "sample").length, 4);
});

test("accepts environment references and loopback test databases", () => {
  assert.deepEqual(scanText('process.env.RESEND_API_KEY; postgresql://test:test@127.0.0.1:5432/qa', "sample"), []);
});

test("scans tracked and new source files but excludes ignored environments", () => {
  const dir = mkdtempSync(join(tmpdir(), "smartnfc-secret-test-"));
  try {
    execFileSync("git", ["init", "--quiet", dir]);
    const sample = ["re", "_", "synthetic".repeat(4)].join("");
    writeFileSync(join(dir, ".gitignore"), ".env\n");
    writeFileSync(join(dir, ".env"), sample);
    writeFileSync(join(dir, "tracked.ts"), sample);
    execFileSync("git", ["-C", dir, "add", "tracked.ts"]);
    writeFileSync(join(dir, "new.ts"), sample);
    assert.deepEqual(scanRepository(dir).map(x => x.file).sort(), ["new.ts", "tracked.ts"]);
  } finally {
    // Only the exact temporary directory created above is removed.
    rmSync(dir, { recursive: true, force: true });
  }
});
