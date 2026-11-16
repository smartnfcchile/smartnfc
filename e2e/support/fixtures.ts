// Fixture base de todas las pruebas E2E.
//
// - Solo se permiten requests al origen local de la app (más data:/blob:). Todo lo externo se aborta
//   y queda anotado en el informe.
// - Por defecto la prueba es de SOLO LECTURA: cualquier POST/PUT/PATCH/DELETE (local o externo) se aborta
//   y hace fallar la prueba, salvo el inicio y cierre de sesión de NextAuth (no escriben en la base).
//   Las pruebas que modifican datos declaran `test.use({ allowMutations: true })`.
// - Errores de JavaScript en la página hacen fallar la prueba.

import { test as base, expect, type Request } from "@playwright/test";

type E2EOptions = {
  allowMutations: boolean;
  /**
   * Error de JavaScript CONOCIDO y documentado (un BUG-E2E-n) que la prueba tolera para poder verificar otra
   * cosa (p. ej. que la base no cambió). Se anota en el informe; cualquier otro error sigue haciendo fallar.
   */
  knownPageError: { bug: string; pattern: RegExp } | null;
};
type E2EGuards = { networkGuard: void };

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
// POST de NextAuth que no escriben en la base: la sesión es JWT y no hay adaptador de base de datos
// (lib/auth.ts solo lee el usuario en authorize()). Cualquier otro POST exige allowMutations.
const SESSION_ONLY_POSTS = new Set(["/api/auth/callback/credentials", "/api/auth/signout", "/api/auth/_log"]);

export const test = base.extend<E2EOptions & E2EGuards>({
  allowMutations: [false, { option: true }],
  knownPageError: [null, { option: true }],

  networkGuard: [
    async ({ page, baseURL, allowMutations, knownPageError }, use, testInfo) => {
      if (!baseURL) throw new Error("[e2e] baseURL no definida");
      const appOrigin = new URL(baseURL).origin;
      const blockedExternal: string[] = [];
      const blockedMutations: string[] = [];
      const pageErrors: string[] = [];

      const describe = (r: Request) => `${r.method()} ${r.url().slice(0, 200)}`;

      await page.context().route("**/*", async (route) => {
        const request = route.request();
        const url = request.url();
        if (url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
        let origin = "";
        try { origin = new URL(url).origin; } catch { /* URL no parseable */ }
        if (origin !== appOrigin) {
          blockedExternal.push(describe(request));
          return route.abort("blockedbyclient");
        }
        if (!allowMutations && !READ_METHODS.has(request.method()) && !SESSION_ONLY_POSTS.has(new URL(url).pathname)) {
          blockedMutations.push(describe(request));
          return route.abort("blockedbyclient");
        }
        return route.continue();
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));

      await use();

      if (blockedExternal.length) {
        testInfo.annotations.push({ type: "requests externos bloqueados", description: [...new Set(blockedExternal)].join("\n") });
      }
      expect(blockedMutations, "una prueba de solo lectura intentó enviar datos (POST/PUT/PATCH/DELETE)").toEqual([]);
      const tolerated = knownPageError ? pageErrors.filter((m) => knownPageError.pattern.test(m)) : [];
      if (tolerated.length) testInfo.annotations.push({ type: `error conocido tolerado (${knownPageError!.bug})`, description: tolerated.join("\n") });
      expect(pageErrors.filter((m) => !tolerated.includes(m)), "errores de JavaScript en la página").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/**
 * Segundo navegador aislado (otra sesión) con las mismas protecciones de red: solo localhost.
 * Se usa para simular a otro usuario con la sesión abierta en paralelo.
 */
export async function isolatedContext(browser: import("@playwright/test").Browser, baseURL: string) {
  const context = await browser.newContext({ baseURL });
  const appOrigin = new URL(baseURL).origin;
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
    let origin = "";
    try { origin = new URL(url).origin; } catch { /* no parseable */ }
    return origin === appOrigin ? route.continue() : route.abort("blockedbyclient");
  });
  return context;
}
