# Cierre técnico de la acción de seguridad de correo

Fecha: 16 de septiembre de 2026.

## Resultado y alcance

Se retiró el módulo obsoleto lib/resend.ts, sin consumidores identificados. La creación de clientes Resend queda exclusivamente en lib/email/resend.ts y utiliza RESEND_API_KEY. Tanto el servicio general de correo como el transporte de reportes Local usan ese módulo. Las cuatro plantillas, los destinatarios de negocio y la lógica comercial no fueron modificados.

Las claves antiguas de Resend NO fueron revocadas, por decisión posterior del usuario. El incidente de posible exposición no se considera resuelto por completo: borrar un archivo del árbol actual no invalida una credencial ni elimina su presencia histórica. No se reescribió Git ni se utilizó la referencia expuesta para realizar solicitudes.

## Configuración y prueba real realizadas previamente

- El usuario creó la nueva clave con permiso de envío limitado al dominio SmartNFC y actualizó la configuración local y las variables de Production y Preview del proyecto smartnfc en Vercel.
- Se verificó la configuración local sin imprimir valores. El archivo .env está excluido de Git.
- Se ejecutó un redespliegue del código ya existente en producción, commit f1cc31f, para aplicar las nuevas variables. Vercel confirmó Ready.
- Se envió un único correo de prueba controlada a contacto@smartnfc.cl usando el servicio compartido y una plantilla existente con datos ficticios. No se creó ninguna empresa, cuenta, pago o licencia.
- Resend confirmó la aceptación y luego Delivered. La actividad de la nueva clave se actualizó con esa prueba. Delivered acredita recepción por el servidor de correo, no lectura humana.
- La variable de Preview quedó actualizada para los siguientes despliegues. No se redesplegaron todas las previews anteriores: pueden conservar su configuración anterior.
- Los cambios de código de este cierre se preservan en la rama dedicada codex/security-email-rotation-2026-09-16. No se ha realizado push ni despliegue adicional.

## Prevención sin servicios adicionales

Se añadió `npm run check:secrets`. Examina archivos rastreados y nuevos no ignorados del árbol de trabajo. Detecta patrones de claves de Resend, GitHub y AWS, cabeceras de claves privadas y contraseñas en URL de bases remotas. Informa únicamente archivo, línea y regla, nunca el valor encontrado. Devuelve fallo cuando encuentra coincidencias o no puede completar el análisis.

Es una comprobación preventiva local, sin nuevas dependencias, servicios pagados, hooks obligatorios ni cambios en los workflows actuales. Ejecutarla antes de preparar un commit. No es una garantía de ausencia de secretos: no inspecciona binarios, documentos comprimidos, secretos sin patrones reconocibles, versiones distintas del índice de Git, historial, variables de Vercel ni archivos ignorados. En particular, la referencia histórica conocida permanece en Git.

## Validaciones

| Comprobación | Resultado |
|---|---|
| Detector sobre el árbol actual | 0 coincidencias |
| Pruebas del detector | 4 aprobadas |
| Pruebas de plantillas/transporte y regresión Local, puntos, tarjetas y VCF | 11 aprobadas |
| Integración Local con base de datos | 1 omitida por falta de base QA desechable habilitada |
| Typecheck | Correcto |
| Lint | 0 errores; 147 advertencias preexistentes; ninguna en archivos nuevos o modificados |
| Build de producción local | Correcto, incluido Prisma generate y TypeScript |
| Revisión del diff | Cambios limitados a integración de correo, eliminación obsoleta, scripts de comprobación, pruebas y este registro |

Las pruebas nuevas usan un proveedor simulado y datos ficticios. Verifican renderizado y escape en las cuatro plantillas, creación del cliente desde configuración, ausencia de cliente sin clave, conservación de la clave de idempotencia y el contenido del reporte, y rechazo de envíos desde preview o con transporte deshabilitado. No enviaron correos reales.

Build y pruebas se ejecutaron sin acceso a Neon: se usó una URL de base ficticia en loopback y correo deshabilitado. El aislamiento de Windows impide cargar tsx; las pruebas TypeScript se ejecutaron con la excepción autorizada. No hubo cambios de schema ni migraciones.

## Archivos modificados

- Eliminado: lib/resend.ts.
- Modificado: lib/email/resend.ts.
- Modificado: lib/local/report-transport.ts.
- Modificado: package.json (check:secrets y test:security).
- Nuevo: scripts/check-secrets.mjs.
- Nuevo: scripts/tests/secret-scan.test.mjs.
- Nuevo: scripts/tests/email-security.test.ts.
- Nuevo: docs/security-email-rotation-2026-09-16.md.

## Pendientes

1. Identificar y revocar las claves que correspondan cuando el usuario lo decida. No se afirma que SmartNFC Production 2 sea el valor expuesto: las capturas sólo acreditan que se utilizó para correos administrativos históricos.
2. La eliminación y centralización del código no están publicadas; requerirán el flujo de revisión y despliegue correspondiente.
3. Revisar previews antiguas antes de retirar credenciales que puedan seguir utilizando.
4. Mantener el Bloque 2 detenido hasta recibir una nueva aprobación.
