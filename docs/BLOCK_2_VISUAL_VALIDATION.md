# Bloque 2: validación funcional visual

Cierre: 21 de septiembre de 2026. Recorrido acumulado, retomado sin repetir los escenarios ya confirmados. Exclusivamente aplicación local y PostgreSQL desechable; sin Neon ni producción.

## Escenarios y resultados

| Escenario | Resultado observado |
|---|---|
| Superadmin | Empresa Teams y licencia con cupo 5 visibles; guardado administrativo y aprovisionamiento de perfil, tarjeta física y QR completados. Inventario muestra la vinculación. |
| Perfil permanente | Dashboard, editor y guardado operativos; QR y contacto disponibles. CRM/métricas ocultos y accesos directos bloqueados. Captura de prospectos deshabilitada conservando configuración. |
| Pro activo | CRM con prospecto histórico y métricas con una visita y un prospecto visibles. |
| Pro vencido | Tras vencer la licencia, premium deja de estar disponible; perfil público funciona. La base conserva el prospecto y el evento, sin borrado. |
| Teams | Usuarios y tarjetas muestran identidades activas y cupo. Con 5 de 5, crear la sexta tarjeta devuelve el mensaje de límite alcanzado y no crea otra identidad. |
| Local activo | LocalLocation, creación de sucursal, campaña vinculada a esa sucursal, puntos y navegación comprobados. |
| Local inactivo | Administración premium redirige a una pantalla informativa. Las rutas públicas NFC y QR muestran “Punto Inteligente temporalmente inactivo”, sin datos administrativos y sin 404 (HTTP 403). |
| Reactivación Local | Al reactivar únicamente la licencia, el mismo punto y código vuelven a mostrar su contenido y la administración queda disponible. No se recreó ni reprogramó el punto. |
| Navegación | Opciones de perfil base, Pro, Teams y Local corresponden a sus capacidades; puntos requiere su capacidad específica. |
| Responsive | Escritorio y móvil de 390 × 844: editor, navegación, tarjetas/equipo, puntos públicos/administrativos e inventario Superadmin revisados. El menú móvil permite pulsar sus enlaces. |

## Bugs corregidos de forma mínima

- Teams no mostraba cupo: tarjetas y usuarios ahora presentan identidades activas frente al límite resuelto.
- Overlay móvil cubría enlaces: se ajustó el orden de capas y el desplazamiento del sidebar, sin rediseño.
- Local inactivo mostraba una excepción al abrir administración directamente: las páginas comprueban capacidades y redirigen a la pantalla neutral; las acciones mantienen autorización de servidor.
- La respuesta pública inactiva en texto plano no se renderizaba correctamente en el navegador de prueba: ahora devuelve HTML mínimo con viewport y el mismo mensaje neutral, conservando HTTP 403 y cabeceras privadas.

Archivos de estos ajustes: components/Sidebar.tsx, app/dashboard/cards/page.tsx, app/dashboard/users/page.tsx, lib/local/access.ts, lib/local/point-resolver.ts, páginas de administración Local y components/local/ReportCenter.tsx.

## Pruebas finales y logs

- Suite correspondiente: **52 aprobadas, 0 fallidas, 0 omitidas**, incluyendo integración y backfill seguro en PostgreSQL desechable. No se ejecutó el backfill histórico peligroso.
- TypeScript: aprobado. Build de producción: aprobado tras cerrar el servidor de desarrollo que bloqueaba temporalmente la DLL de Prisma en Windows.
- ESLint: 0 errores, 141 advertencias preexistentes. check:secrets: 0 hallazgos. git diff --check: aprobado.
- Consola y logs revisados durante el recorrido. Se observaron los rechazos esperados por cupo/autorización y los errores de Local corregidos; la consulta final de consola no devolvió errores ni advertencias. Hubo advertencias de desarrollo sobre smooth-scroll y renderizado de scripts, además de la deprecación de configuración Prisma; no se amplió alcance para corregirlas.
- Migraciones históricas sin modificaciones. Se mantiene una única migración nueva aditiva; backfill e integridad cubiertos por la suite.
- No hay runtime PostgreSQL, secretos ni fixtures temporales incluidos en Git. AGENTS.md conserva la actualización automática de Next.js.

Las evidencias visuales se describen arriba; las capturas se inspeccionaron durante el recorrido y no se añadieron como archivos al repositorio. La comprobación NFC cubre su ruta/código público; no incluye lectura mediante hardware físico. No se midió carga de producción.

## Estado para aprobación

Rama: codex/commercial-catalog-entitlements. HEAD: 40a0bff8d7618acf73a85895047f2968fe6a7743. Sin archivos preparados para commit; sin commit, push, PR, merge ni deploy. Servidor web temporal detenido después del recorrido para completar el build. PostgreSQL desechable conservado.

### Git status --short (incluye este informe)

```text
 M AGENTS.md
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
?? app/dashboard/local/locales/actions.ts
?? app/dashboard/local/locales/page.tsx
?? docs/BLOCK_2_ENTITLEMENTS.md
?? docs/BLOCK_2_VISUAL_VALIDATION.md
?? lib/entitlements/catalog.ts
?? lib/entitlements/index.ts
?? lib/entitlements/license-input.ts
?? lib/entitlements/overrides.ts
?? lib/entitlements/resolve.ts
?? lib/local/locations.ts
?? prisma/migrations/20260917010000_commercial_catalog_entitlements/migration.sql
?? scripts/tests/entitlements-backfill.test.ts
?? scripts/tests/entitlements-integration.test.ts
?? scripts/tests/entitlements.test.ts
```
