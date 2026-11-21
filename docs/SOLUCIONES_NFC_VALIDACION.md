# Soluciones NFC

Usar el Preview de feature/soluciones-nfc-v1 en smartnfc. El prebuild valida ambas conexiones del laboratorio. El archivo scripts/demos/soluciones-laboratorio.sql solo se puede ejecutar contra el laboratorio identificado.

La campaña ficticia tiene 200 soportes y cero fichas. Extintores y Mascotas tienen cuatro fichas en total. Para publicar una ficha se activa el proyecto, la ficha y su etiqueta. En campaña se activa el proyecto y el lote o etiqueta.

## Publicación

1. Verificar CI y probar las operaciones con sesión SUPERADMIN de laboratorio, incluida la importación de XLSX, edición, QR y reemplazo.
2. Capturar el despliegue estable y confirmar el punto recuperable de Neon. Pedir autorización específica para fusión, migraciones aditivas y despliegue.
3. Aplicar las migraciones revisadas y publicar conservando acceso administrativo SUPERADMIN. Verificar Personas, Empresas, Locales y Soluciones.
4. Ante regresión, suspender el proyecto afectado cuando corresponda y volver al despliegue estable. Conservar las tablas aditivas, fichas, lotes y auditoría. Los enlaces de Soluciones quedan temporalmente indisponibles si el código anterior carece de la ruta pública.

Ubicaciones como texto y filtro exacto. Configuración de campos mediante JSON. La importación XLSX convierte la primera hoja al formato validado por el importador CSV. El catálogo de sedes, estadísticas y permisos comerciales aún están pendientes.
