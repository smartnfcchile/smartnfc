# Bloque 2: catálogo comercial y entitlements

Informe de revisión — 17 de septiembre de 2026. Sin commit, push, PR, merge ni despliegue.

## Estado

Rama: codex/commercial-catalog-entitlements. HEAD/base: 40a0bff8d7618acf73a85895047f2968fe6a7743. Los cambios permanecen sin preparar para commit. No se modificaron variables de entorno ni se aplicaron migraciones en producción. Las pruebas usan exclusivamente PostgreSQL desechable local y variables por proceso.

## Arquitectura y catálogo

Se separan soporte físico, derecho permanente del perfil y licencia de capacidades. Los precios son metadatos; no deciden autorización. CardProfileRight pertenece a Card y companyId, con origen, referencia, motivo, autor, vigencia y revocación. Reemplazar o eliminar el soporte físico no elimina el derecho. Crear una Card no otorga ningún derecho por sí sola (ver H-1 más abajo): el derecho (INTERNAL/PILOT/PURCHASE) es siempre una asignación explícita y auditada de Superadmin.

| Oferta | Precio CLP | Capacidades / cupo |
|---|---:|---|
| Card físico | 29.990 | Perfil permanente; soporte separado de premium |
| Perfil Base | Incluido en derecho | Perfil, edición, contacto/redes, enlaces y compartir |
| Pro | 7.990/mes; 79.900/año | CRM, captura y analítica; identidades configuradas |
| Equipo 5 / 10 / 25 | 19.990 / 34.990 / 69.990 al mes | Mismas capacidades Pro + equipo, analítica agregada y política de edición; 5/10/25 identidades |
| Empresa 50+ | Contractual | Mismas capacidades Equipo; cupo explícito |
| Local Mini / Standard / XL | 19.990 / 29.990 / 39.990 | Soporte físico; no concede perfil permanente |
| Local Pro | 14.990/mes; 149.900/año | 1 local y 10 puntos activos por local |
| Local Pack 3 / 5 | Sin precio inventado | Mismas capacidades Local; 3/5 locales y 10 puntos activos por local |
| Local contractual | Sin precio inventado | Locales configurados; 10 puntos activos por local por defecto |

Local incluye puntos, reseñas, WhatsApp, redes, Club, promoción, menú, página Smart, suscriptores, reportes y exportaciones. Los límites contractuales requieren un cupo positivo; los presets se normalizan en servidor. Las identidades extra autorizadas se suman al cupo correspondiente.

El resolver central combina empresa activa, derechos permanentes, licencia vigente, compatibilidad legacy y overrides. Se aplica en acciones y rutas del servidor además de la visibilidad de interfaz. Revalida usuario y tenant; conserva las restricciones de seguridad existentes. El derecho base sobrevive al vencimiento premium; CRM/captura/analítica dejan de operar sin borrar datos. La configuración premium se conserva al editar el perfil base.

## Migración y backfill

Nueva: prisma/migrations/20260917010000_commercial_catalog_entitlements/migration.sql.

Añade once códigos de plan (incluido EMPRESAS_PILOT), ProfileRightOrigin (INTERNAL/PILOT/PURCHASE/LEGACY_PRESERVED), CardProfileRight (con expiresAt/revokedAt/revokedByUserId), LocalLocation, CompanyCapabilityOverride, CompanyLimitOverride, LocalCampaign.locationId y CompanyProductLicense.maxActiveTouchpointsPerLocation. Añade índices, claves compuestas, restricciones y triggers de aislamiento. Es aditiva: no elimina ni renombra estructuras existentes. El backfill actualiza únicamente la nueva asociación de local y crea locales técnicos; no reescribe licencias comerciales ni otorga ningún CardProfileRight automático (ver H-1 más abajo). Todas las migraciones históricas permanecen idénticas; la prueba verifica sus hashes y una segunda ejecución de migrate deploy sin duplicados.

## Compatibilidad y límites

