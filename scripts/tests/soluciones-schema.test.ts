import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const schema = readFileSync("prisma/schema.prisma","utf8");
const sql = readFileSync("prisma/migrations/20261120090000_solution_core/migration.sql","utf8");

test("tablas aisladas y esquema con claves compuestas", () => {
  for (const name of ["SolutionProject","SolutionTemplate","SolutionRecord","SolutionBatch","SolutionTag"]) {
    assert.ok(schema.includes("model " + name + " {"), name + " absent in Prisma");
    assert.ok(sql.includes('CREATE TABLE "' + name + '"'), name + " absent in SQL");
  }
  assert.ok(schema.includes("@@unique([id, companyId])"));
  assert.ok(schema.includes("@@unique([projectId, externalCode])"));
  assert.ok(sql.includes('FOREIGN KEY ("templateId","projectId","companyId")'));
});
test("migración no altera módulos existentes", () => {
  assert.doesNotMatch(sql,/ALTER TABLE "(Company|Card|LocalTouchpoint|CompanyProductLicense)"/);
  assert.doesNotMatch(sql,/\b(DELETE FROM|TRUNCATE|DROP TABLE)\b/i);
});
