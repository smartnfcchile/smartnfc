# SmartNFC — Migración segura de imágenes existentes (V1)

Herramienta: `scripts/maintenance/optimize-card-images.ts`.

## Reglas de seguridad
- **Solo una tarjeta por ejecución**: siempre `--company-id` y `--card-id`.
- **DRY-RUN es el modo predeterminado**: descarga el original desde el Blob autorizado, estima conversión WebP y reporta tamaños; no escribe.
- Archivos externos, rutas locales y datos embebidos heredados se **omiten**, nunca se reescriben.
- No modifica URLs NFC/QR, perfiles, permisos, CRM, ni otros campos.
- Nunca borra el Blob original.
- Una migración real necesita `--apply --confirm-card-id <ID>`, acceso administrativo y token Blob.
- Antes de actualizar un campo, comprueba que todavía conserva la URL antigua (actualización condicional).
- El manifiesto JSONL conserva las URLs antiguas y nuevas. Guárdalo en un lugar seguro, porque permite recuperar imágenes y puede identificar clientes.
- **No ejecutar en producción hasta aprobar un ensayo en entorno aislado y verificar respaldo y restauración.**

## Comandos (no ejecutados)

Auditoría de una tarjeta en un entorno configurado y autorizado:

```bash
npm run audit:card-images -- --company-id EMPRESA_ID --card-id TARJETA_ID
```

Aplicar solo después de revisar los resultados y probar en una base desechable:

```bash
npm run audit:card-images -- --company-id EMPRESA_ID --card-id TARJETA_ID --apply --confirm-card-id TARJETA_ID --manifest ./reports/prueba-imagenes.jsonl
```

Restaurar solo si la tarjeta aún contiene las URLs optimizadas registradas:

```bash
npm run audit:card-images -- --company-id EMPRESA_ID --card-id TARJETA_ID --rollback ./reports/prueba-imagenes.jsonl --confirm-card-id TARJETA_ID
```

## Validaciones mínimas previas a producción
1. `npm ci && npm run typecheck && npm run test:card-images`.
2. Ejecutar solo lectura y comparar cantidad de imágenes, tamaño original, reducción.
3. Ejecutar aplicación y reversión en base y Blob de pruebas; comprobar URL y dimensiones tras cada operación.
4. Validar con imágenes de prueba: foto, logo transparente, banner con texto y hero.
5. Confirmar que el perfil y sus URLs públicas NFC/QR permanecen iguales.
6. Aprobar piloto de una tarjeta real, mantener el manifiesto protegido y repetir mediciones de primera visita con Wi-Fi y datos móviles.

No confundir esto con el procesamiento de **nuevas subidas**: ese flujo ya está dentro del editor y no usa la herramienta de migración.
