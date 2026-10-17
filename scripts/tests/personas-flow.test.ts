// P1 SmartNFC Personas: árbol de preguntas, ramificación y modelo de respuestas (diseño F1, 17-10-2026).
import assert from "node:assert/strict";
import { test } from "node:test";
import { activePath, checkFlowDefinition, effectiveAnswers, flowReducer, initialState, optionsFor, validate } from "../../lib/flow/engine";
import { RESULT, type Answers, type FlowAction, type FlowState } from "../../lib/flow/types";
import { CANTIDAD_COTIZACION, CANTIDAD_MAX, CANTIDAD_MIN, MAX_MOSTRAR, PERSONAS_FLOW, PERSONAS_LABELS } from "../../content/flows/personas";
import { COLOR_HEX, ESTILO_TEMPLATE, PERSONAS_EXAMPLES, exampleIdentity, profileStyle, readPersonasAnswers } from "../../lib/personas/answers";
import { normalizeTemplate } from "../../lib/templates";
import { cardOrderPrice } from "../../lib/commercial/public-offers";

const F = PERSONAS_FLOW;
const q = (id: string) => F.questions.find(x => x.id === id)!;
const path = (a: Answers) => activePath(F, a);
const model = (a: Answers) => readPersonasAnswers(effectiveAnswers(F, a));
const run = (actions: FlowAction[], from?: FlowState) => actions.reduce((s, x) => flowReducer(F, s, x), from ?? initialState(F));
const ans = (questionId: string, value: string | string[] | number | undefined): FlowAction => ({ type: "answer", questionId, value });
const next: FlowAction = { type: "next" };

const base: Answers = { uso: "personal", mostrar: ["whatsapp"], estilo: "oscuro", color: "azul", cantidad: 1 };

test("definición válida y orden P1 → P2 → P3 → P4", () => {
  assert.deepEqual(checkFlowDefinition(F), []);
  assert.deepEqual(F.questions.map(x => x.id), ["uso", "ocupacion", "mostrar", "redes", "contenidoDonde", "contenidoAviso", "estilo", "color", "cantidad"]);
  assert.deepEqual(path(base), ["uso", "mostrar", "estilo", "color", "cantidad", RESULT]);
  assert.deepEqual(path({}), ["uso"], "sin respuestas el recorrido se detiene en la primera pregunta");
});

test("P1: cuatro usos con la primera pregunta aprobada", () => {
  assert.equal(q("uso").title, "¿Para qué quieres tu SmartNFC?");
  assert.deepEqual(optionsFor(q("uso"), {}).map(o => o.value), ["personal", "oficio", "emprende", "profesional"]);
  assert.ok(q("uso").autoAdvance);
});

test("P1a: «¿A qué te dedicas?» solo fuera de uso personal, opcional y hasta 40 caracteres", () => {
  assert.ok(!path(base).includes("ocupacion"), "uso personal no pide oficio");
  for (const uso of ["oficio", "emprende", "profesional"]) assert.deepEqual(path({ ...base, uso }).slice(0, 3), ["uso", "ocupacion", "mostrar"], uso);
  assert.equal(validate(q("ocupacion"), {}), null, "es opcional");
  assert.equal(validate(q("ocupacion"), { ocupacion: "x".repeat(40) }), null);
  assert.match(validate(q("ocupacion"), { ocupacion: "x".repeat(41) })!, /Máximo 40/);
});

test("P2: opciones según el uso (F1 §2)", () => {
  const values = (uso: string) => optionsFor(q("mostrar"), { uso }).map(o => o.value);
  assert.deepEqual(values("personal"), ["whatsapp", "llamada", "correo", "redes", "zona"]);
  assert.deepEqual(values("oficio"), ["whatsapp", "llamada", "correo", "redes", "trabajos", "catalogo", "agenda", "zona"]);
  assert.deepEqual(values("emprende"), ["whatsapp", "llamada", "correo", "redes", "trabajos", "catalogo", "zona"]);
  assert.deepEqual(values("profesional"), ["whatsapp", "llamada", "correo", "redes", "trabajos", "agenda", "zona"]);
});

test(`P2: hasta ${MAX_MOSTRAR} elementos y al menos uno`, () => {
  const a = { uso: "oficio" };
  assert.equal(validate(q("mostrar"), { ...a, mostrar: ["whatsapp", "llamada", "correo", "redes"] }), null);
  assert.match(validate(q("mostrar"), { ...a, mostrar: ["whatsapp", "llamada", "correo", "redes", "zona"] })!, /hasta 4/);
  assert.match(validate(q("mostrar"), { ...a, mostrar: [] })!, /Elige una opción/);
  assert.match(q("mostrar").help!, /Guardar contacto.*Compartir/);
});