No se convierten licencias históricas a ofertas nuevas. Empresas Conecta/Crece/Escala conservan 5/15/30 identidades; Histórico conserva su cupo previo y Corporativo su configuración/fallback histórico. Las licencias Empresas legacy activas conservan las capacidades históricas; estados inactivos no recuperan premium mediante fallback. El guardado de Histórico con cupo nulo preserva la semántica de Company.maxIdentities.

Local Impulsa/Fundador conservan un local, una campaña y tres puntos según la semántica histórica. Personalizado conserva sus cupos históricos. includedTouchpoints legacy continúa siendo un límite global histórico; no se convierte en diez puntos activos por local.

Las nuevas ofertas cuentan puntos activos por LocalLocation, incluso en campañas archivadas, para evitar evasión. Crear/reactivar identidades, crear locales/puntos/campañas y mover campañas usa bloqueo transaccional por empresa y comprobación dentro de la transacción. Los puntos inactivos no consumen cupo moderno. Reducir una licencia no elimina recursos existentes; bloquea ampliaciones por encima del cupo.

Local sin operación autorizada responde “Punto Inteligente temporalmente inactivo”, sin deuda ni información administrativa. Preserva códigos y datos al reactivar. Las rutas públicas de puntos, Club y contacto comprueban autorización; un local inactivo también bloquea el contacto descargable.

## Overrides

Servicios protegidos para Superadmin, sin nueva interfaz completa: concesión/restricción de capacidades y ajuste de límites con motivo, autor, vigencia, auditoría y revocación. Orden determinista por vigencia/creación/ID. No revocan el derecho base ni reabren Local inactivo o una empresa suspendida. Las restricciones comerciales no sustituyen los controles de tenant/rol.

## Acciones restrictivas y política de edición (H-2 y H-3)

Regla de producto: el vencimiento o la inactividad comercial de una suscripción puede impedir crear, ampliar o utilizar funciones premium, pero nunca impide reducir acceso, desactivar usuarios o identidades, ni recuperar el funcionamiento básico asociado a un derecho permanente. Las acciones restrictivas no dependen de TEAM_MANAGEMENT; las de expansión y onboarding sí. Ninguna concede TEAM_MANAGEMENT gratuito, y todas siguen exigiendo sesión revalidada, empresa activa, rol administrador y ownership del tenant en el servidor.

| Acción | Teams activo | Teams vencido o inactivo | Suspensión de seguridad (Company.isActive=false) |
|---|---|---|---|
| Suspender colaborador (suspendCollaboratorUser) | Permitida | Permitida | Rechazada |
| Desactivar identidad (toggleCardActive a inactiva) | Permitida | Permitida, salvo la propia identidad del administrador | Rechazada |
| Reactivar identidad (toggleCardActive a activa) | Exige TEAM_MANAGEMENT, usuario ACTIVE y cupo | Rechazada | Rechazada |
| Crear colaboradores o identidades | Exige TEAM_MANAGEMENT y cupo | Rechazada | Rechazada |
| Reenviar invitación (onboarding) | Exige TEAM_MANAGEMENT | Rechazada | Rechazada |

- **Autodesactivación:** sin TEAM_MANAGEMENT, un administrador no puede desactivar su propia identidad, porque no podría reactivarla hasta renovar. La protección está en el servidor (toggleCardActive, dentro de la transacción con lockCapacity) y la UI la refleja. Desactivar identidades de otros integrantes del mismo tenant sigue permitido. La suspensión de la propia cuenta ya estaba bloqueada.
- **Modo restringido:** las páginas de integrantes y tarjetas dejan de redirigir cuando falta TEAM_MANAGEMENT. Un administrador de una empresa con perfiles (capability PROFILE) las ve en modo restringido: sin crear, reenviar ni reactivar, con listas y acciones de reducción de acceso. No se introdujo ninguna regla por cantidad de tarjetas ni de colaboradores. El resolver de entitlements no cambió.
- **Política de edición efectiva:** el editor aplica `efectiva = PROFILE_EDIT_POLICY ? almacenada : FLEXIBLE` (getEffectiveProfileEditPolicy). Company.profileEditPolicy nunca se sobrescribe: ADMIN_ONLY y CORPORATE permanecen almacenadas y vuelven a aplicarse automáticamente al reactivar Teams, sin backfill ni migración. Cambiar la política sigue exigiendo PROFILE_EDIT_POLICY. Las ediciones hechas mientras la política estuvo en pausa no se revierten al reactivar.
- **Sin cambios de schema, migración, backfill ni catálogo.**

