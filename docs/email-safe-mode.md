# Modo seguro de correo transaccional

`lib/email/send-email.ts` (invitaciones, activación, restablecimiento de contraseña, avisos de producción de tarjetas) solo envía correos reales cuando `resolveEmailMode()` (`lib/email/email-mode.ts`) devuelve `live`.

## Regla: lista de permitidos

Se envía **solo** si todas estas condiciones se cumplen a la vez. Esto confirma que el código corre como función de un despliegue de producción en Vercel:

| Variable | Valor exigido | Por qué |
|---|---|---|
| `NODE_ENV` | `production` | Compilación de producción |
| `VERCEL` | `1` | Vercel expone sus variables de sistema |
| `VERCEL_ENV` | `production` | No es un preview ni development |
| `VERCEL_TARGET_ENV` | ausente o `production` | Coherencia con `VERCEL_ENV` |
| `VERCEL_REGION` | definida y distinta de `dev1` | Solo existe en ejecución dentro de Vercel. `vercel env pull` no la escribe y `vercel dev` usa `dev1` |
| `CI`, `GITHUB_ACTIONS` | ausentes, `false` o `0` | Nunca desde CI |
| `EMAIL_MODE` | ausente o `live` | `disabled` es el interruptor de emergencia |

Cualquier ausencia, valor inesperado (vacío, mayúsculas, espacios) o contradicción **bloquea**.

## Casos cerrados respecto de la versión anterior

| Caso | Antes | Ahora |
|---|---|---|
| `next start` local con `NODE_ENV=production` y un `.env` real (sin `VERCEL_ENV`) | enviaba | bloquea |
| `.env` copiado desde Vercel Production (`VERCEL=1`, `VERCEL_ENV=production`) + `next start` local | enviaba | bloquea (falta `VERCEL_REGION`) |
| `vercel dev` con variables de producción | enviaba | bloquea (`NODE_ENV=development` / `dev1`) |
| `EMAIL_MODE=live` en desarrollo local | enviaba | bloquea. **Ya no hay opt-in local** |
| `VERCEL_TARGET_ENV` distinto de `VERCEL_ENV` | no se revisaba | bloquea |
| `CI=1` (otros sistemas de CI) | no se revisaba | bloquea |

## Operación legítima en producción

No requiere variables nuevas. `VERCEL`, `VERCEL_ENV` y `VERCEL_REGION` las pone Vercel en ejecución **si el proyecto tiene activada la opción "Automatically expose System Environment Variables"** (Settings → Environment Variables).

**Antes del merge:** verificar esa casilla en los dos proyectos (`smartnfc` y `smartnfc-8ndu`). Si está desactivada, el correo de producción se bloquearía.

**Después del despliegue:** pedir un restablecimiento de contraseña para una cuenta propia y confirmar que llega.

Si producción queda bloqueada por una configuración incompleta, `sendEmail` registra `console.error("[sendEmail] ALERTA: ...")`, visible en los logs de Vercel. El interruptor deliberado (`EMAIL_MODE=disabled`) no genera alerta.

## Comportamiento cuando se bloquea

`sendEmail` devuelve `{ success: false, skipped: true }`. Los llamadores muestran o registran el mismo aviso que ante una configuración incompleta (`EMAIL_SEND_FAILED`). El registro no incluye el destinatario.

## Notas

- Para probar plantillas sin enviar, usar las pruebas con el doble de Resend (`scripts/tests/email-mode.test.ts`) o React Email en local.
- Los reportes de SmartNFC Local mantienen su propio interruptor, `LOCAL_REPORT_EMAIL_MODE` (por defecto `disabled`).
- Verificación: `npm run test:security`.
