import "./helpers/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import { DIGITAL_CATALOG, PHYSICAL_CATALOG } from "../../lib/entitlements/catalog";
import {
  CARD_ADDITIONAL_CLP, CARD_REPLACEMENT_CLP, CARD_VOLUME_TIERS, PACK_3_MINI_CLP, PACK_5_MINI_CLP, PUBLIC_OFFERS, TAX_NOTE,
  cardOrderPrice, formatCLP, getPublicOffer, priceOf, teamPlanFor, type PublicOffer,
} from "../../lib/commercial/public-offers";

const offers = PUBLIC_OFFERS as readonly PublicOffer[];

// Tabla aprobada (IVA incluido). Si cambia el catálogo o una constante, esta prueba lo detecta.
test("precios públicos = tabla aprobada", () => {
  const table: Record<string, Record<string, number | null>> = {
    CARD: { one_time: 29990 }, CARD_REPLACEMENT: { one_time: 14990 }, CARD_ADDITIONAL: { one_time: 14990 },
    LOCAL_MINI: { one_time: 19990 }, LOCAL_STANDARD: { one_time: 29990 }, LOCAL_XL: { one_time: 39990 },
    PACK_3_MINI: { one_time: 49990 }, PACK_5_MINI: { one_time: 74990 },
    EMPRESAS_PRO: { monthly: 7990, annual: 79900 },
    EMPRESAS_TEAM_5: { monthly: 19990 }, EMPRESAS_TEAM_10: { monthly: 34990 }, EMPRESAS_TEAM_25: { monthly: 69990 },
    EMPRESAS_TEAM_26_PLUS: { quote: null },
    LOCAL_PRO: { monthly: 14990, annual: 149900 },
    INSTALLATION: { quote: null }, SHIPPING: { quote: null },
  };
  const actual = Object.fromEntries(offers.map(o => [o.id, Object.fromEntries(o.prices.map(p => [p.billing, p.amountClp]))]));
  assert.deepEqual(actual, table);
});

test("los montos que existen en el catálogo se leen del catálogo (sin duplicar)", () => {
  assert.equal(priceOf("CARD", "one_time"), PHYSICAL_CATALOG.CARD.priceClp);
  assert.equal(CARD_VOLUME_TIERS[0].unitClp, PHYSICAL_CATALOG.CARD.priceClp);
  for (const id of ["LOCAL_MINI", "LOCAL_STANDARD", "LOCAL_XL"] as const) assert.equal(priceOf(id, "one_time"), PHYSICAL_CATALOG[id].priceClp);
  for (const id of ["EMPRESAS_PRO", "EMPRESAS_TEAM_5", "EMPRESAS_TEAM_10", "EMPRESAS_TEAM_25", "LOCAL_PRO"] as const) {
    assert.equal(priceOf(id, "monthly"), DIGITAL_CATALOG[id].monthlyClp);
    assert.equal(getPublicOffer(id).name, DIGITAL_CATALOG[id].name);
  }
  assert.equal(priceOf("EMPRESAS_PRO", "annual"), DIGITAL_CATALOG.EMPRESAS_PRO.annualClp);
  assert.equal(priceOf("LOCAL_PRO", "annual"), DIGITAL_CATALOG.LOCAL_PRO.annualClp);
  assert.equal(getPublicOffer("EMPRESAS_TEAM_10").limits?.identities, DIGITAL_CATALOG.EMPRESAS_TEAM_10.identities);
  assert.deepEqual(getPublicOffer("LOCAL_PRO").limits, { locations: 1, pointsPerLocation: 10 });
});

