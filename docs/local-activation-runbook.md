# Activación de SmartNFC Local

Estado: preparación para revisión. No constituye autorización para fusionar main, migrar producción, enviar correos reales o contratar servicios.

## Decisiones que faltan

- Programador: cron horario de Vercel con plan compatible, o planificador servidor externo autorizado. No usar el ordenador de Agustín ni del propietario como programador.
- Correo: dominio remitente verificado, credencial Resend y buzón de soporte atendido.
- Supervisión independiente del correo: alertas por errores del proceso, fallos de captura y ausencia de ejecuciones. La configuración externa todavía no está realizada.
- Piloto: local y destinatarios autorizados; frecuencia semanal o mensual elegida una sola vez por el administrador.

El superadministrador consulta resúmenes del local seleccionado. El proceso obtiene las métricas en el servidor respetando la pertenencia de cada punto y reporte; no necesita que una persona entre a descargar escaneos cada semana.

## Comprobación sin efectos externos

Ejecutar en un proceso que ya tenga las variables del entorno de destino, sin imprimir ni copiar sus valores en tickets:

```text
npm run check:local:activation -- preview
npm run check:local:activation -- live
```

No carga archivos .env automáticamente, no abre conexiones, no modifica datos y no envía correos. Devuelve 0 cuando las comprobaciones locales pasan, 1 si falta configuración y 2 para argumentos inválidos. La presencia de una variable no confirma que su credencial funcione ni que el dominio esté verificado. Una comprobación local tampoco describe la configuración real del hosting.

## Secuencia de puesta en marcha, después de aprobación

1. Revisar PR #7 y después PR #8. Preparar la integración en ese orden. Verificar cómo dispara despliegues el hosting antes de fusionar: aprobar una fusión no sustituye aprobar el despliegue.
2. Ensayar la versión aprobada en una base aislada con modo preview. Aplicar las tres migraciones nuevas en orden: reportes automáticos, incidencias de seguimiento y puntos inteligentes. Confirmar pruebas de Local y Empresas.
3. Probar con datos ficticios los siete objetivos, cambio de destino sin cambiar QR/NFC, aislamiento entre locales y reporte por objetivo. Verificar que la conversión use solo visitas de Club. Comprobar el correo guardado en preview; no se envía al cambiar luego a live.
4. Preparar respaldo recuperable de producción, ventana de cambio, configuración del programador y monitor externo. Dimensionar carga: por ejecución hay hasta 100 cierres, 5 informes y 10 entregas. Las 08:00 habilitan los informes, no garantizan entrega a esa hora.
5. Con autorización de producción, mantener correo disabled y programador detenido mientras se aplica `npm run db:migrate` y se despliega la versión aprobada. El build ya no aplica migraciones.
6. Verificar acceso de Empresas y Local y lectura del historial. Configurar las variables de correo y ejecutar la comprobación live en el entorno correspondiente. Confirmar por separado dominio y credenciales con el proveedor.
7. Activar live, habilitar el piloto y el programador autorizado con Bearer CRON_SECRET. Verificar que su historial registre respuestas correctas y que la supervisión independiente detecte una ejecución fallida o ausente.
8. Validar el primer periodo cerrado: un informe por local y periodo, destinatarios correctos, métricas y estado de aceptación del proveedor. SENT no confirma llegada a la bandeja; comprobar recepción con el destinatario piloto. Extender después a los demás locales autorizados.

## Detener y recuperar

Detener el programador y configurar LOCAL_REPORT_EMAIL_MODE=disabled usando el procedimiento del hosting. Una ejecución que ya está en marcha puede terminar; no se puede retirar un correo aceptado por el proveedor. Revisar las entregas pendientes y en curso antes de reactivar.

No borrar el historial, reiniciar contadores de intentos ni convertir PREVIEW a PENDING para forzar envíos. Conciliar UNKNOWN con el proveedor antes de decidir cualquier reenvío; no existe reenvío automático seguro de esos casos. Revisar también FAILED y las alertas de soporte.

No revertir las migraciones borrando columnas o tablas con datos reales. Si se requiere volver a una versión anterior, comprobar primero su compatibilidad con el esquema y los nuevos objetivos. Priorizar una corrección hacia adelante y mantener detenido el programador mientras se evalúa.

## Evidencia que debe conservarse

Versión desplegada, resultado de migraciones, ensayo aislado, confirmación del respaldo recuperable, configuración del programador sin secretos, prueba del monitor externo y aceptación/recepción del piloto. Ninguna de estas evidencias de producción se ha generado en esta preparación.
