import "./helpers/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import { BASE, DIGITAL_CATALOG } from "../../lib/entitlements/catalog";
import {
  NET_REFERENCE_LABEL, PERSONAS_VERIFIED_FEATURES, PUBLIC_OFFERS, TAX_NOTE, billingComparisonFor, compareBilling, empresasNetReference,
  netFromGrossClp, supportOrderPrice, type PublicOffer,
} from "../../lib/commercial/public-offers";

// Fuerza bruta de referencia: todas las combinaciones exactas de Pack 5, Pack 3 y unidades.
function bruteForceMini(n: number) {
  let best = Infinity;
  for (let p5 = 0; p5 * 5 <= n; p5++) for (let p3 = 0; p5 * 5 + p3 * 3 <= n; p3++) {
    best = Math.min(best, p5 * 74990 + p3 * 49990 + (n - p5 * 5 - p3 * 3) * 19990);
  }
  return best;
}

test("decisión 3: combinación de menor costo para la cantidad exacta de Mini", () => {
  const ids = (n: number) => supportOrderPrice({ mini: n }).lines.map(l => `${l.quantity}×${l.id}`).join(" + ");
  assert.deepEqual(supportOrderPrice({ mini: 0 }), { lines: [], totalClp: 0, units: { mini: 0, standard: 0, xl: 0 } });
  assert.equal(ids(2), "2×LOCAL_MINI");
  assert.equal(supportOrderPrice({ mini: 2 }).totalClp, 39980, "2 unidades no se reemplazan por un Pack 3 (no se regalan unidades)");
  assert.equal(ids(3), "1×PACK_3_MINI");
  assert.equal(ids(4), "1×PACK_3_MINI + 1×LOCAL_MINI");
  assert.equal(supportOrderPrice({ mini: 4 }).totalClp, 69980);
  assert.equal(ids(5), "1×PACK_5_MINI");
  assert.equal(ids(6), "1×PACK_5_MINI + 1×LOCAL_MINI");
  assert.equal(supportOrderPrice({ mini: 6 }).totalClp, 94980);
  assert.equal(ids(8), "1×PACK_5_MINI + 1×PACK_3_MINI");
  assert.equal(supportOrderPrice({ mini: 8 }).totalClp, 124980);
  for (let n = 0; n <= 60; n++) {
    const order = supportOrderPrice({ mini: n });
    assert.equal(order.totalClp, bruteForceMini(n), `mínimo para ${n}`);
    const units = order.lines.reduce((a, l) => a + l.quantity * (l.id === "PACK_5_MINI" ? 5 : l.id === "PACK_3_MINI" ? 3 : 1), 0);
    assert.equal(units, n, `cantidad exacta para ${n}`);
  }
});

test("decisión 3: Standard y XL sin packs; entradas inválidas", () => {
  const order = supportOrderPrice({ mini: 3, standard: 2, xl: 1 });
  assert.deepEqual(order.lines.map(l => [l.id, l.quantity, l.totalClp]), [["PACK_3_MINI", 1, 49990], ["LOCAL_STANDARD", 2, 59980], ["LOCAL_XL", 1, 39990]]);
  assert.equal(order.totalClp, 149960);
  for (const bad of [-1, 1.5, Number.NaN]) assert.throws(() => supportOrderPrice({ mini: bad }), RangeError);
  assert.throws(() => supportOrderPrice({ xl: -2 }), RangeError);
  for (const id of ["PACK_3_MINI", "PACK_5_MINI"]) assert.ok(!(id in DIGITAL_CATALOG), "no son licencias LOCAL_PACK_*");
});

test("decisión 4: neto referencial solo en Empresas y consistente con el total con IVA", () => {
  assert.equal(netFromGrossClp(19990), 16798);
  assert.equal(netFromGrossClp(34990), 29403);
  assert.equal(netFromGrossClp(69990), 58815);
  assert.deepEqual(empresasNetReference("EMPRESAS_TEAM_10", "monthly"), { grossClp: 34990, netClp: 29403, label: NET_REFERENCE_LABEL });
  assert.equal(empresasNetReference("LOCAL_PRO", "monthly"), null, "no se muestra fuera de Empresas");
  assert.equal(empresasNetReference("EMPRESAS_PRO", "monthly"), null, "Pro se vende a Personas");
  assert.equal(empresasNetReference("EMPRESAS_TEAM_26_PLUS", "quote"), null, "cotización sin monto");
  // Neto + IVA (redondeado) vuelve exactamente al total publicado en todo precio con monto.
  for (const o of PUBLIC_OFFERS as readonly PublicOffer[]) for (const p of o.prices) {
    if (p.amountClp === null) continue;
    assert.equal(Math.round(netFromGrossClp(p.amountClp) * 1.19), p.amountClp, `${o.id} ${p.billing}`);
    assert.equal(p.taxNote, TAX_NOTE);
  }
  assert.throws(() => netFromGrossClp(-1), RangeError);
});

test("decisión 5: comparación mensual/anual solo en ofertas habilitadas", () => {
  // Hoy: Pro restringido (D6) y Local Pro suspendido (D16) → no se compara aunque existan ambos precios.
  assert.equal(billingComparisonFor("EMPRESAS_PRO"), null);
  assert.equal(billingComparisonFor("LOCAL_PRO"), null);
  assert.equal(billingComparisonFor("EMPRESAS_TEAM_10"), null, "sin plan anual");
  const prices = [
    { billing: "monthly", amountClp: 14990, unit: "mes", taxNote: TAX_NOTE, source: "x" },
    { billing: "annual", amountClp: 149900, unit: "año", taxNote: TAX_NOTE, source: "x" },
  ] as const;
  assert.deepEqual(compareBilling({ availability: "available", prices }), { monthlyClp: 14990, annualClp: 149900, twelveMonthsClp: 179880, differenceClp: 29980 });
  assert.equal(compareBilling({ availability: "restricted", prices }), null);
  assert.equal(compareBilling({ availability: "suspended", prices }), null);
  assert.equal(compareBilling({ availability: "available", prices: [prices[0]] }), null);
});

test("decisión 6: Personas solo con prestaciones verificadas", () => {
  const sources = PERSONAS_VERIFIED_FEATURES.map(f => f.source);
  assert.deepEqual(sources.filter(s => s !== "CARD"), [...BASE], "una por cada capability BASE, en orden");
  const text = PERSONAS_VERIFIED_FEATURES.map(f => f.label).join(" ").toLowerCase();
  for (const banned of ["permanen", "para siempre", "inmediat", "al instante", "crm", "prospect", "métric", "analít", "captur"]) {
    assert.ok(!text.includes(banned), `no promete: ${banned}`);
  }
});
