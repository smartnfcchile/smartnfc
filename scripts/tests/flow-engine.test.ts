import assert from "node:assert/strict";
import { test } from "node:test";
import { activePath, checkFlowDefinition, effectiveAnswers, flowReducer, initialState, nextStep, optionsFor, progress, startStep, validate } from "../../lib/flow/engine";
import { RESULT, type FlowAction, type FlowDefinition, type FlowState } from "../../lib/flow/types";
import { DEMO_FLOW } from "../../content/flows/demo";

// Flujo ficticio de prueba: rama explícita (next), pregunta condicional (when), opción condicional (showIf),
// selección múltiple con máximo, número con rango y texto opcional.
const FLOW: FlowDefinition = {
  id: "test",
  questions: [
    { id: "tipo", kind: "single", title: "Tipo", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }],
      next: a => (a.tipo === "b" ? "detalleB" : "intereses") },
    { id: "detalleB", kind: "single", title: "Detalle B", options: [{ value: "x", label: "X" }, { value: "y", label: "Y" }] },
    { id: "intereses", kind: "multi", title: "Intereses", maxSelections: 2, options: [
      { value: "musica", label: "Música" }, { value: "foto", label: "Foto" },
      { value: "solo-b", label: "Solo B", showIf: a => a.tipo === "b" },
    ] },
    { id: "estilo", kind: "single", title: "Estilo", when: a => Array.isArray(a.intereses) && a.intereses.includes("musica"),
      options: [{ value: "jazz", label: "Jazz" }, { value: "rock", label: "Rock" }] },
    { id: "cantidad", kind: "number", title: "Cantidad", min: 1, max: 40 },
    { id: "nota", kind: "text", title: "Nota", optional: true, maxLength: 20 },
  ],
};

const run = (actions: FlowAction[], flow = FLOW, from?: FlowState) => actions.reduce((s, a) => flowReducer(flow, s, a), from ?? initialState(flow));
const ans = (questionId: string, value: FlowAction extends never ? never : string | string[] | number | undefined): FlowAction => ({ type: "answer", questionId, value });
const next: FlowAction = { type: "next" }, back: FlowAction = { type: "back" };

test("definiciones válidas (incluido el flujo de demostración)", () => {
  assert.deepEqual(checkFlowDefinition(FLOW), []);
  assert.deepEqual(checkFlowDefinition(DEMO_FLOW), []);
  assert.deepEqual(checkFlowDefinition({ id: "x", questions: [{ id: "a", kind: "single", title: "A" }, { id: "a", kind: "text", title: "B" }] }), ["a: sin opciones", "id duplicado: a"]);
});

test("avance: no avanza sin respuesta válida; avanza al responder", () => {
  let s = initialState(FLOW);
  assert.equal(s.current, "tipo");
  s = run([next], FLOW, s);
  assert.equal(s.current, "tipo", "sin respuesta no avanza");
  s = run([ans("tipo", "zzz"), next], FLOW, s);
  assert.equal(s.current, "tipo", "una opción inexistente no cuenta");
  s = run([ans("tipo", "a"), next], FLOW, s);
  assert.equal(s.current, "intereses");
  assert.deepEqual(s.history, ["tipo"]);
});

test("ramificación explícita y pregunta condicional", () => {
  assert.equal(nextStep(FLOW, "tipo", { tipo: "a" }), "intereses");
  assert.equal(nextStep(FLOW, "tipo", { tipo: "b" }), "detalleB");
  // "estilo" solo aparece si eligió música.
  assert.equal(nextStep(FLOW, "intereses", { tipo: "a", intereses: ["foto"] }), "cantidad");
  assert.equal(nextStep(FLOW, "intereses", { tipo: "a", intereses: ["musica"] }), "estilo");
  assert.equal(nextStep(FLOW, "nota", {}), RESULT);
  assert.throws(() => nextStep({ id: "roto", questions: [{ id: "a", kind: "info", title: "A", next: () => "inexistente" }] }, "a", {}), /no existe/);
});

test("opciones condicionales (showIf)", () => {
  const q = FLOW.questions[2];
  assert.deepEqual(optionsFor(q, { tipo: "a" }).map(o => o.value), ["musica", "foto"]);
  assert.deepEqual(optionsFor(q, { tipo: "b" }).map(o => o.value), ["musica", "foto", "solo-b"]);
});

test("validación: máximo de selección, rango numérico y texto opcional", () => {
  const [, , intereses, , cantidad, nota] = FLOW.questions;
  assert.equal(validate(intereses, { tipo: "a", intereses: ["musica", "foto", "otra"] }), null, "valores no disponibles se descartan antes de contar");
  assert.match(validate(intereses, { tipo: "a", intereses: ["otra"] })!, /Elige una opción/, "solo valores inexistentes = sin respuesta");
  assert.equal(validate(intereses, { tipo: "b", intereses: ["musica", "foto"] }), null);
  assert.match(validate(intereses, { tipo: "b", intereses: ["musica", "foto", "solo-b"] })!, /hasta 2/);
  assert.match(validate(cantidad, { cantidad: 0 })!, /mínimo es 1/);
  assert.match(validate(cantidad, { cantidad: 41 })!, /máximo es 40/);
  assert.match(validate(cantidad, { cantidad: 2.5 })!, /entero/);
  assert.equal(validate(cantidad, { cantidad: 12 }), null);
  assert.equal(validate(nota, {}), null, "texto opcional vacío permite avanzar");
  assert.match(validate(nota, { nota: "x".repeat(21) })!, /Máximo 20/);
});