Pruebas: scripts/tests/entitlements.test.ts (función pura de política efectiva) y scripts/tests/entitlements-offboarding.test.ts (PostgreSQL desechable: acciones con Teams activo, vencido y suspensión de seguridad, autodesactivación, aislamiento entre empresas, COLLABORATOR, override que deshabilita TEAM_MANAGEMENT, plan legacy inactivo, ADMIN_ONLY y CORPORATE con Teams activo, vencido y reactivado).

## Modelo de derechos de perfil (H-1): INTERNAL / PILOT / PURCHASE

CardProfileRight.origin distingue INTERNAL (uso interno SmartNFC, permanente salvo revocación), PILOT (piloto comercial gratuito, con expiresAt obligatorio) y PURCHASE (venta comercial real confirmada, permanente). LEGACY_PRESERVED se conserva en el enum como válvula de compatibilidad para un caso futuro concreto, pero ya no se asigna automáticamente a ninguna Card ni sustituye a los otros tres orígenes.

- **Vigencia:** un derecho es efectivo cuando existe, `revokedAt` es null, y (`expiresAt` es null o está en el futuro) — `profileRightEffective` en lib/entitlements/resolve.ts, usado tanto por `hasCardProfileRight` como por el conteo de derechos vigentes de `getCompanyEntitlements`. No se agregó un campo `status`: sería una segunda fuente de verdad redundante con `expiresAt`/`revokedAt`, igual que ya evitan CompanyCapabilityOverride/CompanyLimitOverride.
- **Card vs. derecho:** crear una Card (createVirtualCard, createCollaboratorWithCard, createCompleteCardSuperadminAction, createCorporateCardSuperadminAction) ya no otorga ningún CardProfileRight. Una identidad creada bajo Teams funciona mientras la licencia Empresas de la empresa esté operativa (`empresasOperational`); si Teams vence y esa Card nunca recibió un derecho propio, pierde el perfil público hasta que Superadmin se lo asigne explícitamente — reutilizando la misma Card, nunca creando una nueva.
- **Derecho vs. PhysicalNfcCard:** son conceptos independientes. PURCHASE no depende de que exista una PhysicalNfcCard, ni de su estado (`ENTREGADA` no equivale a "pagada"): la venta se confirma con `assignCardProfileRightAction`, la producción/entrega/primer uso son transiciones separadas de PhysicalNfcCard (status, deliveredAt, activatedAt) que ya existían y no se modificaron.
- **Derecho vs. Pro/Teams:** el derecho básico (CardProfileRight) y las capacidades premium (CompanyProductLicense, overrides) siguen siendo ejes separados. Un PILOT puede tener capacidades Pro durante su vigencia dándole a su empresa una licencia EMPRESAS_PILOT (nueva entrada del catálogo, sin precio ni cupo de identidades fijo: se define con `includedIdentities` como cualquier otro plan) o, si se necesitan capacidades puntuales, con CompanyCapabilityOverride — ambos mecanismos ya existían, no se creó ninguno nuevo para esto. Ninguno de los dos convierte el PILOT en PURCHASE.
- **PILOT vencido:** no se borra `Card`, `slug`, `PhysicalNfcCard`, configuración, `Lead`, `Event` ni métricas — nada de eso se toca nunca al vencer. `/c/[slug]` y `/t/[token]` muestran "Perfil SmartNFC temporalmente inactivo. Este perfil no se encuentra disponible en este momento." (lib/public-profile-status.ts), sin mencionar plan, pago ni motivo administrativo, únicamente cuando la Card y la empresa siguen activas pero no hay derecho vigente ni licencia Empresas operativa. `Card.isActive=false` y `Company.isActive=false` conservan exactamente su comportamiento de seguridad anterior (sin cambios en esas ramas). Extender el PILOT o convertirlo a PURCHASE restaura el mismo perfil de inmediato, porque `hasCardProfileRight` se recalcula en cada solicitud. Período de gracia y avisos automáticos quedan fuera de este bloque.
- **Conversión PILOT → PURCHASE:** `assignCardProfileRightAction` hace un `upsert` sobre `cardId` (la PK de CardProfileRight), así que reescribe la misma fila: `origin` pasa a PURCHASE, `expiresAt` a null, `revokedAt`/`revokedByUserId` se limpian. `Card`, `slug`, `PhysicalNfcCard`, `Lead`, `Event` y el resto del historial no se tocan.
- **Company.isActive** sigue siendo el kill-switch de seguridad y prevalece sobre cualquier origen: con `isActive=false` ningún derecho (INTERNAL/PILOT/PURCHASE) concede acceso.
- **Superadmin:** app/superadmin/tarjetas añade una tabla "Derechos de Perfil" (Derecho / NFC física asignada o no / estado físico real / uso — activatedAt o "nunca activada") con la acción `assignCardProfileRightAction`, única vía para asignar/actualizar el derecho, y `revokeCardProfileRightAction`. Ambas exigen Superadmin y quedan en AdminAuditLog (`PROFILE_RIGHT_ASSIGNED`/`PROFILE_RIGHT_REVOKED`).
- **Los cuatro perfiles reales conocidos (Ariel y Agustín de SmartNFC, Reny García/Pulpograf y Fredy Hinostroza/Synaptiq) no se clasificaron en este bloque.** Ningún nombre, email ni slug se hardcodeó en código ni en la migración. Procedimiento pendiente, a ejecutar manualmente desde la nueva pantalla de Superadmin cuando se apruebe: asignar INTERNAL a Ariel y Agustín, y PILOT (con la fecha de vencimiento que Superadmin decida, normalmente 12 meses) a Reny/Pulpograf y Fredy/Synaptiq. Antes de desplegar en producción, verificar por conteo si existen más filas de Card además de estas cuatro y decidir caso por caso.
- **Regularización física de las NFC de Ariel y Agustín: pendiente, no realizada en este bloque.** Ambos usan tarjetas NFC físicas reales y funcionales aunque el inventario (`PhysicalNfcCard`) históricamente mostró 0 entregadas — indicio de que sus chips resuelven directo a `/c/[slug]` en vez de pasar por `/t/[token]`. No se inventó ningún token. El procedimiento pendiente es leer físicamente ambas tarjetas para confirmar qué URL contienen, y solo entonces decidir su regularización (registrar un PhysicalNfcCard vía la acción ya existente `registerPhysicalCardSuperadminAction`, sin recrear su Card ni cambiar su slug) o su reprogramación.

