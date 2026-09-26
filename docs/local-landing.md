# Landing Pública SmartNFC Local

Motor reutilizable de experiencia pública para Puntos Inteligentes. Las acciones configurables y el tracking por acción se documentan en `docs/local-actions.md`. No incluye dashboard de períodos, editores específicos, promoción avanzada, cambios al Club ni modo soporte.

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
- `/l/[code]`: landing pública (Server Component, `noindex`; sin componentes de cliente propios, aunque Next carga su runtime). **No crea visitas.** Con `v` válido (visita del mismo punto, última hora) registra un `LANDING_VIEW` por visita y adjunta `v` a los enlaces de acción. Sin `v` válido la página se muestra, pero no se inventa ni atribuye ninguna visita. Si el punto está en DIRECT (o es CLUB) redirige a `/p/<code>`; si no está disponible muestra el estado neutral. El punto se lee una sola vez por request (`React.cache`) para metadata y página.
- `/p/[code]/go?action=<id>&version&v`: salida por una acción (principal `primary`, enlaces heredados `link-N`, acciones guardadas o contacto `contact-*`). Redirige solo al destino guardado y validado (parámetros como `url=` se ignoran), registra un `LocalActionClick` por visita y acción y responde 409 si la versión cambió. Los clics de LANDING no se registran como WHATSAPP_REDIRECT/DESTINATION_REDIRECT (esas quedan para las salidas DIRECT). `/go?index=N` se mantiene para páginas heredadas ya abiertas.
- Teléfono, ubicación y web del Local también registran su clic: ubicación y web pasan por `/go?action=contact-*`; el teléfono se abre directo (`tel:`) y registra el clic con el atributo `ping`.

## Acciones e íconos

- `lib/local/public-actions.ts`: registro único de tipos (`ACTION_REGISTRY`), validación, resolución (`resolvePointActions`, `resolveContactActions`) y presentación (`toPublicActions` → `PublicAction { key, type, label, detail, href, ping, order, enabled, external, group }`). Ver `docs/local-actions.md`.
- `components/local/public/action-icons.tsx`: registro único tipo → ícono. Lucide para acciones genéricas; `brand-icons.tsx` con SVG internos de Simple Icons (CC0) para marcas; LinkedIn con monograma propio.

## Vista única

`LocalLandingView` compone identidad → acción principal → acciones secundarias → contacto → atribución. La usan `/l/[code]`, la vista previa del editor de identidad (`LocalIdentityPreview`) y la vista previa compacta del formulario de puntos. El texto de ayuda de vista previa (`emptyHint`) nunca aparece en la landing pública.

## Datos públicos

La landing muestra solo la identidad resuelta por `resolveLocalBrand` (Local → Campaña → Empresa) y las etiquetas de acción. Nunca muestra `point.name`, `point.location`, `campaign.name` ni `LocalLocation.name` (nombre interno). Las imágenes deben ser HTTPS.
