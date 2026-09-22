# Runbook de despliegue — Bloque 2 (H-4)

Cubre el despliegue de `prisma/migrations/20260917010000_commercial_catalog_entitlements` y del código que depende de ella. Resultado de la auditoría H-4 (solo diseño, aprobada) y de su implementación local. **Este documento no autoriza por sí mismo ningún despliegue real** — la ejecución contra Neon/producción requiere aprobación explícita separada, en el momento en que se decida desplegar.

**Antes de ejecutar cualquier comando de este runbook contra un entorno real (Neon/producción): revise explícitamente el comando exacto y la variable `DATABASE_URL`/entorno objetivo que va a usar. Ningún comando de este documento es "solo lectura" por descripción — compruébelo usted mismo en el momento, contra el entorno real que tenga delante, antes de ejecutarlo.** Este runbook fue validado únicamente contra PostgreSQL desechable local; no fue medido contra Neon ni contra el volumen real de producción.

Estrategia aprobada: **migración aditiva → despliegue del código nuevo → reconciliación idempotente puntual** (sección G del informe de auditoría H-4). No se usa ventana de mantenimiento ni doble despliegue de compatibilidad — el riesgo real identificado es único, acotado, no destructivo y autorreparable.

---

## 1. PRECHECKS

- [ ] Confirmar el commit exacto a desplegar (rama, hash completo).
- [ ] Confirmar la versión real de PostgreSQL del entorno objetivo (`ALTER TYPE ... ADD VALUE` dentro de transacción requiere PostgreSQL 12+; esta migración fue validada contra PostgreSQL 18.4 local, no contra la versión real del entorno objetivo).
- [ ] Obtener conteos reales de `Card` y `LocalCampaign` en el entorno objetivo (de solo lectura, revisando el comando y el entorno antes de ejecutarlo) — condicionan cuánto puede tardar el índice único nuevo sobre `Card` (`Card_id_companyId_key`, sección E del informe H-4).
- [ ] Confirmar `prisma migrate status` contra el entorno objetivo para verificar que no hay migraciones pendientes distintas a esta — revisando primero, en ese momento, que el comando apunta al entorno correcto.
- [ ] Confirmar que la suite completa (unitarias + integración de entitlements + Local + seguridad + la suite del sweep) está en verde contra PostgreSQL desechable, sobre el commit exacto a desplegar.
- [ ] Confirmar `git diff --check`, TypeScript, ESLint, build y `check:secrets` en verde sobre ese mismo commit.
- [ ] Confirmar la configuración real de despliegue (Vercel u otro) y en qué paso exacto se ejecuta `prisma migrate deploy` respecto del despliegue de la aplicación — no asumido en este runbook, debe verificarse contra la configuración real antes de la primera vez que se use este procedimiento.

## 2. BACKUP / PUNTO DE RECUPERACIÓN

- [ ] Obtener un snapshot o punto de recuperación de la base real, tomado por quien tenga acceso al proveedor (Neon), **antes** de aplicar la migración.
- [ ] Confirmar explícitamente que el punto de recuperación corresponde al entorno y al momento correctos (no asumir).

## 3. MIGRACIÓN

- [ ] Ejecutar `prisma migrate deploy` contra el entorno objetivo, **solo después de revisar explícitamente que `DATABASE_URL` apunta al entorno correcto**.
- [ ] La migración es una única transacción (`BEGIN;...COMMIT;`): o se aplica completa, o Postgres la revierte sola ante cualquier error. No requiere ninguna acción manual de limpieza si falla (ver Escenario A).
- [ ] Confirmar, con una consulta de solo lectura ya revisada contra el entorno correcto, que las tablas nuevas existen (`CardProfileRight`, `LocalLocation`, `CompanyCapabilityOverride`, `CompanyLimitOverride`) y que `LocalCampaign.locationId` es `NOT NULL` para toda fila que existía antes de la migración.

## 4. DEPLOY

- [ ] Desplegar el código nuevo inmediatamente después de que la migración haya terminado con éxito. No se necesita una ventana de espera artificial (sección G del informe H-4): el código viejo es compatible con el schema nuevo durante el lapso que exista entre estos dos pasos.

## 5. VALIDACIÓN

