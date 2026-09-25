# Landing Pública SmartNFC Local

Motor reutilizable de experiencia pública para Puntos Inteligentes. No incluye Action Builder, ACTION_CLICK, dashboard de períodos, editores específicos, promoción avanzada, cambios al Club ni modo soporte.

## Modo de presentación

`LocalTouchpoint.presentationMode` (`LocalPointPresentationMode`: `DIRECT` | `LANDING`), por defecto `DIRECT`.
Migración `20260925120000_local_point_presentation_mode`: crea el enum y la columna con DEFAULT constante (sin reescritura en PostgreSQL 11+). Todos los puntos existentes quedan en DIRECT. Rollback: `ALTER TABLE "LocalTouchpoint" DROP COLUMN "presentationMode"; DROP TYPE "LocalPointPresentationMode";`.

| Objetivo | DIRECT | LANDING |
|---|---|---|
| GOOGLE_REVIEW, WHATSAPP, SOCIAL, PROMOTION, MENU | 302 inmediato al destino (sin cambios) | 302 a `/l/<code>?v=<visita>`; acción principal del objetivo |
| SMART_LANDING | HTML legado sin cambios | Landing nueva con los mismos `smartLinks` y el mismo `/go?index` |
| CLUB | Club publicado (sin cambios) | No permitido (validación) e ignorado si se forzara en la base |

Cambiar el modo es configuración: no cambia `code`, tokens NFC ni el QR.

## Rutas

- Entradas estables: `/t/[token]` (NFC), `/q/[code]` (QR), `/p/[code]` (directo). Registran la visita **una sola vez** (`LocalVisit` + NFC_SCAN/QR_SCAN/VIEW).
- `/l/[code]`: landing pública (Server Component, `noindex`, sin JavaScript). **No crea visitas ni eventos.** Solo valida `v` (visita del mismo punto, última hora) para adjuntarlo a los enlaces de acción. Sin `v` válido la página se muestra, pero no se inventa ni atribuye ninguna visita. Si el punto está en DIRECT (o es CLUB) redirige a `/p/<code>`; si no está disponible muestra el estado neutral.
- `/p/[code]/go?action=primary&version&v`: acción principal. Redirige solo a la URL guardada y validada del punto (parámetros como `url=` se ignoran), registra WHATSAPP_REDIRECT o DESTINATION_REDIRECT una vez por visita y responde 409 si la versión cambió. `/go?index=N` del Smart Landing no cambia.
- Teléfono, ubicación y web del Local se enlazan directo (`tel:` y HTTPS validados en el Bloque 1), sin registro de clics hasta el bloque de tracking.

## Acciones e íconos

- `lib/local/public-actions.ts`: `PublicAction { key, type, label, detail, href, order, enabled, external, group }`, `PUBLIC_ACTION_TYPES`, textos por defecto, deducción de tipo por dominio, `buildPointActions` (acciones del objetivo) y `buildContactActions` (identidad del Local). No se persiste; el Action Builder entregará `PublicAction[]`.
- `components/local/public/action-icons.tsx`: registro único tipo → ícono. Lucide para acciones genéricas; `brand-icons.tsx` con SVG internos de Simple Icons (CC0) para marcas; LinkedIn con monograma propio.

## Vista única

`LocalLandingView` compone identidad → acción principal → acciones secundarias → contacto → atribución. La usan `/l/[code]`, la vista previa del editor de identidad (`LocalIdentityPreview`) y la vista previa compacta del formulario de puntos. El texto de ayuda de vista previa (`emptyHint`) nunca aparece en la landing pública.

## Datos públicos

La landing muestra solo la identidad resuelta por `resolveLocalBrand` (Local → Campaña → Empresa) y las etiquetas de acción. Nunca muestra `point.name`, `point.location`, `campaign.name` ni `LocalLocation.name` (nombre interno). Las imágenes deben ser HTTPS.
