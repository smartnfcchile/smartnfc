import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const schema = readFileSync("prisma/schema.prisma","utf8");
const sql = readFileSync("prisma/migrations/20261120090000_solution_core/migration.sql","utf8");
test("tablas aisladas y esquema con claves compuestas",()=>{
  for(const name of ["SolutionProject","SolutionTemplate","SolutionRecord","SolutionBatch","SolutionTag"]) {
    assert.match(schema,new RegExp("model "+name+" \\{"));
    assert.match(sql,new RegExp("CREATE TABLE \\""+name+"\\""));
  }
  assert.match(schema,/@@unique\(\[id, companyId\]\)/);
  assert.match(schema,/@@unique\(\[projectId, externalCode\]\)/);
  assert.match(sql,/FOREIGN KEY \("templateId","projectId","companyId"\)/);
});
test("migración no actualiza datos existentes",()=>{
  assert.doesNotMatch(sql,/ALTER TABLE "(Company|Card|LocalTouchpoint|CompanyProductLicense)"/);
  assert.doesNotMatch(sql,/\b(DELETE FROM|TRUNCATE|DROP TABLE)\b/i);
});