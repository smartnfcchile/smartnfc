import "./helpers/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import { activePath, checkFlowDefinition, effectiveAnswers, flowReducer, initialState, optionsFor, validate } from "../../lib/flow/engine";
import { RESULT, type Answers, type FlowAction, type FlowState } from "../../lib/flow/types";
import { LOCALES_FLOW, LOCALES_LABELS } from "../../content/flows/locales";
import { buildProposal, initialSupportSelection, supportCounts, SUPPORT_SUGGESTION } from "../../lib/locales/proposal";
import { LOCAL_PRO_POINTS } from "../../lib/commercial/public-offers";

const F = LOCALES_FLOW;
const q = (id: string) => F.questions.find(x => x.id === id)!;
const path = (a: Answers) => activePath(F, a);
const run = (actions: FlowAction[], from?: FlowState) => actions.reduce((s, x) => flowReducer(F, s, x), from ?? initialState(F));
const ans = (questionId: string, value: string | string[] | number | undefined): FlowAction => ({ type: "answer", questionId, value });
const next: FlowAction = { type: "next" };

const base: Answers = { rubro: "cafe", objetivos: ["whatsapp"], ubicaciones: ["counter"], locales: "one" };

test("definición válida y orden L1 → L2 → L3 → L4", () => {
  assert.deepEqual(checkFlowDefinition(F), []);
  assert.deepEqual(F.questions.map(x => x.id), ["rubro", "rubroOtro", "objetivos", "redes", "cartaPublicada", "cartaAviso", "perfilGoogle", "googleAviso", "frecuenciaPromo", "ubicaciones", "mesas", "locales"]);
  assert.deepEqual(path(base), ["rubro", "objetivos", "ubicaciones", "locales", RESULT]);
});

test("L1: ocho rubros; «Otro» muestra la descripción breve opcional", () => {
  assert.deepEqual(optionsFor(q("rubro"), {}).map(o => o.value), ["cafe", "bar", "gym", "beauty", "clinic", "store", "lodging", "other"]);
  assert.ok(!path(base).includes("rubroOtro"));
  assert.deepEqual(path({ ...base, rubro: "other" }).slice(0, 3), ["rubro", "rubroOtro", "objetivos"]);
  assert.equal(validate(q("rubroOtro"), {}), null, "es opcional");
  assert.match(validate(q("rubroOtro"), { rubroOtro: "x".repeat(61) })!, /Máximo 60/);
  assert.equal(buildProposal(effectiveAnswers(F, { ...base, rubro: "other", rubroOtro: " Florería " })).otherDescription, "Florería");
  assert.equal(buildProposal(effectiveAnswers(F, { ...base, rubroOtro: "Florería" })).otherDescription, null, "solo con rubro Otro");
});

test("L2: hasta tres objetivos", () => {
  assert.equal(optionsFor(q("objetivos"), {}).length, 6);
  assert.equal(validate(q("objetivos"), { objetivos: ["reviews", "whatsapp", "social"] }), null);
  assert.match(validate(q("objetivos"), { objetivos: ["reviews", "whatsapp", "social", "menu"] })!, /hasta 3/);
  assert.match(validate(q("objetivos"), { objetivos: [] })!, /Elige una opción/);
});

test("L2a–L2d: subpreguntas solo para el objetivo elegido", () => {
  const p = (objetivos: string[], extra: Answers = {}) => path({ ...base, objetivos, ...extra });
  assert.ok(p(["social"]).includes("redes"));
  assert.deepEqual(optionsFor(q("redes"), {}).map(o => o.value), ["INSTAGRAM", "FACEBOOK", "TIKTOK", "YOUTUBE", "LINKEDIN", "X", "THREADS"]);
  assert.ok(p(["menu"]).includes("cartaPublicada"));
  assert.ok(!p(["menu"], { cartaPublicada: "yes" }).includes("cartaAviso"));
  assert.ok(p(["menu"], { cartaPublicada: "no" }).includes("cartaAviso"), "aclara que SmartNFC enlaza, no aloja");
  assert.ok(p(["reviews"]).includes("perfilGoogle"));
  assert.ok(!p(["reviews"], { perfilGoogle: "yes" }).includes("googleAviso"));
  for (const v of ["no", "unknown"]) assert.ok(p(["reviews"], { perfilGoogle: v }).includes("googleAviso"), v);
  assert.ok(p(["promo"]).includes("frecuenciaPromo"));
  assert.deepEqual(optionsFor(q("frecuenciaPromo"), {}).map(o => o.label), ["Semanal", "Mensual", "Por temporada"]);
  const whatsappOnly = p(["whatsapp"]);
  for (const id of ["redes", "cartaPublicada", "cartaAviso", "perfilGoogle", "googleAviso", "frecuenciaPromo"]) assert.ok(!whatsappOnly.includes(id), id);
});

test("L3: mesas solo en rubros pertinentes; recepción según rubro; L3a entre 1 y 40", () => {
  const values = (rubro: string) => optionsFor(q("ubicaciones"), { rubro }).map(o => o.value);
  for (const r of ["cafe", "bar"]) assert.ok(values(r).includes("tables"), r);
  for (const r of ["gym", "beauty", "clinic", "store", "lodging", "other"]) assert.ok(!values(r).includes("tables"), r);
  for (const r of ["gym", "beauty", "clinic", "lodging"]) assert.ok(values(r).includes("waiting"), r);
  for (const r of ["cafe", "bar", "store", "other"]) assert.ok(!values(r).includes("waiting"), r);
  assert.ok(path({ ...base, ubicaciones: ["tables"] }).includes("mesas"));
  assert.ok(!path({ ...base, ubicaciones: ["counter"] }).includes("mesas"));
  assert.ok(!path({ ...base, rubro: "store", ubicaciones: ["tables", "counter"] }).includes("mesas"), "si cambia a un rubro sin mesas, no pregunta");
  assert.match(validate(q("mesas"), { mesas: 0 })!, /mínimo es 1/);
  assert.match(validate(q("mesas"), { mesas: 41 })!, /máximo es 40/);
  assert.equal(validate(q("mesas"), { mesas: 40 }), null);
});

