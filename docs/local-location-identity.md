# Identidad digital del Local (Bloque 1)

Rama: `feat/local-location-identity`. No cambia objetivos, Puntos Inteligentes, tracking, rutas `/p` `/q` `/t`, Club, campañas, dashboard ni Superadmin.

## Qué agrega

- `LocalLocation` con campos opcionales: `displayName`, `logoUrl`, `coverImageUrl`, `shortDescription`, `primaryColor`, `secondaryColor`, `phone`, `websiteUrl`, `mapsUrl`, `brandUpdatedAt`.
- Migración `20260923120000_local_location_brand`: solo `ADD COLUMN` nullables, sin defaults ni backfill. Rollback documentado en el propio SQL. Debe aplicarse después de `20260917010000_commercial_catalog_entitlements` (Bloque 2).
- **Mis locales** muestra cada local como tarjeta con su identidad y abre el editor visual `/dashboard/local/locales/[locationId]` (configuración a la izquierda, vista previa móvil en vivo a la derecha; en móvil, pestañas Editar / Vista previa).

## Resolución de identidad (única fuente)

`lib/local/brand.ts → resolveLocalBrand({ location, campaign?, company })`

| Campo | Orden |
|---|---|
| Nombre comercial | Local.displayName → Campaña.businessName → Company.name → "Mi local" |
| Logo | Local → Campaña.logoUrl |
| Portada | Local → Campaña.heroImageUrl |
| Colores | Local → Campaña → #2563eb / #0f172a |
| Dirección | Local.address → Campaña.address |
| Descripción, teléfono, web, mapa | Solo Local |

`LocalLocation.name` es un nombre interno/administrativo (visible solo en el dashboard) y nunca se usa como nombre público ni como fallback público.

El texto sobre el color principal se elige automáticamente (blanco u oscuro) por contraste WCAG. El Club conserva sus propios campos; su integración formal es el Bloque 9. No se copia nada desde campañas.

## Componentes reutilizables

`components/local/public/`: `LocalPublicShell`, `LocalBrandHeader`, `LocalActionLink`, `LocalContactActions`, `LocalIdentityPreview`. Son de presentación pura (sin estado). Desde la Landing Pública, la composición única es `LocalLandingView` (ver `docs/local-landing.md`). `components/local/brand/` contiene piezas exclusivas del editor.

## Seguridad

- Guardado (`saveLocationIdentity`): sesión revalidada, rol administrador, empresa propia, `LOCAL_ACCESS` y producto Local operativo; el local debe pertenecer a la empresa. Control de concurrencia optimista con `brandUpdatedAt` y registro `LOCATION_IDENTITY_UPDATE` en `AdminAuditLog`.
- Subida (`POST /api/local/brand-upload`, multipart): se procesa en el servidor con `put()` de Vercel Blob (`lib/local/brand-upload.ts`). No usa token de cliente, `onUploadCompleted` ni `callbackUrl`, así que funciona igual en local y en Vercel. Exige las mismas reglas de autorización, solo acepta mismo origen, máximo 4 MB (bajo el límite de 4,5 MB de las funciones de Vercel), y detecta PNG/JPG/WEBP por el contenido real del archivo (sin SVG). El servidor decide la ruta `local-brand/<localId>/(logo|cover)-<sufijo>.<ext>` y verifica la URL devuelta. Los errores devuelven `{ error: { code, message } }` (`FORBIDDEN`, `FILE_TOO_LARGE`, `UNSUPPORTED_TYPE`, `STORAGE_NOT_CONFIGURED`, `STORAGE_ACCESS`, `STORAGE_FAILED`, `INVALID_REQUEST`) y el editor muestra el mensaje correspondiente; "revisa tu conexión" solo aparece ante un fallo de red real. Requiere `BLOB_READ_WRITE_TOKEN` en el entorno y lo pasa explícitamente a `put()`: sin eso, `@vercel/blob` 2.x prioriza OIDC (`VERCEL_OIDC_TOKEN`) + `BLOB_STORE_ID` si están presentes, lo que en desarrollo local puede apuntar a otro contexto (`BlobStoreNotFoundError`). `BLOB_STORE_ID` no se usa. Ante fallos se registra `LOCAL_BRAND_UPLOAD_FAILED` con diagnóstico sin secretos (presencia y largo del token, store id parcial, coherencia con `BLOB_STORE_ID`, presencia de OIDC). El endpoint genérico `/api/blob/upload` no se modificó.
- URLs de imagen aceptadas solo si son HTTPS de `*.public.blob.vercel-storage.com` dentro de la carpeta del propio local. Se rechazan `data:`, `javascript:`, `http:`, hosts externos y rutas de otros locales.
- Web y mapa usan `safeDestination` (HTTPS público). El teléfono se normaliza a `+<dígitos>`.

## Pruebas

`scripts/tests/local-brand.test.ts` (incluida en `npm run test:local`): validación de URLs, rutas de subida, teléfono, colores, fallback, contraste y, con `LOCAL_TEST_DATABASE_URL` loopback, autorización, aislamiento entre empresas, colaborador, empresa sin Local, concurrencia y no alteración de campañas.