test("P2a: redes solo si se eligió «Redes sociales»; solo las cinco que admite el perfil real", () => {
  assert.ok(!path(base).includes("redes"));
  assert.ok(path({ ...base, mostrar: ["redes"] }).includes("redes"));
  assert.deepEqual(optionsFor(q("redes"), {}).map(o => o.value), ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "TIKTOK", "YOUTUBE"]);
  assert.deepEqual(path({ ...base, mostrar: ["redes"] }), ["uso", "mostrar", "redes"], "redes es obligatoria si se eligió");
});

test("P2b–P2c: dónde está el contenido solo con trabajos o catálogo; aviso solo si aún no está en internet", () => {
  const p = (mostrar: string[], extra: Answers = {}) => path({ ...base, uso: "oficio", mostrar, ...extra });
  assert.ok(!p(["whatsapp", "agenda"]).includes("contenidoDonde"));
  for (const m of ["trabajos", "catalogo"]) assert.ok(p([m]).includes("contenidoDonde"), m);
  assert.deepEqual(optionsFor(q("contenidoDonde"), {}).map(o => o.value), ["instagram", "web", "youtube", "none"]);
  for (const donde of ["instagram", "web", "youtube"]) assert.ok(!p(["trabajos"], { contenidoDonde: donde }).includes("contenidoAviso"), donde);
  const conAviso = p(["trabajos"], { contenidoDonde: "none" });
  assert.deepEqual(conAviso.slice(conAviso.indexOf("contenidoDonde"), -1), ["contenidoDonde", "contenidoAviso", "estilo", "color", "cantidad"]);
  assert.equal(q("contenidoAviso").title, "SmartNFC enlaza tu contenido; no lo aloja");
});

