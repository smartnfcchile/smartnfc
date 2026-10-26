# Pruebas E2E con Playwright (Fase A)

Estado: **Fase A** — entorno aislado y navegación pública de solo lectura. Las pruebas que modifican datos (Fase B) quedan bloqueadas hasta demostrar el aislamiento en CI.

## Reglas

1. El servidor E2E solo arranca mediante `e2e/support/server.ts`. Nunca contra `next dev`/`next start` lanzados a mano.
2. La base se toma **solo** de `E2E_DATABASE_URL`: PostgreSQL en loopback (`127.0.0.1`, `localhost`, `::1`) con `e2e_disposable` en el nombre. El `DATABASE_URL` del shell o de `.env` se ignora.
3. Se fuerzan vacías: `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `BLOB_STORE_ID`, `VERCEL*`. Sin clave de Resend, `sendEmail()` no envía. Además quedan fijados `EMAIL_MODE=disabled` y vacías las variables de producción de Vercel: con el PR #20 fusionado, el correo queda bloqueado por tres vías independientes. `LOCAL_REPORT_EMAIL_MODE=disabled` queda fijado.
4. El lanzador replica la carga de `.env` de Next.js (`@next/env`) y valida el entorno **efectivo**. Si cualquier variable contiene `neon.tech`, `smartnfc.cl`, `vercel.app` o `vercel-storage.com`, se niega a arrancar.
5. Playwright nunca reutiliza un servidor existente (`reuseExistingServer: false`) y el lanzador aborta si el puerto ya está ocupado.
6. En el navegador, todo request fuera de `http://127.0.0.1:<puerto>` se aborta y se anota en el informe.
7. Por defecto cada prueba es de **solo lectura**: un POST/PUT/PATCH/DELETE se aborta y hace fallar la prueba. Para modificar datos, la prueba deberá declarar `test.use({ allowMutations: true })` (Fase B).

## Uso local

Requisitos: PostgreSQL local desechable (por ejemplo `docker run -p 5432:5432 -e POSTGRES_PASSWORD=e2e -e POSTGRES_DB=smartnfc_e2e_disposable postgres:16`).

```bash
# PowerShell: $env:E2E_DATABASE_URL="postgresql://postgres:e2e@127.0.0.1:5432/smartnfc_e2e_disposable"
export E2E_DATABASE_URL=postgresql://postgres:e2e@127.0.0.1:5432/smartnfc_e2e_disposable
npm run e2e:check      # solo valida
npm run e2e:prepare    # migraciones sobre la base desechable
npm run e2e:build      # compila con la configuración E2E
npx playwright install chromium
npm run e2e            # ejecuta las pruebas
npm run e2e:report     # abre el informe HTML
```

Modo rápido sin compilar (solo local): `E2E_SERVER_MODE=dev npm run e2e`.

Si tu carpeta tiene un `.env` con datos de producción, el guard puede rechazar el arranque. Es intencional: mueve esas variables o usa una copia limpia del repositorio.

## Evidencias

- Capturas, video y traza: solo cuando una prueba falla.
- Informe HTML: `playwright-report/`.
- En CI se suben como artifact **solo al fallar**, con retención de 7 días (el repo es público).

## CI

`.github/workflows/e2e.yml` corre en cada PR a `main`: PostgreSQL efímero, guard, migraciones, build E2E, Chromium y pruebas. No usa secretos.

## Pruebas del guard

`npm run test:e2e-guard` demuestra, sin red ni base, que el lanzador rechaza Neon, URLs públicas, claves de Resend/Blob, variables de Vercel y un `.env` de producción en la carpeta.