Pruebas: scripts/tests/entitlements.test.ts (profileRightEffective, puro) y scripts/tests/entitlements-profile-rights.test.ts (PostgreSQL desechable: Teams sin derecho propio, conversión a PURCHASE reutilizando la misma Card, INTERNAL permanente y revocable, PILOT vigente/vencido, conversión PILOT→PURCHASE preservando Card/slug/PhysicalNfcCard/Lead/Event, Card.isActive independiente del derecho, Company.isActive prevalece, aislamiento multiempresa, rechazo sin Superadmin). scripts/tests/entitlements-backfill.test.ts se actualizó para confirmar que la migración corregida no otorga ningún CardProfileRight automático.

## Validación

Suite final: **52 passed, 0 failed, 0 skipped**. Incluye entitlements unitarios, integración PostgreSQL, backfill aislado, Local unitario/puntos/integración, seguridad de correo, escaneo de secretos, VCF y diseño de tarjeta física.

- Entitlements: estados, fechas, legacy, capacidades, overrides y presets.
- Integración: 5 identidades bajo concurrencia; reactivaciones; cupo de locales; diez puntos activos por local; campañas simultáneas con punto inicial; traslado sin sobrecupo; tenant/FKs; revocación, conservación y reactivación; edición base conservando CRM; Histórico conservando cupo.
- Backfill: base desechable nueva, aplicación de migraciones históricas y nueva, integridad de datos/IDs/códigos/derechos y repetición de migrate deploy. Nunca se ejecutó el antiguo backfill.test.ts.
- Regresiones Local: aislamiento, siete objetivos, reportes, consentimiento, cron protegido, idempotencia y concurrencia, reglas Empresas y limpieza de fixtures. No se enviaron correos.
- Prisma format/validate/generate: OK. TypeScript: OK y comprobado nuevamente por el build.
- Build de producción: OK, Next 16.3.2, 40 páginas estáticas generadas.
- ESLint: 0 errores, 141 advertencias; baseline previo 147 advertencias. No se introducen nuevas advertencias por archivo/regla.
- check:secrets: 0 hallazgos. git diff --check: OK.

