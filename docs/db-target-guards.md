# Guards de destino para seeds y scripts de mantenimiento

Módulos: `scripts/lib/db-target.ts` (decisiones puras), `scripts/lib/seed-guard.ts` y `scripts/lib/maintenance-guard.ts` (se importan como primera instrucción). Pruebas: `npm run test:db-guards` (sin base de datos) y `npm run test:db-guards:integration` (PostgreSQL desechable, en CI con `db-guards-check.yml`).

## Reglas

| Tipo | Archivos | Destino local (loopback) | Destino remoto |
|---|---|---|---|
| Seed / utilidad local | `prisma/seed*.ts`, `query_current.ts` | Permitido | **Rechazado siempre**, sin opción para saltarlo |
| Mantenimiento, dry-run | `scripts/maintenance/*.ts`, `scripts/seed-physical-card-templates.ts` | Permitido | Permitido (solo lectura; se muestra el destino) |
| Mantenimiento, `--apply` | ídem | Permitido | Solo con `--confirm-host=<host exacto>`; **nunca en CI**; nunca si la URL redirige el host con `?host=`, `hostaddr` o `service` |

- El guard resuelve `DATABASE_URL` y `DIRECT_URL` igual que Prisma: primero el entorno del proceso y, si faltan, `.env` y `prisma/.env`. Si distintos `.env` tienen valores diferentes, se rechaza. Luego fija esas URLs en el proceso antes de que se cree el cliente de Prisma.
- `--dry-run` prevalece sobre `--apply`.
- Los mensajes muestran host y base de datos, nunca usuario ni contraseña.
- `seed-physical-card-templates.ts` escribía directamente; ahora sin `--apply` solo lista lo que haría.

## Seed principal (`prisma/seed.ts`)

- Sin contraseñas fijas. El usuario demo es `demo@smartnfc.test` (dominio reservado), con `SEED_DEMO_PASSWORD` o una contraseña aleatoria que se muestra una sola vez en la consola local. Si ya existe, no se modifica.
- `SUPER_ADMIN_EMAIL` / `SEED_SUPERADMIN_EMAIL`: crea un SUPERADMIN **solo si el correo no existe**. Si existe con otro rol, **no lo promueve** y lo informa. Si ya era SUPERADMIN, lo mantiene activo y actualiza su contraseña solo si se entrega `SEED_SUPERADMIN_PASSWORD`.

## `prisma/seed-sarcarnico.ts`

Ya no usa `company.findFirst()`. Uso: `npx tsx prisma/seed-sarcarnico.ts --company=<slug>`; con `--create-company` crea una empresa demo con ese slug si no existe.

## Operación legítima en producción (runbook Bloque 2)

```
npm run sweep:local-location                                              # dry-run, muestra el destino
npm run sweep:local-location -- --apply --confirm-host=<host de DATABASE_URL>
```

El host se escribe a mano después de leerlo en la salida del dry-run. Lo mismo aplica a `import-physical-nfc-cards.ts` y `fix-sarcarnico-product-license.ts`.

## Scripts antiguos: uso real y recomendación

Análisis del 21-oct-2026 (código e historial de Git). Por decisión del producto, **se protegen y no se eliminan** por ahora.

| Script | Origen | Dependencias y uso actual | Riesgo observado | Recomendación |
|---|---|---|---|---|
| `prisma/seed-demo.ts` | 07–13 jun 2026 (primeros avances) | Requiere un usuario `admin@nfc.com` que ningún seed actual crea: **en una base nueva no hace nada**. Crea la tarjeta `agustin-admin`, **borra sus eventos** e inserta 50 eventos aleatorios. Sin referencias en el código, scripts ni docs | Su comentario ("Los enviamos todos de golpe a Neon") indica que **probablemente se ejecutó contra producción** | Retirar cuando se verifique en producción si existen `admin@nfc.com` y la tarjeta `agustin-admin` (con eventos ficticios) y se decida qué hacer con ellos |
| `prisma/seed-leads.ts` | jun–jul 2026 | Depende de la tarjeta `agustin-dev` de `seed.ts`. Inserta 3 prospectos con dominios no reservados (`empresa-cliente.cl`, etc.). Sin referencias | Puede haber creado prospectos ficticios donde se ejecutó | Retirar o reescribir con dominios `.test` si se necesita una demo local de CRM |
| `query_current.ts` | 20 jun 2026, commit "temporary auth bypass for editor page diagnostics" | Lectura de diagnóstico de la tarjeta `agustin-dev`. Sin referencias. (El bypass de autenticación de ese commit ya fue revertido: el editor vuelve a exigir sesión y `PROFILE_EDIT`) | Bajo: solo lectura | Retirar: es un resto de depuración, con alta certeza de que no se necesita |
| `prisma/seed-sarcarnico.ts` | 17 jul 2026 | Campaña demo de un negocio real (dirección en Valdivia). `fix-sarcarnico-product-license.ts` sugiere que la campaña existe en producción | Antes podía colgarse de la primera empresa de la base | Mantener protegido; decidir si sigue siendo necesario |

Antes de retirar cualquiera de ellos: confirmar con el equipo que nadie los usa en local, y revisar en producción los restos indicados.
