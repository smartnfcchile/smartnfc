// Fixture base de todas las pruebas E2E.
//
// - Solo se permiten requests al origen local de la app (más data:/blob:). Todo lo externo se aborta
//   y queda anotado en el informe.
// - Por defecto la prueba es de SOLO LECTURA: cualquier POST/PUT/PATCH/DELETE (local o externo) se aborta
//   y hace fallar la prueba. Las pruebas que modifiquen datos deberán declarar `allowMutations: true`
//   explícitamente (Fase B, una vez demostrado el aislamiento del entorno).
// - Errores de JavaScript en la página hacen fallar la prueba.

import { test as base, expect, type Request } from "@playwright/test";

type E2EOptions = { allowMutations: boolean };
type E2EGuards = { networkGuard: void };

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const test = base.extend<E2EOptions & E2EGuards>({
  allowMutations: [false, { option: true }],

  networkGuard: [
    async ({ page, baseURL, allowMutations }, use, testInfo) => {
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
        if (!allowMutations && !READ_METHODS.has(request.method())) {
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
      expect(pageErrors, "errores de JavaScript en la página").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
