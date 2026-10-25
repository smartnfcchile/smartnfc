# Georreferenciación de instalaciones — Misión 5

## Auditoría (25 octubre 2026)

Base: `da2ceb8a020a6a623e6410c6431210998a25d7fb` de `smartnfcchile/smartnfc`, rama `main`.
El lockfile instala Next.js 16.3.2, React 19.2.4, Prisma 6.19.3, NextAuth 4; PostgreSQL en Neon, despliegue Vercel. No había biblioteca geográfica instalada.

Relaciones existentes:

- `Company → LocalLocation → LocalCampaign → LocalTouchpoint`. La campaña también tiene companyId; el punto hereda su cuenta de ella.
- `Company → User → Card` es la identidad digital de Personas/Empresas. No se identificó un modelo físico separado de Personas: las líneas comparten perfiles y soportes.
- `PhysicalNfcCard` pertenece a Company y se vincula a Card o LocalTouchpoint. Un punto Local puede ofrecer NFC, QR o ambos. El QR utiliza el code del punto, no una entidad geográfica.
- `Card.location`, `LocalTouchpoint.location` y `LocalLocation.address/mapsUrl` son datos descriptivos/de contacto. Ninguno es la coordenada fija del soporte. Se conservan.
- Administración Local: `app/dashboard/local/puntos`, `components/local/PointForm.tsx`, `lib/local/point-management.ts`. Soportes: `app/superadmin/tarjetas`, administración de perfiles en `app/dashboard/cards`.
- Destinos: `/t/[token]`, `/q/[code]`, `/p/[code]`, `/l/[code]`, resolutor `lib/local/point-resolver.ts`. No se modifican.
- `lib/permissions.ts` revalida usuario, cuenta activa y rol desde BD por solicitud. Las nuevas APIs reutilizan esa comprobación, nunca companyId enviado por cliente.
- Existían pruebas con node:test/tsx y tres workflows de GitHub; no existía suite Playwright. Se conserva el guard de aislamiento implementado tras el incidente H4 del repositorio.

Vercel: `smartnfc` (`prj_2NPtSbRdsDqaruCGeZbxkZUSdLZy`) sirve smartnfc.cl/www.smartnfc.cl; `smartnfc-8ndu` (`prj_IVelBx3GxbBYvQRAhF4HUMr0WNfY`) tiene dominios Vercel. Ambos mostraban producción READY del mismo momento. Se confirmó en el despliegue principal origen Git/main y SHA de base. Las variables DATABASE_URL/DIRECT_URL del principal tenían targets compartidos production/preview: eso no demuestra aislamiento. No se descifraron sus valores.

Neon: proyecto `jolly-hall-38487506`, PostgreSQL 17, organización plan `free`, primary `production`, development archivada. La migración local se probó en PostgreSQL desechable con datos ficticios, no sobre esas ramas. Tras autorización de base de pruebas sin cargos se creó `preview-point-georeferencing` (`br-gentle-frog-aqdakg8k`) desde development, y dentro una base nueva vacía `geolocation_preview` con rol propio. Esa base es la única candidata para el preview. No usar la BD heredada de la rama.

Riesgos: dos proyectos pueden reaccionar a una rama; `vercel.json` cancela despliegues automáticos de esta rama hasta configurar aislamiento. No cambiar variables productivas ni fusionar main. El build normal NO ejecuta migraciones. Las migraciones existentes contienen triggers y backfills: usar el historial completo, nunca db push. Dependencias preexistentes reportan vulnerabilidades; no aplicar actualizaciones mayores indiscriminadas dentro de esta misión.

## Arquitectura y archivos

`PointGeolocation` es opcional y relaciona exactamente un LocalTouchpoint o PhysicalNfcCard mediante FK única. CHECK SQL exige un propietario, rangos WGS84 y precisión finita acotada. No modifica registros actuales ni exige coordenadas retroactivas. La ausencia de relación significa PENDING; presencia CONFIGURED. Float PostgreSQL conserva precisión suficiente; no hay consultas de proximidad que justifiquen PostGIS.

Incluye latitud, longitud, referencia, dirección opcional, precisión estimada opcional, método MANUAL/MAP/ADDRESS, fechas y actor de modificación. Visibilidad PRIVATE es el único valor admitido en esta versión. No existe endpoint público ni se carga esta relación en resolutores públicos. No se publica el domicilio de personas ni instalaciones sensibles. La ubicación de una tarjeta asociada a un punto Local se resuelve al punto: NFC y QR comparten una instalación. Una tarjeta no vinculada a Local tiene instalación propia. Al cambiar vínculos, la instalación pertenece al soporte/punto original; no se mueve con el destino digital.