test("P3–P3a: estilos mapeados a formatos personales reales y colores válidos", () => {
  assert.deepEqual(optionsFor(q("estilo"), {}).map(o => o.label), ["Oscuro", "Claro", "Diagonal", "Llamativo"]);
  for (const [estilo, template] of Object.entries(ESTILO_TEMPLATE)) {
    assert.equal(normalizeTemplate(template), template, `${estilo}: formato existente`);
    assert.ok(!template.startsWith("company-"), `${estilo}: sin «Ficha Corporativa»`);
  }
  assert.deepEqual(Object.keys(COLOR_HEX), optionsFor(q("color"), {}).map(o => o.value));
  for (const hex of Object.values(COLOR_HEX)) assert.match(hex, /^#[0-9A-F]{6}$/);
  assert.equal(new Set(Object.values(COLOR_HEX)).size, Object.keys(COLOR_HEX).length);
});

test(`P4: cantidad entera entre ${CANTIDAD_MIN} y ${CANTIDAD_MAX}`, () => {
  for (const cantidad of [1, 4, 5, 19, 20, 49]) assert.equal(validate(q("cantidad"), { cantidad }), null, String(cantidad));
  assert.match(validate(q("cantidad"), { cantidad: 0 })!, /mínimo es 1/);
  assert.match(validate(q("cantidad"), { cantidad: 50 })!, /máximo es 49/);
  assert.match(validate(q("cantidad"), { cantidad: 2.5 })!, /entero/);
  assert.match(validate(q("cantidad"), {})!, /Elige una opción/, "obligatoria");
  assert.equal(q("cantidad").defaultValue, 1, "la pantalla parte en 1 tarjeta (F1)");
  assert.match(q("cantidad").help!, /50 o más.*cotización/);
});

test("P4: «50 o más: solicitar cotización» es una alternativa independiente y sin precio automático", () => {
  assert.deepEqual(q("cantidad").alternative, { value: CANTIDAD_COTIZACION, label: "50 o más: solicitar cotización" });
  assert.equal(validate(q("cantidad"), { cantidad: CANTIDAD_COTIZACION }), null, "permite avanzar");
  assert.match(validate(q("cantidad"), { cantidad: "51" })!, /número/, "solo el valor de la alternativa se acepta como texto");
  assert.equal(path({ ...base, cantidad: CANTIDAD_COTIZACION }).at(-1), RESULT);
  const m = model({ ...base, cantidad: CANTIDAD_COTIZACION });
  assert.equal(m.cotizacionVolumen, true);
  assert.equal(m.cantidad, null, "no hay cantidad con la cual calcular un precio");
  const n = model({ ...base, cantidad: 12 });
  assert.deepEqual([n.cotizacionVolumen, n.cantidad], [false, 12]);
});

test("P4 respeta el motor comercial vigente: todo el rango tiene precio de tramo (D1) y 50 es cotización", () => {
  const units = new Map<number, number>();
  for (let n = CANTIDAD_MIN; n <= CANTIDAD_MAX; n++) {
    const order = cardOrderPrice(n);
    assert.equal(order.kind, "priced", `${n} tarjetas`);
    if (order.kind === "priced") { assert.equal(order.totalClp, order.unitClp * n, "el tramo aplica a todas las unidades"); units.set(n, order.unitClp); }
  }
  assert.deepEqual([units.get(1), units.get(4), units.get(5), units.get(19), units.get(20), units.get(49)], [29990, 29990, 24990, 24990, 21990, 21990]);
  assert.equal(cardOrderPrice(CANTIDAD_MAX + 1).kind, "quote");
});

test("recorrido más largo posible: 9 pantallas antes del resultado", () => {
  const a: Answers = { uso: "oficio", ocupacion: "Soldador", mostrar: ["whatsapp", "redes", "trabajos", "catalogo"], redes: ["INSTAGRAM"], contenidoDonde: "none", estilo: "claro", color: "verde", cantidad: 3 };
  assert.deepEqual(path(a), ["uso", "ocupacion", "mostrar", "redes", "contenidoDonde", "contenidoAviso", "estilo", "color", "cantidad", RESULT]);
});

test("cambiar a uso personal descarta lo que deja de aplicar (trabajos, catálogo, agenda y su contenido)", () => {
  const a: Answers = { uso: "oficio", ocupacion: "Soldador", mostrar: ["whatsapp", "trabajos", "agenda"], contenidoDonde: "none", estilo: "claro", color: "verde", cantidad: 2 };
  const eff = effectiveAnswers(F, { ...a, uso: "personal" });
  assert.deepEqual(eff.mostrar, ["whatsapp"]);
  for (const id of ["ocupacion", "contenidoDonde"]) assert.equal(eff[id], undefined, id);
  const m = model({ ...a, uso: "personal" });
  assert.equal(m.ocupacion, null);
  assert.deepEqual(m.notices, []);
  // Las preguntas derivadas tampoco aparecen aunque la respuesta original de P2 siga en memoria.
  assert.deepEqual(path({ ...a, uso: "personal" }), ["uso", "mostrar", "estilo", "color", "cantidad", RESULT]);
  assert.ok(!path({ ...a, uso: "profesional", mostrar: ["catalogo", "whatsapp"] }).includes("contenidoDonde"), "catálogo no aplica a profesión");
  assert.ok(path({ ...a, uso: "profesional", mostrar: ["trabajos"] }).includes("contenidoAviso"), "trabajos sí aplica a profesión");
  // Si todo lo elegido deja de aplicar, el recorrido vuelve a pedir P2.
  assert.deepEqual(path({ ...a, uso: "personal", mostrar: ["trabajos"] }), ["uso", "mostrar"]);
});

test("modelo: orden estable, acción principal, ocupación recortada y redes solo si se muestran", () => {
  const m = model({ uso: "profesional", ocupacion: "  Arquitecta  ", mostrar: ["zona", "correo", "redes", "llamada"], redes: ["YOUTUBE", "LINKEDIN"], estilo: "diagonal", color: "morado", cantidad: 5 });
  assert.equal(m.usoLabel, "Mi profesión");
  assert.equal(m.ocupacion, "Arquitecta");
  assert.deepEqual(m.mostrar, ["llamada", "correo", "redes", "zona"], "orden de las opciones, no de selección");
  assert.equal(m.primaryAction, "llamada");
  assert.deepEqual(m.redes, ["LINKEDIN", "YOUTUBE"]);
  assert.deepEqual([m.estilo, m.color, m.cantidad], ["diagonal", "morado", 5]);
  assert.equal(model({ ...base, mostrar: ["redes", "zona"], redes: ["INSTAGRAM"] }).primaryAction, null, "sin contacto directo no hay acción principal");
  assert.deepEqual(model({ ...base, redes: ["INSTAGRAM"] }).redes, [], "redes sin «Redes sociales» no cuentan");
});

test("modelo: aviso de contenido no publicado y respuestas incompletas", () => {
  const m = model({ uso: "emprende", mostrar: ["catalogo"], contenidoDonde: "none", estilo: "claro", color: "rojo", cantidad: 1 });
  assert.deepEqual(m.notices.map(n => n.id), ["content-not-online"]);
  const partial = model({ uso: "oficio" });
  assert.deepEqual([partial.uso, partial.mostrar, partial.estilo, partial.color, partial.cantidad], ["oficio", [], null, null, null]);
  const empty = model({});
  assert.equal(empty.uso, null);
  assert.equal(model({ ...base, cantidad: 50 }).cantidad, null, "fuera de rango no cuenta");
  assert.equal(readPersonasAnswers({ uso: "otro", estilo: "x", color: "y" }).uso, null, "valores desconocidos se ignoran");
});

test("vista previa: ejemplos ficticios aprobados por segmento y estilo por defecto", () => {
  assert.deepEqual(PERSONAS_EXAMPLES, {
    personal: { name: "Camila Vega", role: null },
    oficio: { name: "Miguel Rojas", role: "Maestro soldador" },
    emprende: { name: "Fernanda Soto", role: "Emprendedora" },
    profesional: { name: "Diego Torres", role: "Arquitecto" },
  });
  assert.deepEqual(exampleIdentity(model({ uso: "oficio" })), { name: "Miguel Rojas", role: "Maestro soldador" });
  assert.deepEqual(exampleIdentity(model({ uso: "oficio", ocupacion: "Gasfíter" })), { name: "Miguel Rojas", role: "Gasfíter" });
  assert.deepEqual(exampleIdentity(model({})), { name: "Camila Vega", role: null });
  assert.deepEqual(exampleIdentity(model({ uso: "personal", ocupacion: "Ignorada" })), { name: "Camila Vega", role: null }, "uso personal: sin cargo");
  assert.deepEqual(exampleIdentity(model({ uso: "emprende" })), { name: "Fernanda Soto", role: "Emprendedora" });
  assert.deepEqual(exampleIdentity(model({ uso: "emprende", ocupacion: "Repostería" })), { name: "Fernanda Soto", role: "Repostería" });
  assert.deepEqual(profileStyle(model({})), { template: "classic-dark", themeColor: "#2563EB" });
  assert.deepEqual(profileStyle(model({ ...base, estilo: "llamativo", color: "naranjo" })), { template: "neobrutalist", themeColor: "#EA580C" });
});

test("recorrido completo con el motor: avanza, retrocede conservando respuestas y llega al resultado", () => {
  let s = run([ans("uso", "oficio"), next]);
  assert.equal(s.current, "ocupacion");
  s = run([next, ans("mostrar", ["whatsapp", "trabajos"]), next], s);
  assert.equal(s.current, "contenidoDonde");
  s = run([ans("contenidoDonde", "web"), next, ans("estilo", "claro"), next, ans("color", "verde"), next], s);
  assert.equal(s.current, "cantidad");
  s = run([{ type: "back" }, { type: "back" }], s);
  assert.equal(s.current, "estilo");
  assert.equal(s.answers.color, "verde", "las respuestas se conservan al retroceder");
  s = run([next, next, ans("cantidad", 2), next], s);
  assert.equal(s.current, RESULT);
  assert.deepEqual(s.history, ["uso", "ocupacion", "mostrar", "contenidoDonde", "estilo", "color", "cantidad"]);
});

test("restricciones vigentes: el árbol no ofrece Pro, captura, CRM, métricas, perfil permanente, compra, Equipo ni Local", () => {
  const texts = F.questions.flatMap(x => [x.title, x.help ?? "", x.placeholder ?? "", ...(x.options ?? []).map(o => `${o.label} ${o.description ?? ""}`)]);
  const forbidden = /\bPro\b|CRM|prospect|captur|métric|estadístic|permanent|para siempre|de por vida|\bcompr|\bpag|checkout|\bEquipo\b|\bLocal\b|\bClub\b|activación inmediata/i;
  for (const t of texts) assert.ok(!forbidden.test(t), `texto no permitido: «${t}»`);
  assert.ok(Object.values(PERSONAS_LABELS.mostrar).every(l => !/datos|formulario/i.test(l)), "sin «Compárteme tus datos» (D6)");
});
