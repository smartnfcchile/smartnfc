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
- `?index=N`: solo para páginas de acciones heredadas que sigan abiertas (compatibilidad; conserva su evento histórico).

## Tracking honesto

| Momento | Registro | Significado |
|---|---|---|
| Toque/escaneo (`/t`, `/q`, `/p`) | `LocalVisit` + `NFC_SCAN`/`QR_SCAN`/`VIEW` | una visita por entrada |
| DIRECT de objetivo único | `WHATSAPP_REDIRECT` / `DESTINATION_REDIRECT` | salida automática al destino (no es un clic) |
| `/l` con `v` válido | `LANDING_VIEW` (una por visita) | la persona vio la página del local |
| Toque en un botón | `LocalActionClick` (`actionId`, `actionType`, `actionRole`, canal, objetivo, modo) — uno por visita y acción | tocó ese botón |
| Smart Landing (siempre Página del Local) | `LANDING_VIEW` + `LocalActionClick` | igual que LANDING; ya no existe la página heredada ni su salida `DESTINATION_REDIRECT` |

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
- Seguridad de subida (B-2): `/api/local/brand-upload` exige `content-length` y comprueba sesión, rol y Local operativo **antes** de leer el cuerpo. Además limita las subidas a 30 cada 10 minutos por usuario (`LOCAL_BRAND_UPLOAD`, respuesta 429 con mensaje claro).

## Club integrado (Bloque E)

El Club conserva su editor, su flujo de registro con consentimiento y su modo DIRECT; no se reconstruye. Se integra solo donde aporta:

- Identidad: la identidad publicada del Club (snapshot) tiene prioridad; la Identidad del Local completa logo, portada y dirección que el Club no definió (imágenes HTTPS del Local; nunca `LocalLocation.name`).
- Iconografía: la plantilla del Club usa Lucide y los SVG de marca del registro (sin emojis). El mensaje de error del formulario se anuncia con `role="alert"`.
- Estado inactivo: `/club/[slug]` y `/l/[code]` comparten `LocalInactiveState` ("Punto Inteligente temporalmente inactivo").
- Navegación: el formulario de puntos enlaza al editor del Club de la campaña.
- Tracking: sin cambios. `SUBSCRIPTION`, `WHATSAPP_REDIRECT` y `VCF_DOWNLOAD` del Club siguen siendo sus métricas propias (una suscripción sí es un resultado observable); la analítica por períodos las presenta junto a las demás sin duplicarlas.

## Dashboard y analítica actual (Bloque F)

`/dashboard/local` deja de limitarse a la última semana cerrada. Requiere, como antes, la capacidad `LOCAL_REPORTS` en el servidor (sin ella se informa que los datos se conservan). Ya no exige tener configurado el envío automático de reportes.

- Períodos (`lib/local/analytics-period.ts`, hora de Chile): Hoy, Esta semana (por defecto), Última semana, Este mes y Personalizado (días inclusivos, sin días futuros, máximo 366). La comparación usa el **mismo tramo** del período anterior (p. ej. esta semana hasta ahora contra la semana pasada hasta el mismo momento), nunca un período parcial contra uno completo.
- Métricas (`lib/local/analytics.ts`, siempre filtradas por empresa):

| Métrica | Fuente | Significado |
|---|---|---|
| Accesos (NFC / QR / enlace) | `LocalVisit` | una visita, no una persona única |
| Vistas de la página del local | `LANDING_VIEW` | la persona vio la página |
| Clics en acciones | `LocalActionClick` | tocó un botón; no confirma mensaje, reseña, seguimiento ni compra |
| Salidas directas | `WHATSAPP_REDIRECT`/`DESTINATION_REDIRECT` de puntos no Club | salida automática en DIRECT |
| Nuevas suscripciones al Club | `LocalSubscriber.firstSubscribedAt` | resultado observable (registro con consentimiento) |
| Club: confirmaciones por WhatsApp abiertas y contactos guardados | eventos del Club | se muestran aparte, no como salidas directas |

- "Clics por cada 100 vistas de página" se muestra solo con vistas de página; no se llama "conversión".
- Evolución diaria (días de Chile, agrupados en SQL parametrizado con límites convertidos a UTC), puntos más usados, acciones más tocadas por tipo, accesos por objetivo y por local. El gráfico tiene tooltip por barra (cursor y teclado) y vista de tabla.
- Se advierte si hubo incidencias de medición en el período. Cero actividad registrada no se presenta como ausencia de visitantes.
- Los informes automáticos semanales/mensuales conservan su formato histórico en "Reportes automáticos".

## Soporte SuperAdmin (Bloque G, fase A: solo lectura)

`/superadmin/locales/[companyId]` (enlace "Soporte" en el listado de Locales de SuperAdmin):

