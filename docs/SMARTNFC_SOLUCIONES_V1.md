# SmartNFC Soluciones V1 — especificación de arquitectura

## Objetivo
Incorporar un cuarto producto **Soluciones NFC**, distinto de Empresas (identidad profesional) y Locales (puntos de comercio). No reemplazar sus contratos ni licencias actuales.

## Modalidades
- **ASSETS**: cada ficha pertenece a un activo, lugar o punto de control, tiene identificador estable y puede asociar varios soportes físicos NFC/QR. Cobro propuesto: CLP 200 netos por ficha activa al mes.
- **CAMPAIGN**: cientos o miles de dispositivos pueden apuntar a un único destino lógico o a segmentos. Servicio digital cotizado por campaña y prestaciones; NO CLP 200 por llavero.
- Chip estándar propuesto CLP 1.000 netos, instalación y logística aparte. El costo observado de CLP 80 es solo del chip, no del llavero, encapsulado ni instalación. Precios comerciales sujetos a confirmación y sin IVA.

## Entidades de datos previstas (sin migraciones todavía)
- `SolutionProject`: id, companyId, title, mode, status, siteId?, templateId, timestamps.
- `SolutionSite`: id, companyId, title, parentSiteId? (planta, instalación, sector, municipio).
- `SolutionTemplate`: id, companyId?, code, version, fieldSchema JSON validado, activo. Las plantillas compartidas son inmutables por versión.
- `SolutionRecord`: id, companyId, projectId, externalCode, siteId?, data JSON validado, status, version, timestamps; unique(companyId,projectId,externalCode).
- `SolutionTag`: id, companyId, projectId, recordId?, batchId?, publicToken unique de alta entropía, estado, tipo, timestamps. Separar soporte del activo.
- `SolutionBatch`: id, companyId, projectId, destino/campaña, cantidad fabricada, activada, estado.
- `SolutionImport`: id, companyId, projectId, idempotencyKey, resumen, validaciones, estado, actorId, timestamps.
- `SolutionAudit`: id, companyId, projectId, actorId, operación, entidad, identificador, before/after limitado, fecha.
- `SolutionSubscription`: id, companyId, mode, rateVersion, monthlyRate, billingPeriod, agreedTerms; snapshots mensuales por período.
- `SolutionScanAggregate`: companyId, projectId, fecha, source, count; minimizar eventos crudos y datos personales.

## Contratos no negociables
1. Multi-tenant: cada acceso y consulta de administración se delimita por `companyId`, verificando membresía y permisos en el servidor. Verificación de proyecto y ficha por la misma empresa; índices compuestos y pruebas cross-tenant.
2. URLs públicas con token aleatorio opaco, no códigos secuenciales ni UID del NFC. Tokens revocables, reemplazables y no reutilizables.
3. Campos por plantilla tipados: text, number, date, boolean, URL HTTP(S), select, required y public. Campos secretos nunca en ficha pública.
4. Importación Excel .xlsx (y CSV): plantilla descargable; lectura de archivo y mapeo de columnas; previsualización, errores fila/campo, duplicados, rollback y upsert transaccional por externalCode con idempotencia. Las utilidades puras del primer commit preparan filas ya parseadas; NO procesan .xlsx ni guardan registros aún.
5. Ficha pública con vistas específicas por sector y contenido accesible; los datos de seguridad sensibles y registros nominales deben requerir autenticación.
6. LOTO: acceso consultivo; no autoriza una maniobra ni sustituye bloqueo físico, verificación de ausencia de energía o procedimientos aprobados.
7. Capacitación: un escaneo no certifica lectura ni cumplimiento. Evaluaciones y evidencia nominal deben implementarse aparte.
8. No facturar por escaneo. Cargos por activo activo o por prestación de campaña. Registro histórico ante bajas y reemplazos. Facturación, emisión de DTE, IVA y cobro no están implementados.
9. Las migraciones deben ser aditivas, con copia de respaldo y pruebas; no modificar tablas `LocalTouchpoint`, `Card` ni licencias existentes en el primer corte.
10. Métricas agregadas por defecto, límites de retención y controles de acceso; tratar datos de trabajadores de acuerdo con obligaciones aplicables.

## Secuencia de desarrollo
- **Corte A (este branch):** contratos TS, plantillas iniciales, prevalidación de importaciones, cotización separada por modalidades y pruebas unitarias. Todo aislado y sin publicación.
- **Corte B:** migraciones Prisma y repositorios scoped; pruebas de aislamiento, autorización y concurrencia.
- **Corte C:** panel CRUD organización/proyectos/sedes/fichas, importación Excel y generador de QR/URL NFC.
- **Corte D:** páginas públicas, analítica, asignación física y reemplazo de tags, importaciones idempotentes.
- **Corte E:** activación comercial y cobro, reportes, permisos por planta, capacitación y servicios avanzados.

## Criterios de aceptación del MVP
- Dos empresas con un mismo código externo de extintor no pueden acceder entre sí.
- Importar 1.000 activos, corregir 50 y repetir el archivo no genera duplicados.
- Reemplazar NFC sin reemplazar ficha ni historial.
- Un lote de 5.000 llaveros con destino compartido no produce 5.000 licencias de activos.
- La ficha pública jamás muestra campos privados.
- Cambios de plantilla son versionados y migrables.
- Productos anteriores mantienen su comportamiento, precios y permisos.

> Estado: diseño y utilidades iniciales. NO es un módulo habilitado para clientes ni para producción.

## Avance de desarrollo — 20 de noviembre de 2026
- Se añadió un esquema Prisma aditivo (`SolutionProject`, `SolutionTemplate`, `SolutionRecord`, `SolutionBatch`, `SolutionTag`) y la migración `20261120090000_solution_core`.
- Las relaciones compuestas `companyId + projectId` impiden que las fichas, plantillas y etiquetas pertenezcan a proyectos de otra organización.
- Existe una pantalla interna para crear proyectos y plantillas en borrador en `/superadmin/soluciones`, deliberadamente restringida a SUPERADMIN.
- `importSolutionRecords` permite prevalidar y aplicar lotes de hasta 500 filas por transacción (upsert por código externo). No está conectado a un lector Excel ni a un botón de importación.
- Falta auditoría de cambios, control de concurrencia por edición, exportación Excel y experiencia de usuario para importar.
- Nada de lo anterior se considera activado en clientes. Las migraciones no deben aplicarse a producción antes de la revisión y CI.