test("cada precio lleva IVA incluido, fuente y tipo coherente", () => {
  for (const o of offers) for (const p of o.prices) {
    assert.equal(p.taxNote, TAX_NOTE, o.id);
    assert.ok(p.source.length > 0, o.id);
    if (p.billing === "quote") assert.equal(p.amountClp, null, `${o.id}: una cotización no lleva monto`);
    else assert.ok(Number.isInteger(p.amountClp) && p.amountClp! > 0, `${o.id}: monto entero positivo`);
    if (p.billing === "one_time") assert.equal(o.kind, "physical", `${o.id}: pago único solo en productos físicos`);
    if (p.billing === "monthly" || p.billing === "annual") assert.equal(o.kind, "digital", o.id);
  }
});

test("ids únicos; sin planes legacy, piloto, packs digitales ni contrato local", () => {
  const ids = offers.map(o => o.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const banned of ["EMPRESAS_PROFILE", "EMPRESAS_PILOT", "LOCAL_PACK_3", "LOCAL_PACK_5", "LOCAL_CONTRACT", "EMPRESAS_TEAM_CONTRACT",
    "LOCAL_IMPULSA", "LOCAL_FUNDADOR", "LOCAL_PERSONALIZADO", "EMPRESAS_CONECTA", "EMPRESAS_CRECE", "EMPRESAS_ESCALA"]) {
    assert.ok(!ids.includes(banned as never), banned);
  }
  // Los packs físicos Mini no deben confundirse con las licencias LOCAL_PACK_3/5.
  for (const id of ["PACK_3_MINI", "PACK_5_MINI"]) assert.ok(!(id in DIGITAL_CATALOG));
});

test("D1: el precio del tramo se aplica a todas las unidades", () => {
  const cases: [number, number, number, number, number][] = [
    [1, 29990, 29990, 1, 4], [4, 29990, 119960, 1, 4], [5, 24990, 124950, 5, 19],
    [19, 24990, 474810, 5, 19], [20, 21990, 439800, 20, 49], [49, 21990, 1077510, 20, 49],
  ];
  for (const [q, unit, total, min, max] of cases) {
    assert.deepEqual(cardOrderPrice(q), { kind: "priced", quantity: q, unitClp: unit, totalClp: total, tier: { min, max } }, `cantidad ${q}`);
  }
  assert.deepEqual(cardOrderPrice(50), { kind: "quote", quantity: 50 });
  assert.deepEqual(cardOrderPrice(500), { kind: "quote", quantity: 500 });
  for (const bad of [0, -1, 2.5, Number.NaN]) assert.throws(() => cardOrderPrice(bad), RangeError);
  // Los tramos son contiguos y sin huecos desde 1.
  CARD_VOLUME_TIERS.forEach((t, i) => i === 0 ? assert.equal(t.min, 1) : assert.equal(t.min, CARD_VOLUME_TIERS[i - 1].max! + 1));
});

test("Equipo: plan más pequeño que cubre las identidades; sobre 25, cotización", () => {
  assert.equal((teamPlanFor(1) as { id: string }).id, "EMPRESAS_TEAM_5");
  assert.equal((teamPlanFor(5) as { id: string }).id, "EMPRESAS_TEAM_5");
  assert.equal((teamPlanFor(6) as { id: string }).id, "EMPRESAS_TEAM_10");
  assert.equal((teamPlanFor(11) as { id: string }).id, "EMPRESAS_TEAM_25");
  assert.deepEqual(teamPlanFor(25), { kind: "plan", id: "EMPRESAS_TEAM_25", identities: 25, monthlyClp: 69990 });
  assert.deepEqual(teamPlanFor(26), { kind: "quote", id: "EMPRESAS_TEAM_26_PLUS" });
  for (const bad of [0, 3.5]) assert.throws(() => teamPlanFor(bad), RangeError);
  for (const id of ["EMPRESAS_TEAM_5", "EMPRESAS_TEAM_10", "EMPRESAS_TEAM_25", "EMPRESAS_TEAM_26_PLUS"] as const) {
    assert.equal(getPublicOffer(id).prices.some(p => p.billing === "annual"), false, `${id}: sin plan anual`);
  }
});