Servicio: `lib/geolocation/{validation,service,http}.ts`. Escrituras y auditoría se hacen en una transacción con lock por empresa. El audit registra actor, entidad y acción, sin coordenadas/direcciones históricas; eliminar ubicación elimina esos datos. El modelo sigue el patrón de actor textual del audit existente. Conflictos entre dos administradores siguen política de última escritura; no se ofrece edición colaborativa.

UI: `components/geolocation/InstallationEditor.tsx` y `InstallationMap.tsx`, mapa importado solo en cliente. Editor integrado bajo el formulario de punto existente; Personas/Empresas acceden por Instalaciones NFC dentro del dashboard. Listas paginadas y estados pendientes explícitos. Campos permiten edición con teclado; Leaflet tiene navegación por teclado, estados de error y botones accesibles. No se llama a navigator.geolocation.

## API privada

`/api/point-locations/{kind}/{pointId}`: kind `local` o `physical`.

- GET devuelve `{status:"PENDING"}` o `{status:"CONFIGURED",latitude,longitude,address,label,accuracyMeters,method,visibility,updatedAt}`.
- PUT reemplaza la ubicación: JSON con latitude/longitude numéricas finitas obligatorias; address ≤300, label ≤120, accuracyMeters 0–100000, method MANUAL/MAP/ADDRESS y visibility PRIVATE opcionales.
- DELETE elimina ubicación de forma idempotente. Nunca altera token, code, destinationUrl, slug ni configuración del punto.
- POST `/api/point-locations/search`: `{kind,pointId,query}`. Consulta explícita de 3–200 caracteres; hasta cinco resultados, timeout 5s, límite persistente de 20 búsquedas/minuto por usuario/cuenta. Usa Geoapify en servidor y solo devuelve coordenadas/dirección necesarias.

401 sin sesión; 403 rol/origen no permitido; 404 inexistente o ajeno (sin revelar existencia); 400 datos inválidos; 413 tamaño excesivo; 415 formato incorrecto; 429 cuota interna; 503 proveedor sin configurar; 502 fallo del proveedor; 500 error interno sin detalles. Respuestas `private,no-store`. PUT/DELETE/search exigen Origin igual al origen de la solicitud. No se acepta companyId/actor desde cliente. Lecturas y escrituras están limitadas a la propia cuenta incluso para SUPERADMIN. No se incluye un listado geográfico público; las listas administrativas paginadas existentes pueden extenderse en el futuro con filtros territoriales.

## Mapas y costos

Se elige Leaflet 1.9.4 (BSD-2-Clause): raster, ligero y apropiado para un marcador, sin WebGL. MapLibre GL JS (BSD-3-Clause) es útil para vectores/capas densas/3D pero añade complejidad innecesaria en este MVP. Ambos requieren proveedor y geocodificador separado; se cargan en cliente para evitar SSR del DOM. Geoapify proporciona tiles y búsqueda con la misma plataforma.

Geoapify Free permite uso comercial con atribución dentro de 3000 créditos diarios; un tile cuesta 0.25 créditos y una búsqueda 1. Estimación: 100 aperturas/día ×20 tiles +100 búsquedas ≈600 créditos/día; movimientos/zoom elevan consumo. No contratar ni activar overages. Configurar claves con restricciones por dominio, límites y alertas; una clave de tiles publicada no es un secreto y debe restringirse. Fuentes consultadas el 25-10-2026: https://www.geoapify.com/pricing/ y https://www.geoapify.com/pricing-details/ . No se garantiza cuota futura ni coste cero si se contrata otro plan.

Variables nuevas: `NEXT_PUBLIC_GEOAPIFY_MAP_KEY` para tiles y `GEOAPIFY_API_KEY` solo servidor para búsqueda. Configurarlas directamente en Vercel, nunca en código/PR. No se contrató proveedor. Sin claves, las coordenadas y el CRUD funcionan y la UI comunica la limitación; no considerar validada la búsqueda real ni el mapa base hasta configurarlas. La cuadrícula Leaflet no sustituye un mapa cartográfico en la aceptación.