- `requireSuperAdmin()` revalida la sesión contra la base; toda consulta se filtra por el `companyId` solicitado (`lib/local/support.ts`). Ids inválidos o inexistentes → 404.
- Muestra licencia Local, operación y capacidades; locales con su identidad resuelta y nombre interno; puntos con objetivo, modo, estado, soporte, código, versión, acciones guardadas y destino (solo dominio); NFC física vinculada con estado y los últimos 4 caracteres del token (nunca el token completo; una tarjeta de otra empresa no se muestra aunque estuviera mal vinculada); analítica del período con la misma vista del dashboard (`LocalAnalyticsView`).
- Sin suplantación, sin edición cross-tenant ni acciones administrativas sobre datos del cliente. No enlaza `/p`, `/q` ni `/t` del cliente para no registrar visitas en su analítica.
- Auditoría: `AdminAuditLog` con `action = LOCAL_SUPPORT_VIEW` (dato de la plataforma, no del cliente), como máximo uno cada 10 minutos por SuperAdmin y empresa.
- Los archivos `app/superadmin/actions.ts` y `app/superadmin/tarjetas/TarjetasClient.tsx` (cambios locales ajenos) no se modificaron.

## Guardar contacto, identidad de marca y CONTACTO sin duplicados

### Guardar contacto (vCard)
- En CONTACTO de la Página del Local aparece primero "Guardar contacto · Agrégalo a tu teléfono" cuando hay algo útil que guardar además del nombre (teléfono, WhatsApp, correo, web, redes o dirección). Sin datos útiles no se muestra.
- Enlace `/p/<code>/go?action=contact-save&version&v`: el servidor genera la vCard al vuelo (no se almacenan archivos), `text/vcard; charset=utf-8`, adjunto con nombre sanitizado (`cafe-nandu.vcf` + `filename*` UTF-8), `nosniff` y `no-store`.
- Contenido (`localContactCard` + `generateBusinessVcf` en `lib/vcf.ts`): solo la identidad pública efectiva del Local (nombre comercial como FN/ORG, descripción, dirección, teléfono, web, mapa) y los medios de contacto de las acciones visibles del punto (WhatsApp con etiqueta, correo, redes). Nunca nombres internos ni datos de otra empresa. No se agregaron campos al modelo: `LocalLocation` no tiene correo; el correo solo existe si el punto tiene una acción Correo.
- vCard 3.0 con CRLF, escape de `\ , ;`, saltos de línea neutralizados (no se puede inyectar otra tarjeta) y líneas plegadas a 75 octetos sin partir caracteres UTF-8 (tildes, ñ). Las utilidades existentes de tarjetas, leads y Club no cambian.
- Tracking honesto: `LocalActionClick` con `actionType = SAVE_CONTACT` (un clic por visita). El navegador no confirma que el contacto quedó guardado: el dashboard muestra "Clics en Guardar contacto". Sin migración (`actionType` es texto).

### Correo
Tipo de acción `EMAIL` en el Action Builder (grupo "Mensajes y contacto"): correo validado y normalizado (sin espacios, saltos de línea ni parámetros), `mailto:` directo con `ping` para registrar el clic, igual que `tel:`.

### Identidad visual de marcas y servicios
Registro único `ACTION_VISUALS` + componente `ActionGlyph` (`components/local/public/action-icons.tsx`), usado por la Página del Local, todas las vistas previas, el Action Builder y el dashboard. La marca se aplica al ícono y su contenedor; la tarjeta conserva el diseño limpio.

| Tipo | Identidad |
|---|---|
| WhatsApp | verde #25D366, glifo blanco |
| Instagram | degradado característico, glifo blanco |
| Facebook | azul #1877F2 |
| YouTube | rojo #FF0000 |
| LinkedIn | azul #0A66C2 |
| X, Threads | negro |
| TikTok | negro con acentos cian/rojo |
| Reseñas de Google | "G" multicolor sobre blanco |
| Web, menú, promoción, ubicación, teléfono, correo, enlace, Guardar contacto | color del Local (sin marca propia) |

En la acción principal (botón relleno con el color del Local) el contenedor de marca lleva un aro claro. Íconos de marca: SVG internos (sin emojis ni dependencias nuevas). Los íconos son decorativos (`aria-hidden`); el texto del botón identifica la acción.

### CONTACTO sin duplicados (solo presentación)
`dedupeContactActions` / `landingActions` (`lib/local/public-actions.ts`): un elemento automático de CONTACTO se oculta si una acción visible del punto cumple la **misma función** (teléfono, ubicación, web, correo) y lleva al **mismo destino normalizado**:
- teléfonos por su número normalizado (`+56 9 1234-5678` = `+56912345678`);
- URLs sin `www.`, sin barra final, sin fragmento y sin parámetros de seguimiento (`utm_*`, `fbclid`, `gclid`, `igshid`, …); otros parámetros se conservan y distinguen destinos.
- WhatsApp no reemplaza "Llamar" (otra función). "Guardar contacto" nunca se oculta.
No cambia datos ni rutas: `/go` sigue resolviendo los elementos ocultos (enlaces ya abiertos).
