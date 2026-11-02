import "./helpers/test-database";
// BUG-E2E-3 (27-oct-2026): en producción React oculta el mensaje de los errores LANZADOS por Server Actions
// («Minified React error #441»). Las acciones migradas (Empresas y editor) devuelven { ok, error }:
//   - error esperado (UserFacingError) → su mensaje, escrito para el usuario;
//   - error inesperado → mensaje genérico con referencia; el detalle solo queda en el registro del servidor.
// Sin base de datos ni red.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { redirect, notFound } from "next/navigation";
import { GENERIC_ACTION_ERROR, runAction, toActionFailure, UserFacingError } from "../../lib/action-errors";
import { resolveCardImageUpdate } from "../../lib/card-images";

test("éxito: devuelve ok y los datos de la acción", async () => {
  assert.deepEqual(await runAction("t", async () => ({ id: "x" })), { ok: true, success: true, id: "x" });
});

test("error esperado: el usuario recibe el mensaje de negocio", async () => {
  const r = await runAction("t", async () => { throw new UserFacingError("La empresa alcanzó el máximo de identidades."); });
  assert.deepEqual(r, { ok: false, success: false, error: "La empresa alcanzó el máximo de identidades." });
});

test("error inesperado: mensaje genérico con referencia; el detalle interno no llega al cliente y sí al registro", () => {
  const logs: unknown[][] = [];
  const internal = new Error('Invalid `prisma.user.create()` invocation: Unique constraint failed on the fields: (`email`) — tabla "User"');
  const r = toActionFailure(internal, "users.create", (...args) => logs.push(args));
  assert.equal(r.ok, false);
  assert.ok(r.error.startsWith(GENERIC_ACTION_ERROR), r.error);
  assert.match(r.error, /\(ref\. [0-9a-f]{8}\)$/);
  assert.ok(!/prisma|constraint|User|email/i.test(r.error), "no expone el mensaje interno");
  assert.equal(logs.length, 1);
  assert.match(String(logs[0][0]), /\[action:users\.create\] error inesperado \(ref [0-9a-f]{8}\)/);
  assert.equal(logs[0][1], internal, "el registro conserva el error original");
});

test("errores que no son Error (string, objeto) también se tratan como inesperados", () => {
  for (const raw of ["texto interno", { message: "objeto interno" }, null, undefined]) {
    const r = toActionFailure(raw, "t", () => {});
    assert.ok(r.error.startsWith(GENERIC_ACTION_ERROR));
    assert.ok(!r.error.includes("interno"));
  }
});

test("redirect() y notFound() de Next.js se vuelven a lanzar (no se convierten en mensajes)", async () => {
  await assert.rejects(() => runAction("t", async () => redirect("/login")), (e: unknown) => String((e as Error)?.message ?? e).includes("NEXT_REDIRECT"));
  await assert.rejects(() => runAction("t", async () => notFound()), (e: unknown) => /NEXT_(HTTP_ERROR_FALLBACK|NOT_FOUND)/.test(String((e as { digest?: string })?.digest ?? (e as Error)?.message)));
});

test("los mensajes de autorización de lib son errores esperados (seguros para el usuario)", async () => {
  const src = (f: string) => fs.readFileSync(path.resolve(__dirname, "../..", f), "utf8");
  assert.match(src("lib/permissions.ts"), /throw new UserFacingError\("No autorizado"\)/);
  assert.match(src("lib/entitlements/index.ts"), /throw new UserFacingError\("Capacidad no disponible\."\)/);
});

test("acciones migradas (Empresas y editor): no lanzan Error genérico y sus exportaciones devuelven resultado", () => {
  for (const file of ["app/dashboard/users/actions.ts", "app/dashboard/editor/[cardId]/actions.ts"]) {
    const source = fs.readFileSync(path.resolve(__dirname, "../..", file), "utf8");
    assert.doesNotMatch(source, /throw new Error\(/, `${file}: usar UserFacingError para errores esperados`);
    assert.doesNotMatch(source, /error\.message \|\| "Error interno del servidor"/, `${file}: no devolver mensajes internos`);
    const exported = [...source.matchAll(/export async function (\w+)\([^)]*\) \{\n([^\n]*)/g)];
    assert.ok(exported.length > 0);
    for (const [, name, firstLine] of exported) {
      if (name === "updateCard") continue; // usa try/catch con toActionFailure (verificado abajo)
      assert.match(firstLine, /return (runAction\(|\w+\()/, `${file}: ${name} debe devolver el resultado de runAction o delegar en una acción migrada`);
    }
  }
  const editor = fs.readFileSync(path.resolve(__dirname, "../..", "app/dashboard/editor/[cardId]/actions.ts"), "utf8");
  assert.match(editor, /return toActionFailure\(error, "editor\.updateCard"\)/);
});

test("los clientes muestran el error devuelto y no el texto de excepciones del servidor", () => {
  const users = fs.readFileSync(path.resolve(__dirname, "../../app/dashboard/users/UsersClient.tsx"), "utf8");
  assert.doesNotMatch(users, /err\.message/);
  assert.match(users, /setError\(result\.error\)/);
  const editor = fs.readFileSync(path.resolve(__dirname, "../../app/dashboard/editor/[cardId]/CardEditorClient.tsx"), "utf8");
  assert.match(editor, /const result = await addLinkAction\(fd\);/);
  assert.match(editor, /const result = await deleteLinkAction\(fd\);/);
});

test("editor: el rechazo de una imagen externa conserva su mensaje (no se vuelve genérico)", async () => {
  const hosts = ["qateststore.public.blob.vercel-storage.com"];
  const r = await runAction("editor.updateCard", async () => { resolveCardImageUpdate("heroImageUrl", "https://evil.example/hero.png", null, hosts); return {}; });
  assert.equal(r.ok, false);
  assert.match(!r.ok ? r.error : "", /debe subirse desde el editor de SmartNFC/);
  const r2 = await runAction("editor.updateCard", async () => { resolveCardImageUpdate("logoUrl", new File([], "x.png"), null, hosts); return {}; });
  assert.match(!r2.ok ? r2.error : "", /no es válida/);
});