Los errores Prisma de relaciones cruzadas que aparecen en logs son rechazos esperados por las pruebas negativas, no fallos de suite. Los tests destructivos históricos lifecycle/concurrency no se ejecutaron; los escenarios pertinentes están cubiertos por las pruebas aisladas nuevas y Local.

## Archivos principales

- lib/entitlements/: catálogo, resolver, consultas/autorización, validación de licencias y overrides.
- lib/product-access.ts y lib/plans.ts: adaptación central y compatibilidad.
- lib/local/locations.ts y app/dashboard/local/locales/: administración de locales y asociación de campañas.
- prisma/schema.prisma y la migración nueva: persistencia y garantías de integridad.
- Acciones y páginas de dashboard/Superadmin y rutas públicas/API: capacidades, cupos y conservación.
- scripts/tests/entitlements*.test.ts: pruebas nuevas; local-integration.test.ts ajusta limpieza para LocalLocation.

## Riesgos y revisión pendiente

La validación de base se realizó con PostgreSQL 18.4 local. Antes de una futura aplicación real, confirmar versión PostgreSQL objetivo (la migración transaccional de enums requiere PostgreSQL 12+) y estimar bloqueo/tiempo del backfill con el volumen real. No se midió carga de producción. La validación visual posterior está documentada en [BLOCK_2_VISUAL_VALIDATION.md](BLOCK_2_VISUAL_VALIDATION.md).

Persisten 141 advertencias de lint preexistentes y la advertencia de deprecación package.json#prisma. No se amplió el alcance para corregirlas. Los servicios de overrides no tienen nueva UI; pagos, precios públicos, comunicaciones y automatizaciones quedan fuera de este bloque.

**H-1, limitación conocida:** `/c/[slug]` responde HTTP 200 (no 403) cuando muestra el mensaje neutro de perfil temporalmente inactivo. Next 16.2.11 no ofrece un mecanismo estable para devolver un código distinto desde un Server Component de página sin habilitar `experimental.authInterrupts` (forbidden()/unauthorized(), ver node_modules/next/dist/docs/01-app/03-api-reference/04-functions/forbidden.md) — se evitó ese flag experimental por ser un cambio desproporcionado para este caso. `/t/[token]` sí conserva 403, porque es un Route Handler sin esa limitación.

PostgreSQL y sus fixtures temporales permanecen bajo node_modules ignorado. No hay archivos .block2-postgres versionados ni incluidos entre nuevos archivos Git. No se incorporan credenciales ni cadenas de conexión a este informe.

Revisión humana pendiente antes de commit/push/PR. El QA funcional y visual de H-2/H-3 se ejecutó con Chrome headless contra un servidor de producción local y PostgreSQL desechable, en escritorio y móvil de 390 × 844: Teams activo, vencido y reactivado; acciones por UI, intentos saltándose la UI y repeticiones directas de acciones de servidor; editor con ADMIN_ONLY y CORPORATE. Se corrigió una barra vacía en Tarjetas en modo restringido. Observaciones preexistentes, sin corregir: en producción los errores lanzados por acciones de servidor llegan enmascarados al cliente, y en móvil la columna de acciones de Integrantes requiere desplazamiento horizontal. La migración aún no se ha aplicado a ningún entorno real.