test("retroceso: vuelve al paso anterior y conserva las respuestas", () => {
  let s = run([ans("tipo", "a"), next, ans("intereses", ["musica"]), next, ans("estilo", "jazz"), next]);
  assert.equal(s.current, "cantidad");
  assert.deepEqual(s.history, ["tipo", "intereses", "estilo"]);
  s = run([back, back], FLOW, s);
  assert.equal(s.current, "intereses");
  assert.deepEqual(s.answers.intereses, ["musica"], "la respuesta sigue disponible al volver");
  assert.equal(s.answers.estilo, "jazz", "las respuestas posteriores no se pierden al retroceder");
  s = run([back, back], FLOW, s);
  assert.equal(s.current, "tipo", "no retrocede más allá del inicio");
  assert.deepEqual(s.history, []);
});

test("persistencia durante la navegación: volver a avanzar recupera lo respondido", () => {
  let s = run([ans("tipo", "a"), next, ans("intereses", ["musica"]), next, ans("estilo", "rock"), next, ans("cantidad", 8), next]);
  s = run([back, back, back], FLOW, s); // en "intereses"
  s = run([next, next, next], FLOW, s); // sin volver a responder
  assert.equal(s.current, "nota");
  assert.equal(s.answers.estilo, "rock");
  assert.equal(s.answers.cantidad, 8);
});

test("cambiar una rama descarta respuestas que ya no aplican (respuestas efectivas)", () => {
  let s = run([ans("tipo", "a"), next, ans("intereses", ["musica"]), next, ans("estilo", "jazz"), next, ans("cantidad", 5), next, next]);
  assert.equal(s.current, RESULT);
  assert.deepEqual(effectiveAnswers(FLOW, s.answers), { tipo: "a", intereses: ["musica"], estilo: "jazz", cantidad: 5 });
  // Vuelve a "intereses" y quita música: "estilo" deja de aplicar aunque siga en memoria.
  s = run([{ type: "goto", step: "intereses" }, ans("intereses", ["foto"]), next], FLOW, s);
  assert.equal(s.current, "cantidad", "salta la pregunta condicional");
  assert.equal(s.answers.estilo, "jazz", "sigue en memoria por si vuelve a elegir música");
  assert.equal(effectiveAnswers(FLOW, s.answers).estilo, undefined, "pero no cuenta en el resultado");
  // Cambiar a la rama B: la opción "solo-b" y "detalleB" aparecen; al volver a A, se descartan.
  const b = { tipo: "b", detalleB: "x", intereses: ["foto", "solo-b"] };
  assert.deepEqual(effectiveAnswers(FLOW, b), { tipo: "b", detalleB: "x", intereses: ["foto", "solo-b"] });
  assert.deepEqual(effectiveAnswers(FLOW, { ...b, tipo: "a" }), { tipo: "a", intereses: ["foto"] });
});

test("respuestas inválidas o incompletas no cuentan en las respuestas efectivas", () => {
  assert.deepEqual(effectiveAnswers(FLOW, { tipo: "a", intereses: ["foto"], cantidad: 0 }), { tipo: "a", intereses: ["foto"] });
  assert.deepEqual(effectiveAnswers(FLOW, { tipo: "a", intereses: ["foto"], cantidad: 3 }), { tipo: "a", intereses: ["foto"], cantidad: 3 });
  assert.deepEqual(effectiveAnswers(FLOW, { tipo: "b", intereses: ["musica", "foto", "solo-b"] }), { tipo: "b" }, "más de 2 opciones no cuenta");
});

test("recorrido activo y progreso", () => {
  assert.deepEqual(activePath(FLOW, {}), ["tipo"]);
  assert.deepEqual(activePath(FLOW, { tipo: "a", intereses: ["foto"], cantidad: 3 }), ["tipo", "intereses", "cantidad", "nota", RESULT]);
  let s = initialState(FLOW);
  const p0 = progress(FLOW, s);
  s = run([ans("tipo", "a"), next], FLOW, s);
  const p1 = progress(FLOW, s);
  assert.ok(p0 === 0 && p1 > p0 && p1 < 1, `progreso ${p0} -> ${p1}`);
  s = run([ans("intereses", ["foto"]), next, ans("cantidad", 3), next, next], FLOW, s);
  assert.equal(s.current, RESULT);
  assert.equal(progress(FLOW, s), 1);
});

test("goto solo permite volver a pasos ya recorridos; reset reinicia", () => {
  let s = run([ans("tipo", "a"), next]);
  assert.equal(run([{ type: "goto", step: "cantidad" }], FLOW, s).current, "intereses", "no salta hacia adelante");
  s = run([{ type: "goto", step: "tipo" }], FLOW, s);
  assert.equal(s.current, "tipo");
  assert.deepEqual(s.history, []);
  assert.deepEqual(run([{ type: "reset" }], FLOW, s), initialState(FLOW));
});

test("el estado es inmutable (las acciones no modifican el estado previo)", () => {
  const s0 = initialState(FLOW);
  const s1 = run([ans("tipo", "a")], FLOW, s0);
  assert.equal(s0.answers.tipo, undefined);
  assert.equal(s1.answers.tipo, "a");
  const s2 = run([{ type: "answer", questionId: "tipo", value: undefined }], FLOW, s1);
  assert.equal("tipo" in s2.answers, false, "borrar una respuesta la elimina");
});

test("inicio: omite preguntas condicionales no visibles", () => {
  const flow: FlowDefinition = { id: "c", questions: [{ id: "oculta", kind: "info", title: "x", when: () => false }, { id: "visible", kind: "info", title: "y" }] };
  assert.equal(startStep(flow), "visible");
  assert.equal(startStep({ id: "vacio", questions: [] }), RESULT);
});