test("L4: varios locales → cotización personalizada", () => {
  assert.equal(buildProposal(effectiveAnswers(F, base)).multiLocation, false);
  for (const v of ["few", "many"]) {
    const p = buildProposal(effectiveAnswers(F, { ...base, locales: v }));
    assert.equal(p.multiLocation, true);
    assert.ok(p.notices.some(n => n.id === "multi-location"));
  }
});

test("recorrido completo con el reductor (avance, ramificación y retroceso)", () => {
  let s = run([ans("rubro", "cafe"), next, ans("objetivos", ["reviews", "social", "menu"]), next]);
  assert.equal(s.current, "redes");
  s = run([ans("redes", ["INSTAGRAM", "TIKTOK"]), next, ans("cartaPublicada", "no"), next], s);
  assert.equal(s.current, "cartaAviso");
  s = run([next, ans("perfilGoogle", "unknown"), next, next, ans("ubicaciones", ["tables", "counter", "entrance"]), next], s);
  assert.equal(s.current, "mesas");
  s = run([ans("mesas", 12), next, ans("locales", "one"), next], s);
  assert.equal(s.current, RESULT);
  // Retroceso hasta objetivos y cambio de rama: sin redes, la pregunta y sus acciones dejan de aplicar.
  s = run([{ type: "goto", step: "objetivos" }, ans("objetivos", ["reviews", "menu"]), next], s);
  assert.equal(s.current, "cartaPublicada", "salta redes");
  const p = buildProposal(effectiveAnswers(F, s.answers));
  assert.ok(!p.actions.some(a => a.objective === "social"));
  assert.equal(s.answers.redes !== undefined, true, "la respuesta sigue en memoria por si vuelve a elegir redes");
});

test("propuesta: acciones en el orden de los objetivos, puntos y sugerencias editables", () => {
  const a = effectiveAnswers(F, { rubro: "cafe", objetivos: ["reviews", "social", "contact"], redes: ["TIKTOK", "INSTAGRAM"], perfilGoogle: "yes",
    ubicaciones: ["tables", "counter", "entrance"], mesas: 6, locales: "one" });
  const p = buildProposal(a);
  assert.deepEqual(p.actions.map(x => x.type), ["GOOGLE_REVIEW", "INSTAGRAM", "TIKTOK", "LOCATION", "PHONE"]);
  assert.deepEqual(p.points.map(x => [x.location, x.quantity, x.suggestedSupport]), [["tables", 6, "LOCAL_MINI"], ["counter", 1, "LOCAL_STANDARD"], ["entrance", 1, "LOCAL_XL"]]);
  assert.equal(p.totalPoints, 8);
  assert.equal(p.exceedsPointLimit, false);
  assert.deepEqual(SUPPORT_SUGGESTION, { tables: "LOCAL_MINI", counter: "LOCAL_STANDARD", entrance: "LOCAL_XL", waiting: "LOCAL_STANDARD", other: "LOCAL_STANDARD" });
  const selection = initialSupportSelection(p.points);
  assert.deepEqual(supportCounts(p.points, selection), { mini: 6, standard: 1, xl: 1, undecided: 0 });
  assert.deepEqual(supportCounts(p.points, { ...selection, tables: "LOCAL_STANDARD" }), { mini: 0, standard: 7, xl: 1, undecided: 0 }, "la sugerencia se puede cambiar");
  assert.equal(p.notices.length, 0);
});

test("propuesta: avisos de carta y Google, sugerencia Standard editable y límite de puntos", () => {
  const p = buildProposal(effectiveAnswers(F, { rubro: "clinic", objetivos: ["menu", "reviews"], cartaPublicada: "no", perfilGoogle: "no",
    ubicaciones: ["waiting", "other"], locales: "one" }));
  assert.deepEqual(p.notices.map(n => n.id), ["menu-not-published", "google-profile"]);
  // Recepción y «otro lugar»: Standard como sugerencia inicial, editable a Mini o XL.
  assert.deepEqual(p.points.map(x => [x.location, x.suggestedSupport]), [["waiting", "LOCAL_STANDARD"], ["other", "LOCAL_STANDARD"]]);
  const sel = initialSupportSelection(p.points);
  assert.deepEqual(supportCounts(p.points, sel), { mini: 0, standard: 2, xl: 0, undecided: 0 });
  assert.deepEqual(supportCounts(p.points, { ...sel, waiting: "LOCAL_MINI", other: "LOCAL_XL" }), { mini: 1, standard: 0, xl: 1, undecided: 0 });
  const big = buildProposal(effectiveAnswers(F, { ...base, ubicaciones: ["tables", "counter"], mesas: LOCAL_PRO_POINTS }));
  assert.equal(big.totalPoints, LOCAL_PRO_POINTS + 1);
  assert.equal(big.exceedsPointLimit, true);
  assert.ok(big.notices.some(n => n.id === "points-over-limit"));
});

test("contenido: sin Club, sin captura de datos y sin promesas de resultado", () => {
  const text = JSON.stringify(LOCALES_LABELS) + F.questions.map(x => `${x.title} ${x.help ?? ""}`).join(" ");
  for (const banned of ["club", "prospect", "crm", "garantiza", "ilimitad", "tiempo real", "datos de tus clientes"]) {
    assert.ok(!text.toLowerCase().includes(banned), banned);
  }
});
