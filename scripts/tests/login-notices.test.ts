import "./helpers/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { LOGIN_NOTICES, loginNoticesFromParams } from "../../lib/login-notices";

// Regresión de BUG-E2E-1 (27-oct-2026): los avisos de /login deben derivarse de useSearchParams, no de
// window.location dentro de useState (no aparecían tras router.push y provocaban el error de hidratación #418).
const q = (query: string) => new URLSearchParams(query);

test("avisos de /login según la URL", () => {
  assert.deepEqual(loginNoticesFromParams(q("activated=true")), { error: "", success: LOGIN_NOTICES.activated });
  assert.deepEqual(loginNoticesFromParams(q("reset=true")), { error: "", success: LOGIN_NOTICES.reset });
  assert.deepEqual(loginNoticesFromParams(q("error=suspended")), { error: LOGIN_NOTICES.suspended, success: "" });
  for (const neutral of ["", "activated=1", "reset=yes", "error=otro", "activated=TRUE"]) {
    assert.deepEqual(loginNoticesFromParams(q(neutral)), { error: "", success: "" }, neutral);
  }
  assert.deepEqual(loginNoticesFromParams(null), { error: "", success: "" });
});

test("los textos coinciden con los que muestra la interfaz", () => {
  assert.equal(LOGIN_NOTICES.activated, "¡Cuenta activada con éxito! Ya puedes iniciar sesión.");
  assert.equal(LOGIN_NOTICES.reset, "¡Contraseña restablecida con éxito! Ya puedes iniciar sesión.");
});

test("app/login/page.tsx lee los avisos con useSearchParams dentro de Suspense y no desde window.location", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../app/login/page.tsx"), "utf8");
  assert.doesNotMatch(source, /window\.location/);
  assert.match(source, /useSearchParams\(\)/);
  assert.match(source, /<Suspense\b/);
  assert.match(source, /loginNoticesFromParams\(/);
});
