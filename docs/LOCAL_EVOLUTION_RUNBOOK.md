# Evolución SmartNFC Local — runbook de paso a entorno accesible y prueba NFC física

Rama `feat/local-location-identity` (base `main` = `6eb3a06`). Documentación funcional: `docs/local-location-identity.md`, `docs/local-landing.md`, `docs/local-actions.md`.

## Commits

| Commit | Contenido |
|---|---|
| `191d53e` | Identidad digital por Local (editor visual, subida controlada de imágenes) |
| `2c79046` | Landing pública y modo de presentación DIRECT/LANDING |
| `6fe7f9b` | Bloques A+B: Action Builder y tracking por acción |
| `e5ad10c` | Bloque C: editores por objetivo |
| `d1369bd` | Bloque D: promociones |
| `9cf43eb` | Bloque E: integración del Club |
| `9e0565c` | Bloque F: dashboard y analítica por períodos |
| `e27111d` | Bloque G: soporte SuperAdmin de solo lectura |
| (siguiente) | Bloque H: hardening, M-2/B-1/B-3, accesibilidad, este runbook |

## Migraciones

Ya aplicadas en Neon (según verificación del usuario antes de esta evolución): `20260923120000_local_location_brand`, `20260925120000_local_point_presentation_mode`.

**Pendientes para Neon (requieren autorización expresa):**

1. `20260926120000_local_action_tracking` — `ALTER TYPE "LocalEventType" ADD VALUE 'LANDING_VIEW'`; `LocalTouchpoint.actions JSONB NOT NULL DEFAULT '[]'`; tabla nueva `LocalActionClick` con índices y FKs.
2. `20260927120000_local_objective_config` — `LocalTouchpoint.objectiveConfig JSONB NOT NULL DEFAULT '{}'`.

Ambas son aditivas: DEFAULT constante (sin reescritura en PostgreSQL 11+), tabla nueva vacía, sin backfill ni cambios a datos, códigos o tokens. Bloqueos: `ALTER TABLE ... ADD COLUMN` toma un lock breve de `LocalTouchpoint`; las FKs de la tabla nueva toman `SHARE ROW EXCLUSIVE` breve sobre las tablas referenciadas. Rollback documentado en cada `migration.sql` (el valor de enum no se puede quitar; queda sin uso). Probadas en PostgreSQL 18 desechable local, incluso sobre datos existentes (los puntos quedan con `actions = []` y `objectiveConfig = {}` y siguen resolviéndose igual).

Orden recomendado: aplicar las migraciones **antes** de desplegar el código (el código anterior ignora las columnas nuevas; el nuevo las necesita).

```
# Con autorización, desde un entorno con la URL de Neon correspondiente (nunca en desarrollo):
npx prisma migrate status
npx prisma migrate deploy
npx prisma migrate status   # debe indicar "Database schema is up to date"
```

## Compatibilidad garantizada

- Todos los puntos existentes quedan en DIRECT y sin acciones guardadas: su comportamiento no cambia al desplegar.
- `/t/[token]`, `/q/[code]`, `/p/[code]` siguen resolviendo el punto vigente; cambiar objetivo, modo, acciones o promoción no cambia códigos ni tokens (cubierto por pruebas).
- La lectura pública de acciones y configuración es tolerante: una regla que se endurezca omite el dato inválido sin dejar un punto inutilizable.

## Paso a un entorno accesible desde un teléfono

Importante: fuera de desarrollo `lib/public-url.ts` fija el origen público en `https://www.smartnfc.cl`. Las entradas `/t`, `/q` y `/p` redirigen a la landing con URL absoluta a ese dominio. Por eso un *preview* de Vercel redirigiría la landing a producción. Hay dos caminos:

**Camino A (recomendado, riesgo bajo):** producción con puntos existentes intactos.
1. Revisión humana del PR `feat/local-location-identity` → `main` (los archivos `app/superadmin/actions.ts` y `app/superadmin/tarjetas/TarjetasClient.tsx` no forman parte de estos commits).
2. Autorizar y aplicar las dos migraciones pendientes en Neon (sección anterior).
3. Autorizar merge y deploy.
4. Verificar: `/dashboard/local`, un punto existente en DIRECT sigue igual (QR y NFC), `/superadmin/locales/<id>`.
5. Realizar la prueba NFC física sobre **un punto de prueba** (no de un cliente).

**Camino B (preview aislado):** requiere una decisión previa: permitir que en `VERCEL_ENV=preview` el origen público sea la URL del preview (cambio pequeño en `lib/public-url.ts`) y usar una rama de Neon (copia) con las migraciones aplicadas, un store de Blob de preview y valores de correo aislados. Las tarjetas físicas existentes apuntan a producción, así que en este camino se usa una tarjeta o QR de prueba grabado con la URL del preview.

## Prueba NFC física (checklist)

Con un punto y una tarjeta de prueba de una empresa de prueba:

1. Punto en **Abrir directamente** (DIRECT), objetivo p. ej. WhatsApp.
2. Tocar la tarjeta con el teléfono → debe abrir el destino (WhatsApp con el mensaje sugerido).
3. En el dashboard: cambiar el mismo punto a **Mostrar página del local** (LANDING). No reprogramar la tarjeta.
4. Volver a tocar → debe abrir `/l/<código>` con la identidad del local.
5. Tocar la acción principal y una acción adicional → deben abrir sus destinos.
6. Tocar "Llamar" → debe abrir el marcador (el clic se registra con `ping`).
7. Dashboard del local, período "Hoy": 2 accesos NFC, 1 vista de página, clics por acción; 1 salida directa (del paso 2).
8. Escanear el QR del mismo punto → mismo comportamiento, contado como QR.
9. Pausar el punto → la tarjeta muestra "Punto Inteligente temporalmente inactivo"; reactivar → vuelve a funcionar con la misma tarjeta.

## Deuda restante

**DEBE CORREGIRSE:** ninguna deuda bloqueante detectada en esta evolución. Antes de producción solo quedan los checkpoints humanos (revisión, migraciones en Neon, deploy, prueba NFC física).

**RECOMENDADO:**
- Quitar metadatos EXIF (posible ubicación GPS) de imágenes subidas normalizando la orientación: requiere agregar `sharp` como dependencia directa (hoy solo llega de forma transitiva).
- Limpieza de imágenes de Blob reemplazadas o no guardadas (huérfanas).
- Incorporar vistas de página y clics de acciones al informe automático semanal/mensual (hoy están en el dashboard).
- Decidir el origen público en previews (Camino B) si se quieren pruebas previas a producción.
- Preexistente fuera de Local: el layout del dashboard no declara `<main>` y el enlace del logo no tiene nombre accesible; el menú de SuperAdmin usa emojis como íconos.
- Resuelto: la página HTML heredada de Smart Landing se retiró; todo Smart Landing se muestra como Página del Local. Preexistente: `/api/local/events/view` acepta `WHATSAPP_REDIRECT` enviado por el navegador del Club.

**DEUDA ACEPTABLE:**
- Un enlace `/l/...?v=` compartido atribuye los clics a la visita original durante 1 hora (sin duplicar eventos).
- En Redes, la acción `primary` es la primera red visible; si se reordena, `actionId = primary` cambia de red (el `actionType` registrado sigue siendo exacto).
- `/go` no tiene límite de frecuencia propio: las escrituras están acotadas por visita y acción; las visitas sí tienen límite.
- `/t/<token>` inexistente responde 404 (no es un estado comercial).
- Dos avisos de ESLint preexistentes (`any`) en `app/club/[slug]/page.tsx`.
