import "./helpers/test-database";
// BUG-E2E-3 en Locales (27-oct-2026): saveLocationAction lanzaba «Límite de locales alcanzado.» y en
// producción la página mostraba un error no controlado (React #441); savePointAction devolvía el mensaje de
// CUALQUIER error, incluidos los internos. Ahora: negocio → mensaje; interno → genérico con referencia.
// Las funciones de lib/local se sustituyen por dobles (node:test mock.module). Sin base de datos ni red.
import { test, mock, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ZodError } from "zod";
import { GENERIC_ACTION_ERROR, UserFacingError } from "../../lib/action-errors";

let nextLocation: () => Promise<string> = async () => "loc_1";
let nextPoint: () => Promise<string> = async () => "pt_1";
mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });
mock.module("../../lib/local/locations.ts", { namedExports: { saveLocation: () => nextLocation(), moveCampaignLocation: async () => {} } });
mock.module("../../lib/local/point-management.ts", { namedExports: { saveLocalPoint: () => nextPoint() } });

let saveLocationAction: typeof import("../../app/dashboard/local/locales/actions").saveLocationAction;
let savePointAction: typeof import("../../app/dashboard/local/puntos/actions").savePointAction;
before(async () => {
  ({ saveLocationAction } = await import("../../app/dashboard/local/locales/actions"));
  ({ savePointAction } = await import("../../app/dashboard/local/puntos/actions"));
});

const form = (data: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(data)) f.set(k, v); return f; };
const INTERNAL = "Invalid `prisma.localLocation.create()` invocation: Unique constraint failed on (`companyId`,`key`)";
const quiet = () => mock.method(console, "error", () => {});

test("saveLocationAction: éxito devuelve ok y el id del local", async () => {
  nextLocation = async () => "loc_ok";
  assert.deepEqual(await saveLocationAction(null, form({ name: "Local", address: "" })), { ok: true, success: true, locationId: "loc_ok" });
});

test("saveLocationAction: el límite de locales llega como mensaje, sin lanzar", async () => {
  nextLocation = async () => { throw new UserFacingError("Límite de locales alcanzado."); };
  const r = await saveLocationAction(null, form({ name: "Segundo" }));
  assert.deepEqual(r, { ok: false, success: false, error: "Límite de locales alcanzado." });
});

test("saveLocationAction: un error interno no se expone (genérico con referencia)", async () => {
  const spy = quiet();
  nextLocation = async () => { throw new Error(INTERNAL); };
  const r = await saveLocationAction(null, form({ name: "X" }));
  assert.equal(r?.ok, false);
  assert.ok(r && !r.ok && r.error.startsWith(GENERIC_ACTION_ERROR));
  assert.ok(r && !r.ok && !/prisma|constraint|companyId/i.test(r.error));
  assert.equal(spy.mock.callCount(), 1, "el detalle queda en el registro del servidor");
  spy.mock.restore();
});

test("savePointAction: éxito sin cambios", async () => {
  nextPoint = async () => "pt_ok";
  assert.deepEqual(await savePointAction({}, form({ name: "P" })), { success: "Punto guardado. El código físico se conserva.", pointId: "pt_ok" });
});

test("savePointAction: error de negocio → su mensaje (p. ej. límite de puntos)", async () => {
  nextPoint = async () => { throw new UserFacingError("Se alcanzó el límite de puntos del local."); };
  assert.deepEqual(await savePointAction({}, form({ name: "P" })), { error: "Se alcanzó el límite de puntos del local." });
});

test("savePointAction: error de validación (Zod) → primer mensaje", async () => {
  nextPoint = async () => { throw new ZodError([{ code: "custom", path: ["name"], message: "Escribe el nombre del punto." }]); };
  assert.deepEqual(await savePointAction({}, form({ name: "" })), { error: "Escribe el nombre del punto." });
});

test("savePointAction: un error interno ya no se devuelve tal cual", async () => {
  const spy = quiet();
  nextPoint = async () => { throw new Error(INTERNAL); };
  const r = await savePointAction({}, form({ name: "P" }));
  assert.ok(r.error?.startsWith(GENERIC_ACTION_ERROR), r.error);
  assert.ok(!/prisma|constraint|companyId/i.test(r.error ?? ""));
  assert.equal(spy.mock.callCount(), 1);
  spy.mock.restore();
});

test("lib/local: los errores de negocio usados por estas acciones son UserFacingError", () => {
  for (const file of ["lib/local/locations.ts", "lib/local/point-management.ts", "lib/local/access.ts"]) {
    const src = fs.readFileSync(path.resolve(__dirname, "../..", file), "utf8");
    assert.doesNotMatch(src, /throw new Error\(/, file);
    assert.match(src, /throw new UserFacingError\(/, file);
  }
});

test("la página de locales usa el formulario con resultado (sin form action que lanza)", () => {
  const page = fs.readFileSync(path.resolve(__dirname, "../../app/dashboard/local/locales/page.tsx"), "utf8");
  assert.match(page, /<LocationCreateForm field=\{field\} \/>/);
  assert.doesNotMatch(page, /action=\{saveLocationAction\}/);
  const form = fs.readFileSync(path.resolve(__dirname, "../../components/local/LocationCreateForm.tsx"), "utf8");
  assert.match(form, /useActionState\(saveLocationAction/);
  assert.match(form, /role="alert"/);
});
