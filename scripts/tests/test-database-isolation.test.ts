import { BLOCKED_DATABASE_URL, checkDisposableDatabaseUrl } from "./helpers/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

// Regression suite for incident H4 (2026-09-22): a suite created fixtures in production because its
// Prisma client fell back to .env. None of these tests connects to a real database.

const testsDir = __dirname;
const repoRoot = path.resolve(testsDir, "../..");
const suites = fs.readdirSync(testsDir).filter((f) => f.endsWith(".test.ts"));
const GUARD_FIRST = /^(import\s+(\{[^}]*\}\s+from\s+)?"\.\/helpers\/test-database";|const\s+\{[^}]*\}\s*=\s*require\("\.\/helpers\/test-database"\);)/;

test("every scripts/tests suite loads the database guard as its very first statement", () => {
  assert.ok(suites.length > 0);
  const offenders = suites.filter((f) => {
    const first = fs.readFileSync(path.join(testsDir, f), "utf8").replace(/^﻿/, "").split(/\r?\n/).find((l) => l.trim() !== "");
    return !first || !GUARD_FIRST.test(first.trim());
  });
  assert.deepEqual(offenders, [], "these suites must start with: import \"./helpers/test-database\";");
});

test("non-TypeScript suites never touch Prisma (they cannot load the TypeScript guard)", () => {
  const others = fs.readdirSync(testsDir).filter((f) => /\.test\.(mjs|cjs|js)$/.test(f));
  for (const f of others) {
    assert.doesNotMatch(fs.readFileSync(path.join(testsDir, f), "utf8"), /@prisma\/client|lib\/prisma/, f);
  }
});

test("no suite hardcodes a non-loopback PostgreSQL URL", () => {
  const literal = /postgres(?:ql)?:\/\/[^\s"'`]+/g;
  // This file is excluded: it holds deliberately rejected examples.
  for (const f of suites.filter((s) => s !== path.basename(__filename))) {
    for (const raw of fs.readFileSync(path.join(testsDir, f), "utf8").match(literal) ?? []) {
      const url = raw.replace(/[),;]+$/, "");
      if (url === BLOCKED_DATABASE_URL || url.includes("${")) continue;
      assert.ok(checkDisposableDatabaseUrl(url).ok, `${f} contains a non-disposable database URL`);
    }
  }
});

test("checkDisposableDatabaseUrl accepts only loopback PostgreSQL", () => {
  assert.equal(checkDisposableDatabaseUrl("postgresql://postgres@127.0.0.1:55432/smartnfc_block2_disposable_x").ok, true);
  assert.equal(checkDisposableDatabaseUrl("postgresql://u@localhost:5433/postgres?sslmode=disable").ok, true);
  for (const bad of [
    undefined,
    "",
    "not a url",
    "postgresql://u@ep-example-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require",
    "postgresql://u@10.0.0.5:5432/block2_disposable",
    "postgresql://u@localhost:5432/block2_disposable?host=ep-example.neon.tech",
    "mysql://u:p@localhost/block2_disposable",
    "postgresql://u@localhost:5432/",
  ]) {
    assert.equal(checkDisposableDatabaseUrl(bad).ok, false, String(bad));
  }
  assert.equal(checkDisposableDatabaseUrl("postgresql://u@localhost/postgres", { requireNameIncludes: "block2_disposable" }).ok, false);
});

test("importing the guard replaces any inherited DATABASE_URL with the unresolvable sentinel", () => {
  assert.equal(process.env.DATABASE_URL, BLOCKED_DATABASE_URL);
  assert.equal(process.env.DIRECT_URL, BLOCKED_DATABASE_URL);
});

// Runs from the repository root, where .env exists, exactly like `npm run test:*`.
function child(code: string, env: NodeJS.ProcessEnv) {
  return execFileSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "--eval", code], { cwd: repoRoot, env, encoding: "utf8", timeout: 60_000 });
}
const hostProbe = `const h=()=>{try{return new URL(process.env.DATABASE_URL).hostname}catch{return String(process.env.DATABASE_URL)}};`;

test("with the guard loaded, Prisma can no longer fill DATABASE_URL from .env (no connection is made)", () => {
  const env = { ...process.env };
  delete env.DATABASE_URL;
  delete env.DIRECT_URL;
  const out = child(`require("./scripts/tests/helpers/test-database");${hostProbe}const {PrismaClient}=require("@prisma/client");new PrismaClient();console.log("HOST="+h());`, env);
  assert.match(out, /HOST=smartnfc-test-database-not-selected\.invalid/);
});

test("a remote DATABASE_URL inherited from the shell or CI is discarded too", () => {
  const out = child(`require("./scripts/tests/helpers/test-database");${hostProbe}console.log("HOST="+h());`, {
    ...process.env,
    DATABASE_URL: "postgresql://u@ep-example-pooler.c-8.us-east-1.aws.neon.tech/neondb",
  });
  assert.match(out, /HOST=smartnfc-test-database-not-selected\.invalid/);
});

test("a suite that forgets to opt in fails closed: its first query cannot reach any server", () => {
  const env = { ...process.env };
  delete env.DATABASE_URL;
  const out = child(
    `require("./scripts/tests/helpers/test-database");const {prisma}=require("./lib/prisma");` +
      `prisma.$queryRawUnsafe("SELECT 1").then(()=>console.log("RESULT=connected"),(e)=>console.log("RESULT=refused "+(e.errorCode??e.name))).finally(()=>prisma.$disconnect());`,
    env,
  );
  assert.match(out, /RESULT=refused/);
});

test("a client built at module level, before the suite selects its database, stays on the sentinel", () => {
  // Prisma fixes its URL right after construction. Before the guard, such a client stayed on .env (production).
  const env = { ...process.env };
  delete env.DATABASE_URL;
  const out = child(
    `const g=require("./scripts/tests/helpers/test-database");const {prisma}=require("./lib/prisma");` +
      `setTimeout(()=>{g.selectDisposableDatabase("postgresql://postgres@127.0.0.1:1/smartnfc_block2_disposable_late");` +
      `prisma.$queryRawUnsafe("SELECT 1").then(()=>console.log("RESULT=connected"),(e)=>console.log("RESULT=refused "+String(e.message).includes("smartnfc-test-database-not-selected.invalid"))).finally(()=>prisma.$disconnect())},50);`,
    env,
  );
  assert.match(out, /RESULT=refused true/);
});

test("selectDisposableDatabase refuses a production-like URL and leaves the sentinel in place", () => {
  const out = child(
    `const g=require("./scripts/tests/helpers/test-database");` +
      `try{g.selectDisposableDatabase("postgresql://u@ep-example.neon.tech/neondb");console.log("RESULT=accepted")}catch{console.log("RESULT=rejected "+process.env.DATABASE_URL)}`,
    { ...process.env },
  );
  assert.match(out, new RegExp(`RESULT=rejected ${BLOCKED_DATABASE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
});
