import "./helpers/test-database";
import assert from "node:assert/strict";
import test from "node:test";
import { BUILT_IN_TEMPLATES, prepareImport, publicFields, validateTemplate } from "../../lib/soluciones/core";
import { quoteSolution } from "../../lib/soluciones/pricing";
test("plantillas incorporadas tienen campos válidos",()=>{
  for (const t of BUILT_IN_TEMPLATES) assert.deepEqual(validateTemplate(t),[]);
});
test("Excel: previsualización reconoce errores, duplicados y no escribe datos",()=>{
  const t=BUILT_IN_TEMPLATES[0];
  const p=prepareImport([
    {codigo:"EXT-001",ubicacion:"Bodega",capacidad_kg:"6,5",proxima_mantencion:"2027-11-20"},
    {codigo:"EXT-001",ubicacion:"Taller"},
    {codigo:"EXT-003",ubicacion:"",capacidad_kg:"abc"},
    {codigo:"EXT-004",ubicacion:"Patio",proxima_mantencion:"2027-02-30"}
  ],t);
  assert.equal(p.accepted.length,1);
  assert.equal(p.accepted[0].values.capacidad_kg,6.5);
  assert.deepEqual(p.duplicates,["EXT-001"]);
  assert.deepEqual(p.rejected.map(({ row, field }) => [row, field]), [[3, "codigo"], [4, "ubicacion"], [4, "capacidad_kg"], [5, "proxima_mantencion"]]);
});
test("ficha pública no filtra notas internas",()=>{
  const t=BUILT_IN_TEMPLATES[0];
  const p=publicFields(t,{ubicacion:"Bodega",notas_internas:"Dato reservado"});
  assert.equal(p.ubicacion,"Bodega");
  assert.equal("notas_internas" in p,false);
});
test("activos y campañas no se cobran igual",()=>{
  assert.equal(quoteSolution({mode:"ASSETS",deviceCount:500}).monthlyNetClp,100000);
  assert.equal(quoteSolution({mode:"CAMPAIGN",deviceCount:5000,monthlyCampaignFeeClp:25000}).monthlyNetClp,25000);
  assert.throws(()=>quoteSolution({mode:"CAMPAIGN",deviceCount:5000}));
  assert.throws(()=>quoteSolution({mode:"ASSETS",deviceCount:-1}));
});