## Git status y diff

Este inventario corresponde al cierre técnico del 17 de septiembre, anterior a los ajustes visuales. El estado actualizado está en BLOCK_2_VISUAL_VALIDATION.md. El siguiente inventario incluye archivos nuevos. diff --stat muestra únicamente archivos ya seguidos; se complementa con la lista de nuevos.

### git status --short

```text
M app/api/leads/export/route.ts
 M app/api/local/broadcast-exports/[batchId]/route.ts
 M app/api/local/points/[pointId]/qr/route.ts
 M app/api/metrics/details/route.ts
 M app/api/public/leads/route.ts
 M app/c/[slug]/page.tsx
 M app/club/[slug]/[filename]/route.ts
 M app/club/[slug]/page.tsx
 M app/dashboard/cards/actions.ts
 M app/dashboard/cards/page.tsx
 M app/dashboard/configuracion/perfiles/actions.ts
 M app/dashboard/configuracion/perfiles/page.tsx
 M app/dashboard/editor/[cardId]/CardEditorClient.tsx
 M app/dashboard/editor/[cardId]/actions.ts
 M app/dashboard/editor/[cardId]/page.tsx
 M app/dashboard/editor/page.tsx
 M app/dashboard/layout.tsx
 M app/dashboard/leads/actions.ts
 M app/dashboard/leads/page.tsx
 M app/dashboard/local/actions.ts
 M app/dashboard/local/campanas/[campaignId]/page.tsx
 M app/dashboard/local/campanas/nueva/NuevaCampanaForm.tsx
 M app/dashboard/local/campanas/nueva/page.tsx
 M app/dashboard/local/campanas/page.tsx
 M app/dashboard/local/page.tsx
 M app/dashboard/local/puntos/[pointId]/page.tsx
 M app/dashboard/local/puntos/actions.ts
 M app/dashboard/local/puntos/nuevo/page.tsx
 M app/dashboard/local/puntos/page.tsx
 M app/dashboard/local/reportes/[reportId]/page.tsx
 M app/dashboard/local/reportes/actions.ts
 M app/dashboard/local/suscriptores/page.tsx
 M app/dashboard/metrics/page.tsx
 M app/dashboard/page.tsx
 M app/dashboard/qr/[cardId]/page.tsx
 M app/dashboard/users/actions.ts
 M app/dashboard/users/page.tsx
 M app/superadmin/actions.ts
 M app/superadmin/empresas/[companyId]/CompanyDetailClient.tsx
 M app/superadmin/empresas/nueva/page.tsx
 M app/superadmin/tarjetas/actions.ts
 M app/t/[token]/route.ts
 M components/Sidebar.tsx
 M components/local/PointForm.tsx
 M components/local/ReportCenter.tsx
 M lib/local/access.ts
 M lib/local/point-management.ts
 M lib/local/point-resolver.ts
 M lib/local/report-worker.ts
 M lib/local/subscription.ts
 M lib/plans.ts
 M lib/product-access.ts
 M lib/validations/local.ts
 M package.json
 M prisma/schema.prisma
 M scripts/tests/local-integration.test.ts
?? app/dashboard/local/locales/
?? lib/entitlements/
?? lib/local/locations.ts
?? prisma/migrations/20260917010000_commercial_catalog_entitlements/
?? scripts/tests/entitlements-backfill.test.ts
?? scripts/tests/entitlements-integration.test.ts
?? scripts/tests/entitlements.test.ts
```

### git diff --stat

