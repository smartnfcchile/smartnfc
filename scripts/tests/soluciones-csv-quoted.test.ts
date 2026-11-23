import "./helpers/test-database";
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSolutionCsv } from "../../lib/soluciones/csv";
test("rejects text after a quoted field", () => {
  assert.throws(() => parseSolutionCsv('codigo;ubicacion\nA1;"Bodega"extra'), /cierre de comillas/);
});
test("retains escaped quotes and allows valid field boundaries", () => {
  assert.deepEqual(parseSolutionCsv('codigo;ubicacion\r\n"A1";"Bodega ""Norte"""'), [{ codigo: "A1", ubicacion: 'Bodega "Norte"' }]);
});
