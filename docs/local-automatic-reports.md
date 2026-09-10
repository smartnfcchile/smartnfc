# Reportes automáticos SmartNFC Local

Primera entrega: medición correlacionada NFC/QR, informes semanales o mensuales, historial privado, supervisión por local y procesamiento de entregas con reintentos. La ampliación a siete objetivos configurables sigue siendo un bloque posterior; esta entrega usa las campañas CLUB actuales.

## Estado de revisión

Rama `feat/local-automatic-reports`. No aplicar migraciones ni activar correo real en producción sin revisión y aprobación. El modo por defecto es `disabled`. `preview` genera el informe y conserva el correo, pero no contacta al proveedor. Los ensayos utilizan dos locales ficticios en PostgreSQL local y un transporte simulado.

Se separó `prisma migrate deploy` de `npm run build`: compilar ya no modifica la base de datos. Después de aprobar esta entrega, el proceso de despliegue deberá ejecutar explícitamente `npm run db:migrate` antes de servir la nueva versión. Revisar esta adaptación en la configuración real de hosting.

`vercel.json` omite las compilaciones automáticas de esta rama de revisión. No habilitar una preview contra la base de producción. La programación de Vercel solo opera en producción una vez aprobada y desplegada.

## Operación

1. El administrador selecciona una sola vez frecuencia y destinatarios en **Local → Reportes**. Solo se admiten usuarios activos del mismo local con rol propietario o administrador; máximo 10.
2. El proceso horario cierra semanas (lunes a domingo) o meses calendario en `America/Santiago`. Los informes se habilitan desde las 08:00 del primer día siguiente; colas y reintentos pueden posponer la aceptación por correo.
3. El sistema guarda un resumen persistente por local, frecuencia y periodo, y una entrega por destinatario. La vista privada y el correo usan ese mismo resumen.
4. Antes de cada envío se vuelve a comprobar la autorización del destinatario y la disponibilidad del local/licencia.
5. El superadministrador accede a **Locales → Reportes** en un local concreto. Los administradores de un local no acceden a otro.
6. Los fallos recuperables se reintentan. Tras agotar intentos o quedar un envío incierto, se conserva el estado y se crea una alerta única para soporte. No se requiere intervención humana para los informes normales.

## Activación después de aprobación

- Respaldar la base y revisar las dos nuevas migraciones. No ejecutan backfill de escaneos antiguos: la atribución anterior no permite reconstruir visitas fiables.
- Confirmar un plan de Vercel que admita cron horario; alternativamente, usar un planificador servidor autorizado que invoque `GET /api/cron/local-reports` con `Authorization: Bearer <CRON_SECRET>`.
- Variables servidor: `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM` con dominio verificado, `LOCAL_REPORT_SUPPORT_EMAIL` y `NEXT_PUBLIC_APP_URL` HTTPS. `NEXTAUTH_SECRET` también firma el consentimiento público.
- Ensayar primero en una base aislada con `LOCAL_REPORT_EMAIL_MODE=preview`. Los estados `PREVIEW` son terminales: no se convierten automáticamente en envíos reales al cambiar el modo.
- Tras aprobación de la prueba y del despliegue, configurar `LOCAL_REPORT_EMAIL_MODE=live`, migrar, desplegar y habilitar destinatarios/frecuencias por local.
- Verificar cron, aceptación del primer correo y acceso privado. No usar un informe real para una prueba sin autorización de sus destinatarios.

## Qué miden los informes

- Accesos: filas de `LocalVisit`; NFC y QR se asignan en sus resolutores del servidor. Abrir la landing después no suma otro acceso.
- Enlaces directos con `ref` conservan atribución al punto, pero no se convierten artificialmente en escaneos QR.
- Conversión: visitas del periodo con registro, divididas por accesos del mismo periodo. Los registros nuevos se cuentan por primera suscripción, aunque luego cambie su estado.
- Clics WhatsApp y VCF se correlacionan con una visita y se deduplican por acción. La ventana de correlación es una hora. Un clic no acredita un mensaje, una reseña, un seguimiento ni una compra.
- Son accesos registrados, no personas únicas ni una prueba física de haber acercado un teléfono. Un enlace NFC/QR compartido también puede abrirse.
- La cobertura parcial y las incidencias conocidas se señalan; no se calculan comparaciones si la cobertura no lo permite. Los errores al consultar métricas dejan el informe pendiente/fallido, nunca un informe artificial de ceros.
- Una caída total de la base no puede registrarse en esa misma base. Es obligatorio configurar monitorización de infraestructura para `LOCAL_TRACKING_FAILED`, `LOCAL_REPORT_WORKER_FAILED` y ausencia de ejecuciones del cron. Si el proveedor de correo cae, el propio correo no puede garantizar la alerta. Esta monitorización externa queda pendiente de configurar al activar producción.

## Entregas y recuperación

`SENT` significa **aceptado por el proveedor**, no entregado en la bandeja del destinatario. Esta entrega no incluye webhooks de rebotes/entrega ni confirma apertura.

Las claves de idempotencia de Resend duran 24 horas. El sistema conserva exactamente el mismo payload y clave en los reintentos y no reenvía a ciegas después de 23 horas desde el primer intento: marca `UNKNOWN` y requiere conciliación con el proveedor. Tras tres intentos fallidos queda `FAILED`; soporte debe revisar el estado del proveedor antes de autorizar un eventual reenvío. No hay botón que eluda esa comprobación.

Las reservas de trabajo duran cinco minutos, cada llamada de correo tiene un límite de diez segundos, y se procesan lotes acotados. La capacidad actual es hasta 100 cierres, 5 generaciones y 10 entregas por invocación; dimensionar la frecuencia/lotes antes de incorporar grandes volúmenes de locales. Los informes pueden quedar en cola, por lo que las 08:00 son hora de habilitación, no una garantía de entrega exacta.

## Validación reproducible

Base PostgreSQL 16 descartable en `127.0.0.1` o `localhost`, nunca producción:

```powershell
$env:DATABASE_URL='postgresql://usuario:clave@127.0.0.1:5432/local_reports_test'
$env:LOCAL_TEST_DATABASE_URL=$env:DATABASE_URL
npm ci
npx prisma generate
npm run db:migrate
npm run test:local
npx tsc --noEmit
npm run lint
npm run build
```

La suite de integración se omite si no se especifica una base loopback mediante `LOCAL_TEST_DATABASE_URL`. Crea y elimina solo filas asociadas a sus empresas ficticias aleatorias. El workflow `local-reports-check.yml` proporciona su propio PostgreSQL y no usa secretos de correo. Las pruebas cubren aislamiento, permisos revocados, flujos NFC/QR, consentimiento publicado, concurrencia, cron protegido, transporte simulado, reintentos, estado incierto, incidencias y reglas de Empresas.

Ejemplo de correo con datos ficticios y el renderer real:

```text
npx tsx scripts/local-report-preview.ts ruta/al/ejemplo.html
```

Referencias: [idempotencia Resend](https://resend.com/docs/dashboard/emails/idempotency-keys), [operación cron Vercel](https://vercel.com/docs/cron-jobs/manage-cron-jobs).