test("D15/D16 y restricciones vigentes: nada suspendido queda como disponible", () => {
  const decisions = (id: Parameters<typeof getPublicOffer>[0]) => getPublicOffer(id).restrictions.map(r => r.decision);
  for (const id of ["EMPRESAS_TEAM_5", "EMPRESAS_TEAM_10", "EMPRESAS_TEAM_25", "LOCAL_PRO"] as const) {
    assert.equal(getPublicOffer(id).availability, "suspended", id);
    assert.ok(decisions(id).includes("D16"), id);
  }
  assert.ok(decisions("EMPRESAS_TEAM_26_PLUS").includes("D16"));
  assert.ok(decisions("CARD").includes("D15") && decisions("CARD").includes("D2"));
  assert.notEqual(getPublicOffer("CARD").availability, "available");
  assert.ok(decisions("EMPRESAS_PRO").includes("D6"));
  for (const o of offers) if (o.prices.some(p => p.billing === "annual")) assert.ok(o.restrictions.some(r => r.decision === "D5"), `${o.id}: anual manual (D5)`);
});

test("capabilities no promovidas existen en el plan (D6, D9, D10)", () => {
  assert.deepEqual(getPublicOffer("LOCAL_PRO").notPromoted, ["LOCAL_CLUB"]);
  for (const o of offers) {
    if (!o.notPromoted) continue;
    const granted = (DIGITAL_CATALOG as Record<string, { capabilities: readonly string[] }>)[o.id].capabilities;
    for (const cap of o.notPromoted) assert.ok(granted.includes(cap), `${o.id}: ${cap}`);
  }
  assert.ok(getPublicOffer("EMPRESAS_PRO").notPromoted!.includes("LEAD_CAPTURE"));
  assert.ok(getPublicOffer("EMPRESAS_TEAM_10").notPromoted!.includes("CRM"));
});

test("soportes y packs: requieren Local Pro, medidas, incluye y cotización de instalación/despacho", () => {
  const sizes = { LOCAL_MINI: "10 × 15 cm", LOCAL_STANDARD: "15 × 20 cm", LOCAL_XL: "20 × 30 cm" } as const;
  for (const id of ["LOCAL_MINI", "LOCAL_STANDARD", "LOCAL_XL", "PACK_3_MINI", "PACK_5_MINI"] as const) {
    const o = getPublicOffer(id);
    assert.equal(o.requiresLicense, "LOCAL_PRO", id);
    assert.equal(o.physical?.material, "Acrílico personalizado", id);
    assert.deepEqual(o.physical?.includes, ["Personalización gráfica estándar", "NFC", "QR", "Configuración inicial"], id);
    assert.ok(o.conditions.some(c => c.startsWith("Instalación")) && o.conditions.some(c => c.startsWith("Despacho")), id);
    if (id in sizes) assert.equal(o.physical?.size, sizes[id as keyof typeof sizes]);
  }
  assert.equal(PHYSICAL_CATALOG.LOCAL_MINI.permanentProfile, false, "el soporte no da servicio permanente");
  assert.deepEqual([getPublicOffer("PACK_3_MINI").physical?.units, getPublicOffer("PACK_5_MINI").physical?.units], [3, 5]);
  assert.ok(getPublicOffer("PACK_5_MINI").conditions.some(c => c.includes("no incluye meses de licencia")));
  assert.deepEqual([PACK_3_MINI_CLP, PACK_5_MINI_CLP, CARD_REPLACEMENT_CLP, CARD_ADDITIONAL_CLP], [49990, 74990, 14990, 14990]);
  assert.ok(getPublicOffer("CARD_ADDITIONAL").conditions.includes("No crea una identidad digital nueva."));
});

test("formato CLP", () => {
  assert.equal(formatCLP(14990), "$14.990");
  assert.equal(formatCLP(1077510), "$1.077.510");
  assert.equal(formatCLP(0), "$0");
  assert.throws(() => formatCLP(10.5), RangeError);
});
