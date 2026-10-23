# Inventario de pruebas y CI

Actualizado: 21-oct-2026. Fuente: `package.json` y `.github/workflows/`.

## Dónde corre cada suite

| Comando | Suites | Base de datos | Workflow |
|---|---|---|---|
| `test:empresas` | empresas | No | `empresas-pr-check.yml` |
| `test:personas` | personas-flow, -preview, -quote, -assets | No | `unit-and-build-check.yml` (unit) |
| `test:locales` | locales-flow, -quote | No | `unit-and-build-check.yml` (unit) |
| `test:commercial` | public-offers, -extras | No | `unit-and-build-check.yml` (unit) |
| `test:flow` | flow-engine | No | `unit-and-build-check.yml` (unit) |
| `test:privacy` | privacy | No | `unit-and-build-check.yml` (unit) |
| `test:card-images` | card-images, profile-image-specs, profile-image-crop | No | `unit-and-build-check.yml` (unit) |
| `test:card-preview` | card-preview-qr, physical-export-qr | No | `unit-and-build-check.yml` (unit) |
| `test:card-profile` | card-profile-view | No | `unit-and-build-check.yml` (unit) |
| `test:security` | secret-scan, email-security (+ email-mode cuando se fusione su PR) | No | `unit-and-build-check.yml` (unit) |
| `test:utils` | vcf, physical-card | No | `unit-and-build-check.yml` (unit) |
| `test:card-images:integration` | card-images-integration | Postgres efímero `block2_disposable*` | `unit-and-build-check.yml` (integración) |
| `test:card-actions:integration` | card-actions-integration | Postgres efímero `block2_disposable*` | `unit-and-build-check.yml` (integración) |
| `npm run build` | `prisma generate && next build` | Postgres efímero | `unit-and-build-check.yml` (integración) |
| `test:local` | local-*.test.ts | Postgres efímero | `local-reports-check.yml` |
| `test:entitlements`, `test:entitlements:integration`, `test:sweep:local-location`, `test:migration-history`, `test:local-location-backfill-idempotency` | Bloque 2 | Postgres efímero `block2_disposable*` | `block2-entitlements-check.yml` |
| `test:db-isolation` | test-database-isolation | No conecta | `local-reports-check.yml`, `block2-entitlements-check.yml` |

En CI una suite de integración omitida (`# skipped > 0`) cuenta como fallo.

## Suites excluidas a propósito

| Suite | Motivo | Propuesta |
|---|---|---|
| `backfill.test.ts` | Borra temporalmente `prisma/migrations/*init_broadcast` del árbol de trabajo, hace `DROP SCHEMA public` y captura los errores con `.catch(console.error)`, así que puede salir con código 0 aunque falle. Verifica una migración histórica ya cubierta por `test:migration-history`. | Retirar, o reescribir con `node:test` sin tocar archivos del repositorio |
| `concurrency.test.ts` | Estilo script (no `node:test`), simula next-auth vía `require.cache`, URL fija `localhost:5433/postgres` y `deleteMany()` sobre tablas completas. No se pudo validar su determinismo. | Reescribir sobre `BLOCK2_TEST_DATABASE_URL` con `node:test`, o confirmar que `test:local` ya cubre la garantía de lote único |
| `lifecycle.test.ts` | Mismo patrón que `concurrency.test.ts` | Igual que la anterior |

Ninguna de las tres puede alcanzar Neon: el guard `helpers/test-database` solo admite loopback. Se excluyen por fiabilidad, no por riesgo de producción.

## Suites que requieren servicios externos

Ninguna suite actual llama a Resend, Vercel Blob, Neon ni WhatsApp: los SDK se simulan o se omiten (sin token de Blob, clave de Resend sintética). Cualquier suite futura que necesite un servicio externo real debe quedar fuera de estos workflows hasta disponer de un entorno de pruebas propio.