- [ ] Confirmar que la aplicación responde (health check / smoke test básico).
- [ ] Confirmar en el panel de Superadmin (`/superadmin/tarjetas`) que la tabla "Derechos de Perfil" carga sin error.

## 6. SWEEP DRY-RUN

- [ ] Ejecutar `npm run sweep:local-location` (sin `--apply`) contra el entorno objetivo, **revisando explícitamente `DATABASE_URL` antes de correrlo** — no escribe nada, pero de todos modos se conecta al entorno real y lo consulta.
- [ ] Revisar la salida: cuántas campañas huérfanas se detectaron, en qué empresas, qué `LocalLocation` técnico se crearía o reutilizaría.
- [ ] Si el número de huérfanas es muy alto o inesperado, **detenerse** y entender la causa antes de aplicar (puede indicar que el despliegue del código nuevo tardó más de lo esperado, o un problema distinto).

## 7. SWEEP APPLY

- [ ] Ejecutar `npm run sweep:local-location -- --apply` contra el entorno objetivo, con la misma revisión explícita del destino.
- [ ] Confirmar en la salida que "Campañas huérfanas restantes: 0".
- [ ] El sweep es idempotente (ver Escenario E) — no hay urgencia ni riesgo en volver a ejecutarlo si hay dudas sobre si corrió correctamente.

## 8. SMOKE TESTS

- [ ] Cargar `/c/{slug}` de un perfil real conocido y confirmar que resuelve con normalidad.
- [ ] Confirmar que `/dashboard/local/locales` de una empresa con Local activo lista sus locales sin error.
- [ ] Confirmar que crear un punto nuevo en una campaña recién reconciliada por el sweep funciona (si corresponde probarlo con datos reales, decisión del momento del despliegue real, no de este runbook).

## 9. CIERRE

- [ ] Registrar el commit desplegado, la hora de cada paso y los resultados de las validaciones.
- [ ] Confirmar que no quedaron campañas huérfanas (`SELECT count(*) FROM "LocalCampaign" WHERE "locationId" IS NULL`, de solo lectura, revisando el entorno antes de ejecutar).
- [ ] Recién en este punto, considerar el despliegue cerrado.

---

## Criterios GO / ABORT

**GO** (avanzar al siguiente paso) requiere, en cada etapa:
- Migración: `prisma migrate deploy` termina con código de salida exitoso.
- Deploy: el build/despliegue de la aplicación termina exitosamente y el health check responde.
- Sweep dry-run: la salida es coherente (número de huérfanas explicable por el tiempo transcurrido entre migración y deploy, no un número inesperadamente alto).
- Sweep apply: "Campañas huérfanas restantes: 0" en la salida.
- Smoke tests: todos responden con normalidad, sin error 500 ni contenido inesperado.

**ABORT** (detener y no continuar al siguiente paso) ante cualquiera de:
- Error durante `prisma migrate deploy` (la transacción ya revirtió sola — no hay nada que limpiar, pero no se debe continuar con el deploy del código nuevo).
- Build o despliegue del código nuevo fallido.
- Un smoke test público (`/c/[slug]` de un perfil real conocido) devuelve error 500.
- El sweep dry-run reporta un número de huérfanas que no se explica por el tiempo transcurrido.

## Estrategia de rollback/roll-forward

**No se propone ningún rollback destructivo de schema.** Toda la migración es aditiva (`CREATE TYPE`, `ALTER TYPE ADD VALUE`, `CREATE TABLE`, `ADD COLUMN` nullable, índices y FK nuevos) — no elimina ni renombra nada existente. Revertirla eliminando tablas/columnas sería más riesgoso que dejarla aplicada, incluso si el despliegue del código se detiene o se posterga. La estrategia por defecto ante cualquier falla es **roll-forward**: corregir la causa del fallo y reintentar el paso que falló, no deshacer los pasos anteriores.

---

## Escenarios

### A. Falla la migración

La migración es una única transacción. Si cualquier sentencia falla, PostgreSQL revierte automáticamente toda la transacción — no queda ningún cambio de schema aplicado a medias. **No se requiere ninguna limpieza manual.** Acción: entender la causa del error (versión de PostgreSQL insuficiente, permisos, un objeto con el mismo nombre ya existente por una ejecución previa fallida a nivel de bookkeeping de Prisma — ver Escenario E de idempotencia de DDL en el informe H-4), corregirla, y reintentar `prisma migrate deploy`. No se despliega el código nuevo hasta que la migración termine con éxito (criterio ABORT).

