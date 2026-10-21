# Modo seguro de correo transaccional

`lib/email/send-email.ts` (invitaciones, activación, restablecimiento de contraseña, avisos de producción de tarjetas) solo envía correos reales cuando `resolveEmailMode()` (`lib/email/email-mode.ts`) devuelve `live`.

| Entorno | Resultado |
|---|---|
| Producción en Vercel (`NODE_ENV=production`, `VERCEL_ENV=production`) | Envía, sin configuración adicional |
| Preview o development de Vercel (`VERCEL_ENV` distinto de `production`) | Bloqueado siempre, incluso con `EMAIL_MODE=live` |
| GitHub Actions (`GITHUB_ACTIONS=true`) | Bloqueado siempre |
| `EMAIL_MODE=disabled` | Bloqueado (también sirve como interruptor de emergencia en producción) |
| `EMAIL_MODE=live` | Envía, salvo en preview o GitHub Actions |
| `EMAIL_MODE` con otro valor | Bloqueado |
| Desarrollo local (`next dev`) y pruebas sin `EMAIL_MODE` | Bloqueado |

Cuando el envío se bloquea, `sendEmail` devuelve `{ success: false, skipped: true }`: los llamadores muestran o registran el mismo aviso que ante una configuración incompleta (`EMAIL_SEND_FAILED`). El registro no incluye el destinatario.

Notas:

- Para probar un envío real desde desarrollo hay que agregar `EMAIL_MODE=live` al `.env` local de forma deliberada.
- `next start` local se ejecuta con `NODE_ENV=production`: cualquier prueba E2E futura debe arrancar el servidor con `EMAIL_MODE=disabled`.
- Los reportes de SmartNFC Local mantienen su propio interruptor, `LOCAL_REPORT_EMAIL_MODE` (por defecto `disabled`).
- Verificación: `npm run test:security` (incluye `scripts/tests/email-mode.test.ts`).