MapTiler Free es para pruebas/no comercial; requiere plan apropiado para SaaS (https://www.maptiler.com/cloud/pricing/ y https://www.maptiler.com/terms/cloud/). Tiles/Nominatim públicos OSM no constituyen un backend comercial ilimitado ni SLA; no se usan como fallback silencioso (https://operations.osmfoundation.org/policies/tiles/ y https://operations.osmfoundation.org/policies/nominatim/). No hay autocompletado que genere consultas por tecla.

## Seguridad y privacidad Chile

Al 25-10-2026 se aplica la Ley 19.628 vigente; Ley 21.719 entra en vigor el 1-12-2026 según BCN: https://www.bcn.cl/leychile/Navegar?idNorma=1209272&idParte=10527471&idVersion=2026-12-01 . Preparar inventario y finalidad del tratamiento, base jurídica aplicable, aviso transparente, minimización, control de acceso y procedimiento para acceso/rectificación/eliminación y seguridad. Fuente normativa vigente: https://www.bcn.cl/leychile/navegar?idNorma=141599 . Coordenadas de un domicilio identificable pueden ser datos personales; la etiqueta comercial no elimina esa condición.

La ubicación fija la administra la cuenta, no se obtiene del visitante. No hay GPS de visitantes, monitoreo individual, rescate ni módulos institucionales. Las métricas NFC/QR actuales conservan su comportamiento. La búsqueda de dirección transmite voluntariamente el texto al proveedor y la carga del mapa transmite solicitudes de tiles (incluyendo dirección IP del administrador y área visualizada): revisar sus términos/transferencias y el aviso de privacidad antes de activar claves. La atribución aparece en mapa y resultados.

## Validación y operación

Ejecutar con PostgreSQL local/CI desechable; suites cargan el guard como primera instrucción y la integración falla cerrada si falta GEOLOCATION_TEST_DATABASE_URL con nombre `geolocation_disposable`. Nunca apuntar pruebas a Neon.

```
npx prisma migrate deploy
npx tsx --test scripts/tests/geolocation.test.ts scripts/tests/geolocation-integration.test.ts
npm run build
npm run start
npx playwright test --config playwright.geolocation.config.ts
```

Evidencia local: las 25 migraciones se aplicaron desde cero; 5 pruebas unitarias/integración aprobadas sin omisiones; 62 de regresión aprobadas (validación, Locales, Personas, Empresas, privacidad y guard de aislamiento); Playwright 2/2 aprobadas en escritorio 1280×900 y móvil 390×844 con login real y PostgreSQL real. CRUD por mapa/cuadrícula y coordenadas, recarga, eliminación, rol/cuenta, API sin autenticación, CSRF, privacidad y destino QR. Build productivo exitoso. Primeras ejecuciones E2E detectaron selector de login y limpieza incompleta de fixture; se corrigieron y se repitió hasta verde. No afirmar cobertura completa de todos los flujos de negocio ni del proveedor externo. CI incorpora PostgreSQL 17 y el mismo flujo.

## Manual de administradores

1. Locales: abrir Puntos Inteligentes → Editar punto → Ubicación de instalación. Para Personas/Empresas: Instalaciones NFC → Administrar ubicación.
2. Buscar dirección (si proveedor configurado), hacer clic/arrastrar marcador o ingresar ambas coordenadas. Referencia y dirección son opcionales.
3. Guardar ubicación; esperar confirmación. Recargar para comprobar persistencia. La ubicación es privada.
4. Para retirar coordenadas, Eliminar ubicación y confirmar. El NFC/QR sigue abriendo el mismo destino.
5. Solo configurar un soporte móvil cuando represente una instalación fija; no usar para seguir a una persona.

## Despliegue y rollback

No fusionar main ni migrar producción sin autorización. Publicar rama con despliegue automático cancelado por ignoreCommand. Configurar DATABASE_URL de preview exclusivamente para `feat/point-georeferencing`, apuntando a geolocation_preview. El despliegue manual debe usar `node scripts/ci/build-geolocation-preview.mjs` como buildCommand; valida entorno/rama/nombre BD antes de migrate deploy y build. El build normal conserva su comando y no migra nada. No dar acceso a claves de correo/Blob productivas en pruebas; los flujos de prueba no envían correo ni suben archivos.

Antes de producción: CI verde y revisión PR; proveedor configurado con límites; prueba real de dirección y tiles; validar preview autenticado con fixtures; confirmar ambos proyectos y base aislada; revisar SQL y backup/recuperación. Aplicar solo migración aditiva revisada; desplegar en el proyecto autorizado.

Rollback de aplicación: volver al despliegue anterior de cada proyecto afectado. Dejar tabla nueva y enums intactos: el código anterior los ignora. No ejecutar DROP ni revertir migraciones productivas automáticamente. Si se requiere eliminar datos geográficos, autorizar y revisar una operación específica con respaldo/retención. Reaplicar la versión anterior no cambia NFC/QR ni pierde destinos. Mantener migraciones aditivas en historial; no editar las ya aplicadas.

Pendientes de aceptación: configuración y prueba real de Geoapify, preview funcional autenticado y CI remoto/revisión del PR. Producción no desplegada.
