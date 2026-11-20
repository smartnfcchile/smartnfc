import "./helpers/test-database";
import assert from "node:assert/strict";
import test from "node:test";
import { parseSolutionCsv, solutionCsvHeader } from "../../lib/soluciones/csv";

test("CSV Excel en español con separador ; y BOM",()=>{
  const rows=parseSolutionCsv("\uFEFFcodigo;ubicacion;agente\r\nEXT-001;Bodega;PQS\r\n");
  assert.equal(rows.length,1);
  assert.equal(rows[0].codigo,"EXT-001");
});
test("valores entre comillas y saltos dentro de celdas",()=>{
  const rows=parseSolutionCsv('codigo,descripcion\nEXT-01,"Piso 2, sala ""B""\nsector norte"');
  assert.equal(rows[0].descripcion,'Piso 2, sala "B"\nsector norte');
});
test("rechaza encabezados duplicados y filas malformadas",()=>{
  assert.throws(()=>parseSolutionCsv("codigo;codigo\n1;2"));
  assert.throws(()=>parseSolutionCsv("codigo;nombre\n1"));
});
test("encabezado descargable incluye código estable",()=>{
  assert.equal(solutionCsvHeader(["ubicacion","clase"]),"codigo;ubicacion;clase\r\n");
});