### B. Migración correcta pero falla el deploy del código nuevo

El schema ya quedó aplicado y es compatible con el código viejo (confirmado en la auditoría H-4, sección C: ningún escritor del código viejo puede fallar contra el schema nuevo). La aplicación puede seguir sirviendo tráfico con el código viejo sin ningún cambio de comportamiento visible salvo el caso acotado de la sección D del informe (campañas nuevas sin local, autorreparable). No hay urgencia de revertir el schema. Acción: corregir la causa del fallo de deploy y reintentar el despliegue del código nuevo cuando esté listo. El sweep se ejecuta recién después de que el deploy del código nuevo tenga éxito (no antes).

### C. Deploy correcto pero falla el sweep

El código nuevo ya está sirviendo tráfico con normalidad. Una campaña huérfana (si la hay) queda en el estado descrito en la sección D del informe H-4: no se pierde ningún dato, los puntos ya existentes de esa campaña siguen resolviendo en público sin problema, y el único efecto es que esa campaña específica no puede recibir puntos nuevos hasta que se reconcilie (falla cerrado, no abierto). No es bloqueante. Acción: reintentar `npm run sweep:local-location -- --apply` cuando se pueda, sin presión de tiempo. Mientras tanto, un administrador de la empresa afectada puede reasignar la campaña manualmente desde `/dashboard/local/locales` si lo necesita con urgencia, sin depender del sweep.

### D. Aparecen campañas huérfanas

Es el resultado esperado si el código viejo creó una campaña nueva durante la ventana entre migración y deploy (sección D del informe H-4). No indica ningún error: es exactamente el caso que el sweep existe para resolver. Acción: ejecutar el sweep dry-run para confirmar cuántas y en qué empresas, y luego `--apply`. Si el número es sorprendentemente alto, investigar antes de aplicar (podría indicar que el deploy tardó mucho más de lo esperado, o que hay otro origen de campañas sin cubrir por esta auditoría).

### E. El sweep se ejecuta accidentalmente dos veces

Sin consecuencias. El sweep es idempotente por diseño: la segunda ejecución no encuentra ninguna `LocalCampaign` con `locationId IS NULL` (ya fueron reconciliadas), no crea ningún `LocalLocation` adicional (`ON CONFLICT DO NOTHING` sobre la clave `companyId+key`), no reasigna nada, y no escribe ninguna fila nueva en `AdminAuditLog`. Queda demostrado en `scripts/tests/local-location-orphans.test.ts` ("Second execution after full reconciliation makes zero changes"). No requiere ninguna acción.

---

## Referencia rápida de comandos

```bash
# Prechecks (contra PostgreSQL desechable local, nunca contra Neon durante desarrollo/pruebas)
npm run typecheck
npm run test:entitlements
npm run test:entitlements:integration
npm run test:local
npm run test:sweep:local-location
npm run test:security

# Despliegue real (solo cuando se autorice explícitamente, revisando DATABASE_URL en cada paso)
npx prisma migrate deploy
# ... despliegue de la aplicación según la plataforma real usada ...
npm run sweep:local-location                 # dry-run, comportamiento por defecto
npm run sweep:local-location -- --apply      # aplica la reconciliación
```

## Qué falta antes del despliegue real (H-4 no lo ejecuta)

Confirmado como pendiente, documentado aquí, no realizado en esta ronda:
- Confirmar versión real de PostgreSQL de Neon.
- Confirmar versión/schema/migraciones ya aplicadas en el entorno real.
- Obtener conteos reales de `Card`.
- Obtener conteos reales de `LocalCampaign`.
- Inventariar las `Card` existentes en producción antes de cualquier clasificación comercial (INTERNAL/PILOT/PURCHASE) — pendiente de H-1, no de H-4.
- Confirmar backup/punto de recuperación real.
- Confirmar el commit exacto a desplegar en el momento del despliegue real.
- Confirmar la configuración real de Vercel y el orden exacto en que coordina migración y despliegue de código.

Estas verificaciones se harán solo cuando se autorice expresamente el despliegue real — no antes.
