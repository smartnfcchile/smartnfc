# Acciones públicas y tracking por acción (SmartNFC Local)

Bloques A (Action Builder) y B (tracking de acciones). Se apoya en la Identidad Local (`docs/local-location-identity.md`) y en la Landing Pública (`docs/local-landing.md`).

## Registro único

`lib/local/public-actions.ts` (módulo puro, usado por servidor, landing, editor y vistas previas):

| Tipo | Entrada | Validación |
|---|---|---|
| WHATSAPP | número (+ mensaje sugerido opcional) | teléfono normalizado; acepta pegar un `wa.me`. El enlace `https://wa.me/<dígitos>?text=` se construye en el servidor |
| PHONE | teléfono | normalizado a `+<dígitos>`; se abre como `tel:` |
| INSTAGRAM, FACEBOOK, TIKTOK, YOUTUBE, LINKEDIN, X, THREADS | enlace | HTTPS público **del dominio de la red** (el ícono nunca promete otra red) |
| GOOGLE_REVIEW | enlace | HTTPS de `g.page`, `goo.gl`, `google.com` o `google.cl` |
| WEB, MENU, PROMOTION, LOCATION, LINK | enlace | HTTPS público (`safeDestination`: sin credenciales, IP, localhost ni puertos) |

`ACTION_REGISTRY` define nombre, texto público por defecto (invita; nunca afirma "mensaje enviado", "reseña", "seguidor" ni "compra"), tipo de entrada y dominios. `ACTION_ICONS` (`components/local/public/action-icons.tsx`) asocia el ícono (Lucide o SVG de marca internos). Para un tipo nuevo: agregarlo a `PUBLIC_ACTION_TYPES`, `ACTION_REGISTRY` y `ACTION_ICONS`.

## Datos

- `LocalTouchpoint.actions` (JSONB, por defecto `[]`): `{ id, type, label, value, message, enabled }` en orden público. `id` estable generado en el editor (`[a-z0-9]{8,24}`); los ids del sistema (`primary`, `link-N`, `contact-*`) no pueden colisionar. Máximo 12.
- SMART_LANDING: todas sus acciones. Otros objetivos: acciones **adicionales** (se muestran solo en LANDING, debajo de la acción principal, que sigue siendo `destinationUrl`). CLUB: ninguna.
- Compatibilidad: un punto sin acciones guardadas se resuelve desde `destinationUrl`/`smartLinks` como siempre (ids `primary` y `link-N`). Al guardar un Smart Landing con acciones, `smartLinks` se reescribe como espejo (acciones visibles con destino https, máx. 6) para que cualquier lectura histórica o una versión anterior del código sigan funcionando.
- Lectura pública tolerante (`readStoredActions`): si una acción deja de validar (p. ej. una regla se endurece), se omite esa acción y el punto sigue funcionando. Ningún NFC/QR entregado queda inutilizable por un cambio de validación.

## Salidas: `/p/[code]/go`

- `?action=<id>&version=<n>&v=<visita>`: el servidor busca la acción en la configuración vigente (acciones del punto + contacto del Local) y redirige **solo** a su destino guardado; cualquier `url=` u otro parámetro se ignora. Versión distinta → 409. Id desconocido, oculto o con formato inválido → 404.
- `POST` (atributo HTML `ping` de los enlaces `tel:`): registra el clic y responde 204; el teléfono se abre directamente.
- `?index=N`: solo para páginas heredadas generadas antes de los ids (compatibilidad).

## Tracking honesto

| Momento | Registro | Significado |
|---|---|---|
| Toque/escaneo (`/t`, `/q`, `/p`) | `LocalVisit` + `NFC_SCAN`/`QR_SCAN`/`VIEW` | una visita por entrada |
| DIRECT de objetivo único | `WHATSAPP_REDIRECT` / `DESTINATION_REDIRECT` | salida automática al destino (no es un clic) |
| `/l` con `v` válido | `LANDING_VIEW` (una por visita) | la persona vio la página del local |
| Toque en un botón | `LocalActionClick` (`actionId`, `actionType`, `actionRole`, canal, objetivo, modo) — uno por visita y acción | tocó ese botón |
| Página de acciones heredada (Smart Landing DIRECT) | `LocalActionClick` + su `DESTINATION_REDIRECT` histórico | compatibilidad con reportes existentes |

- Un clic **no** confirma que se envió un mensaje, se publicó una reseña, se siguió una cuenta o hubo una compra.
- Los clics de LANDING ya no se registran como `WHATSAPP_REDIRECT`/`DESTINATION_REDIRECT`: DIRECT y LANDING no se mezclan en la misma métrica. Tasa útil de LANDING: clics en acciones / vistas de landing.
- Solo se atribuye a una visita reciente (1 h) del **mismo punto y objetivo**; una visita de otro punto o empresa nunca se atribuye. Sin `v` válido se redirige igual, sin registrar.
- Pendiente del bloque de analítica: el informe semanal actual cuenta visitas y salidas DIRECT; los clics de LANDING (`LocalActionClick`) se incorporan en el dashboard por períodos.

## Editor

`components/local/actions/ActionBuilder.tsx` dentro del formulario de puntos: agregar (selector con íconos por grupo), editar destino y texto, mensaje sugerido de WhatsApp, mostrar/ocultar, subir/bajar y eliminar. La vista previa móvil usa la misma resolución que el servidor (`resolvePointActions` + `toPublicActions`) y solo muestra acciones completas y válidas. El servidor vuelve a validar todo.