```text
app/api/leads/export/route.ts                      |   2 +
 app/api/local/broadcast-exports/[batchId]/route.ts |   2 +
 app/api/local/points/[pointId]/qr/route.ts         |   2 +
 app/api/metrics/details/route.ts                   |   8 +-
 app/api/public/leads/route.ts                      |   3 +
 app/c/[slug]/page.tsx                              |   6 +-
 app/club/[slug]/[filename]/route.ts                |  19 +--
 app/club/[slug]/page.tsx                           |  17 +-
 app/dashboard/cards/actions.ts                     |  25 ++-
 app/dashboard/cards/page.tsx                       |  12 +-
 app/dashboard/configuracion/perfiles/actions.ts    |   2 +
 app/dashboard/configuracion/perfiles/page.tsx      |   2 +
 app/dashboard/editor/[cardId]/CardEditorClient.tsx |   7 +-
 app/dashboard/editor/[cardId]/actions.ts           |  20 ++-
 app/dashboard/editor/[cardId]/page.tsx             |  13 +-
 app/dashboard/editor/page.tsx                      |  12 +-
 app/dashboard/layout.tsx                           |  20 +--
 app/dashboard/leads/actions.ts                     |   2 +
 app/dashboard/leads/page.tsx                       |  17 +-
 app/dashboard/local/actions.ts                     |  25 ++-
 app/dashboard/local/campanas/[campaignId]/page.tsx |   4 +-
 .../local/campanas/nueva/NuevaCampanaForm.tsx      |   6 +-
 app/dashboard/local/campanas/nueva/page.tsx        |   9 +-
 app/dashboard/local/campanas/page.tsx              |   4 +-
 app/dashboard/local/page.tsx                       |   4 +-
 app/dashboard/local/puntos/[pointId]/page.tsx      |   2 +
 app/dashboard/local/puntos/actions.ts              |   2 +-
 app/dashboard/local/puntos/nuevo/page.tsx          |   5 +-
 app/dashboard/local/puntos/page.tsx                |   2 +
 app/dashboard/local/reportes/[reportId]/page.tsx   |   2 +
 app/dashboard/local/reportes/actions.ts            |   2 +
 app/dashboard/local/suscriptores/page.tsx          |   2 +
 app/dashboard/metrics/page.tsx                     |  14 +-
 app/dashboard/page.tsx                             |  28 +--
 app/dashboard/qr/[cardId]/page.tsx                 |  12 +-
 app/dashboard/users/actions.ts                     |   8 +
 app/dashboard/users/page.tsx                       |  10 +-
 app/superadmin/actions.ts                          |  26 ++-
 .../empresas/[companyId]/CompanyDetailClient.tsx   |  18 +-
 app/superadmin/empresas/nueva/page.tsx             |  14 +-
 app/superadmin/tarjetas/actions.ts                 |   4 +
 app/t/[token]/route.ts                             |  10 +-
 components/Sidebar.tsx                             |  15 +-
 components/local/PointForm.tsx                     |   3 +-
 components/local/ReportCenter.tsx                  |   2 +
 lib/local/access.ts                                |   9 +-
 lib/local/point-management.ts                      |  18 +-
 lib/local/point-resolver.ts                        |  10 +-
 lib/local/report-worker.ts                         |   6 +-
 lib/local/subscription.ts                          |   2 +
 lib/plans.ts                                       |   2 +
 lib/product-access.ts                              | 190 ++++-----------------
 lib/validations/local.ts                           |   1 +
 package.json                                       |   5 +-
 prisma/schema.prisma                               | 118 +++++++++++--
 scripts/tests/local-integration.test.ts            |   1 +
 56 files changed, 424 insertions(+), 362 deletions(-)
```

### Archivos nuevos

```text
app/dashboard/local/locales/actions.ts
app/dashboard/local/locales/page.tsx
docs/BLOCK_2_ENTITLEMENTS.md
lib/entitlements/catalog.ts
lib/entitlements/index.ts
lib/entitlements/license-input.ts
lib/entitlements/overrides.ts
lib/entitlements/resolve.ts
lib/local/locations.ts
prisma/migrations/20260917010000_commercial_catalog_entitlements/migration.sql
scripts/tests/entitlements-backfill.test.ts
scripts/tests/entitlements-integration.test.ts
scripts/tests/entitlements.test.ts
```
