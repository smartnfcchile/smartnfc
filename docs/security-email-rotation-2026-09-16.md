# Cierre técnico de la acción de seguridad de correo

Fecha: 16 de septiembre de 2026.

## Resultado y alcance

Se retiró el módulo obsoleto `lib/resend.ts`, sin consumidores identificados. La creación de clientes Resend queda centralizada en `lib/email/resend.ts` y utiliza `RESEND_API_KEY`. Tanto el servicio general de correo como el transporte de reportes Local utilizan ese módulo.

Las plantillas de correo, los destinatarios de negocio y la lógica comercial no fueron modificados.

La rotación de credenciales fue completada el 16 de septiembre de 2026. Las credenciales antiguas observadas durante la revisión fueron retiradas y se conservaron credenciales nuevas separadas por función y limitadas a permiso de envío.

No se reproducen en este documento valores, prefijos ni fragmentos de credenciales.

## Estado final de credenciales

Al cierre quedaron activas únicamente dos credenciales nuevas de Resend:

- `SmartNFC envío · rotación septiembre 2026`: destinada a la aplicación SmartNFC y su configuración de despliegue.
- `Gmail SMTP SmartNFC · rotación septiembre 2026`: destinada exclusivamente al envío de `contacto@smartnfc.cl` mediante Gmail SMTP.

Ambas utilizan permiso `Sending access`.

Las credenciales antiguas observadas durante la revisión dejaron de estar activas:

- `SmartNFC Production 2`.
- `SmartNFC Production`.
- `Gmail SMTP SmartNFC`.

No se afirma cuál de las credenciales antiguas correspondía exactamente a la referencia histórica expuesta. La revocación de las credenciales antiguas observadas neutraliza su posible utilización futura.

La referencia histórica puede permanecer en versiones anteriores del repositorio. No se realizó reescritura del historial Git.

## Verificación de Gmail SMTP

Se comprobó que `contacto@smartnfc.cl` utiliza `smtp.resend.com` como servidor SMTP desde la configuración `Enviar correo como` de Gmail.

Antes de retirar la credencial SMTP antigua se creó una nueva credencial dedicada, limitada a envío, y se actualizó la contraseña SMTP en Gmail sin modificar el servidor, usuario, puerto ni conexión segura existentes.

Gmail aceptó la nueva configuración.

Se realizó una única prueba controlada desde `contacto@smartnfc.cl`. El mensaje fue recibido correctamente mostrando `Smart NFC Chile <contacto@smartnfc.cl>` como remitente.

Posteriormente Resend registró actividad reciente en la nueva credencial `Gmail SMTP SmartNFC · rotación septiembre 2026`, mientras la credencial antigua continuaba mostrando su último uso histórico. Después de esta comprobación se eliminó la credencial SMTP antigua.

## Configuración de aplicación

Previamente se creó la credencial `SmartNFC envío · rotación septiembre 2026` con permiso de envío y se actualizó la configuración correspondiente de SmartNFC.

La configuración local fue comprobada sin imprimir valores y `.env` permanece excluido de Git.

La nueva credencial de aplicación había sido comprobada previamente mediante un envío controlado y actividad registrada por Resend.

## Prevención incorporada al repositorio

Se añadió `npm run check:secrets`.

El detector examina archivos rastreados y archivos nuevos no ignorados del árbol de trabajo. Detecta patrones de credenciales de proveedores de correo, GitHub y AWS, cabeceras de claves privadas y contraseñas incluidas en URL de bases de datos remotas.

Los hallazgos informan únicamente archivo, línea y regla. El detector no imprime el valor encontrado.

Esta comprobación es preventiva y no constituye una garantía absoluta de ausencia de secretos. No inspecciona binarios, documentos comprimidos, secretos sin patrones reconocibles, historial Git, variables de servicios externos ni archivos ignorados.

## Validaciones técnicas

| Comprobación | Resultado |
|---|---|
| Detector sobre el árbol actual | 0 coincidencias |
| Build de producción local | Correcto |
| Prisma generate | Correcto |
| TypeScript durante build | Correcto |
| Revisión del diff | 8 archivos del cierre técnico |
| Árbol Git antes del commit técnico | Limpio después del commit |

El build de producción se completó correctamente con Next.js 16.3.2. Prisma informó únicamente la advertencia de deprecación conocida sobre la configuración `package.json#prisma`; no bloqueó la compilación.

## Commit y rama

El cierre técnico inicial quedó registrado en:

- Rama: `codex/security-email-rotation-2026-09-16`
- Commit técnico: `7c03f25`
- Mensaje: `security: centralize Resend client and add secret checks`

La rama fue publicada posteriormente en `origin/codex/security-email-rotation-2026-09-16` y quedó sincronizada con el repositorio remoto.

Este documento se actualiza en un commit posterior para registrar la revocación y comprobación SMTP realizadas después del commit técnico inicial.

## Archivos del cierre técnico

- Eliminado: `lib/resend.ts`.
- Modificado: `lib/email/resend.ts`.
- Modificado: `lib/local/report-transport.ts`.
- Modificado: `package.json`.
- Nuevo: `scripts/check-secrets.mjs`.
- Nuevo: `scripts/tests/secret-scan.test.mjs`.
- Nuevo: `scripts/tests/email-security.test.ts`.
- Nuevo: `docs/security-email-rotation-2026-09-16.md`.

## Estado de cierre

La centralización del correo y las comprobaciones preventivas están implementadas en la rama dedicada.

La rotación de las credenciales antiguas observadas quedó completada.

Gmail SMTP fue migrado y probado satisfactoriamente antes de retirar su credencial anterior.

Las credenciales finales están separadas por función y limitadas a permiso de envío.

No se ha realizado todavía el merge de esta rama a `main` ni un despliegue del código contenido en esta rama.

El siguiente paso es revisar el diff final, incorporar este registro documental, publicar el nuevo commit de documentación y preparar el Pull Request antes de cualquier merge a `main`.