## Migración

`20260926120000_local_action_tracking`: `ALTER TYPE ... ADD VALUE 'LANDING_VIEW'`, `LocalTouchpoint.actions JSONB NOT NULL DEFAULT '[]'` (sin reescritura en PostgreSQL 11+) y tabla nueva `LocalActionClick`. Sin backfill ni cambios a datos existentes; rollback documentado en el SQL.

## Editores por objetivo (Bloque C)

El formulario de puntos (`components/local/PointForm.tsx`) muestra un editor según lo que el negocio quiere lograr. `destinationUrl` sigue siendo el destino principal (DIRECT y versiones anteriores lo leen sin cambios); los editores lo derivan de datos estructurados:

| Objetivo | Editor | Destino principal |
|---|---|---|
| WhatsApp | número + mensaje sugerido + texto del botón | `whatsappUrl(número, mensaje)`; se vuelve a editar sin pérdida con `whatsappFromUrl` |
| Redes sociales | Action Builder limitado a redes (orden, mostrar/ocultar) | la primera red visible; las demás se guardan como acciones. En DIRECT con varias redes se sugiere "Mostrar página del local" |
| Reseñas de Google | enlace de "Pedir reseñas" + texto del botón | el enlace (validado igual que en el registro) |
| Menú o catálogo | enlace web/PDF + texto del botón | el enlace |
| Promoción | enlace + texto del botón (contenido enriquecido: bloque D) | el enlace |
| Página con varias acciones | Action Builder completo | — |
| Club | sin cambios (siempre DIRECT) | — |

- `LocalTouchpoint.objectiveConfig` (JSONB, `{}` por defecto; migración `20260927120000_local_objective_config`): `{ ctaLabel }`. Lectura tolerante (`readObjectiveConfig`): contenido inválido = configuración vacía y texto por defecto. Club la ignora.
- Las reglas del objetivo para Google y Redes usan el registro de acciones (mismas reglas en editor y servidor). Solo amplían lo aceptado antes (p. ej. `m.facebook.com`); ningún punto existente queda inválido.
- En móvil el formulario tiene pestañas "Editar" / "Vista previa".
- Textos honestos: el editor aclara que SmartNFC registra el toque, no si el mensaje se envió, la reseña se publicó o la persona siguió la cuenta.

## Promociones (Bloque D)

`objectiveConfig.promotion` (sin migración nueva): `{ title, description, imageUrl, startDate, endDate }`. Las fechas son días `AAAA-MM-DD` en hora de Chile (`America/Santiago`, igual que los reportes), inicio y término inclusivos; ambas opcionales.

| Estado | Condición | Experiencia pública |
|---|---|---|
| Vigente | hoy dentro del período (o sin fechas) | DIRECT abre el destino; LANDING muestra identidad + contenido + botón |
| Programada | hoy < inicio | cualquier entrada (también DIRECT) va a `/l` con "Esta promoción comienza el …", sin botón |
| Terminada | hoy > término | igual, con "Esta promoción terminó.", sin botón |
| Desactivada | punto pausado o licencia inactiva | estado neutral "Punto Inteligente temporalmente inactivo" |

- Fuera de vigencia, `/go?action=primary` redirige a la página del local sin registrar clic ni salida. El historial (visitas, vistas, clics) se conserva y al cambiar las fechas el mismo código vuelve a funcionar.
- Imagen: se sube desde el editor por el mismo flujo controlado de identidad (`kind=promo`, carpeta `local-brand/<localId>/promo-*`) y al guardar se exige que pertenezca a la carpeta del Local del punto. En la landing solo se muestra si es HTTPS.
- El contenido de promoción solo se guarda en puntos de objetivo Promoción. Lectura tolerante por partes: una promoción inválida en la base se omite sin afectar el texto del botón ni el punto.
- Métricas honestas: visita, vista de la página (`LANDING_VIEW`) y clic en el botón. No se registran ni se infieren canjes ni ventas.
- Seguridad de subida (B-2): `/api/local/brand-upload` exige `content-length` y comprueba sesión, rol y Local operativo **antes** de leer el cuerpo.

## Club integrado (Bloque E)

El Club conserva su editor, su flujo de registro con consentimiento y su modo DIRECT; no se reconstruye. Se integra solo donde aporta:

- Identidad: la identidad publicada del Club (snapshot) tiene prioridad; la Identidad del Local completa logo, portada y dirección que el Club no definió (imágenes HTTPS del Local; nunca `LocalLocation.name`).
- Iconografía: la plantilla del Club usa Lucide y los SVG de marca del registro (sin emojis). El mensaje de error del formulario se anuncia con `role="alert"`.
- Estado inactivo: `/club/[slug]` y `/l/[code]` comparten `LocalInactiveState` ("Punto Inteligente temporalmente inactivo").
- Navegación: el formulario de puntos enlaza al editor del Club de la campaña.
- Tracking: sin cambios. `SUBSCRIPTION`, `WHATSAPP_REDIRECT` y `VCF_DOWNLOAD` del Club siguen siendo sus métricas propias (una suscripción sí es un resultado observable); la analítica por períodos las presenta junto a las demás sin duplicarlas.
