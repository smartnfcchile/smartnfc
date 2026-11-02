# Pruebas E2E con Playwright (Fase A)

Estado: **Fase A** (entorno aislado y navegación pública) completada. **Fase B** (pruebas funcionales con datos ficticios) en curso por etapas: autenticación → Personas → Empresas → Locales → NFC.

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

## Fase B: datos ficticios y pruebas funcionales

- **Seed (`e2e/support/seed.ts`):** lo ejecuta el `globalSetup` de Playwright antes de cualquier prueba. Antes de escribir pasa por tres barreras (`e2e/support/db-guard.ts`); si alguna falla, se detiene sin escribir:
  1. **URL:** PostgreSQL en loopback, con `e2e_disposable` en el nombre y sin parámetros que redirijan el host. Esta validación se hace antes de conectarse.
  2. **Identidad, ya conectado:** `current_database()` incluye `e2e_disposable` y el servidor no expone parámetros `neon.*`.
  3. **Contenido:** la base está vacía o solo tiene datos E2E (empresas con slug `e2e-` y usuarios `@smartnfc.test`). Un solo dato ajeno detiene el seed.
- **Datos:** el seed vacía la base desechable y crea cuentas `@smartnfc.test` con contraseñas aleatorias en cada ejecución. Las guarda en `e2e/.state/accounts.json`, que está ignorado por git.
- **Enlaces de activación y restablecimiento:** el seed los crea directamente con su hash. Nunca se envía un correo.
- **Verificación:** las pruebas confirman lo guardado con `readOnly()`, una transacción `READ ONLY` en PostgreSQL que no puede escribir.
- **Escrituras:** solo las pruebas con `test.use({ allowMutations: true })` pueden enviar POST de la aplicación. El inicio y cierre de sesión de NextAuth están permitidos siempre, porque son JWT sin adaptador y no escriben en la base.
- **Proyectos:** las pruebas funcionales corren solo en `desktop-chromium`; `mobile-chromium` ejecuta la navegación pública.
- **Fuera de alcance:** subida de imágenes (requiere Vercel Blob) y hardware NFC real. Solo se prueba la ruta `/t/[token]`.
