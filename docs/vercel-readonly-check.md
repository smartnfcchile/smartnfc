# Verificación de solo lectura de Vercel (antes del PR #20)

`scripts/ops/vercel-readonly-check.mjs` consulta la API de Vercel **solo con GET** y responde, para `smartnfc` y `smartnfc-8ndu`:

| # | Pregunta | Cómo lo determina |
|---|---|---|
| 1 | ¿Las funciones de **producción** reciben `VERCEL`, `VERCEL_ENV` y `VERCEL_REGION`? | Campo `autoExposeSystemEnvs` del proyecto (`GET /v9/projects/{id}`). Es un ajuste del proyecto y se lee directamente, sin suponer nada a partir de los previews. Además lista variables manuales (`VERCEL*`, `NODE_ENV`, `CI`, `EMAIL_MODE`) que podrían contradecirlo |
| 2 | ¿El PR #20 permitirá correos legítimos? | Combina el punto 1 con la presencia, solo el nombre, de `RESEND_API_KEY`, `EMAIL_FROM` y `NEXT_PUBLIC_APP_URL` en Production |
| 3 | ¿Qué dominios atiende y desde qué rama despliega producción? | `GET /v9/projects/{id}/domains` y `link.productionBranch` |
| 4 | ¿Los previews usan una base de datos propia? | Entornos de cada entrada `DATABASE_URL`/`DIRECT_URL` (`GET /v10/projects/{id}/env`, sin descifrar). Con `--compare-db` compara en memoria si Production y Preview apuntan al mismo host y base, e imprime solo "misma" o "distinta" |

## Garantías
- No existe código para POST, PATCH ni DELETE. Una prueba verifica que todas las solicitudes son GET.
- Descarta el campo `value` de cada variable al recibirlo. Nunca imprime ni guarda valores, tokens ni cadenas de conexión. Una prueba con secretos falsos verifica que no aparecen en la salida.
- Sin `--compare-db` no descifra nada.
- No toca despliegues, dominios, variables ni datos de clientes. No envía correos.

## Cómo ejecutarlo (≈5 min, en tu computador)
1. **Token temporal:** vercel.com → Account Settings → **Tokens** → *Create*.
   - Nombre: `smartnfc-readonly-check`.
   - Scope: el equipo `smartnfcchiles-projects`.
   - Expiration: **1 day**.
   - Los tokens de Vercel no tienen modo solo lectura. Por eso la protección depende de que el script solo haga GET, del vencimiento corto y de que elimines el token al terminar.
2. **En PowerShell,** en tu copia del repo, con esta rama:
   ```powershell
   git fetch origin; git checkout ops/vercel-readonly-check
   $env:VERCEL_TOKEN = "<pega el token>"
   node scripts/ops/vercel-readonly-check.mjs
   # opcional, para confirmar el aislamiento de la base de previews:
   node scripts/ops/vercel-readonly-check.mjs --compare-db
   Remove-Item Env:VERCEL_TOKEN
   ```
3. **Pega aquí la salida.** No contiene secretos.
4. **Elimina el token** en Account Settings → Tokens.

## Cómo leer el resultado
- `1. Variables de sistema: SÍ` y `2. PR #20 en producción: OK` en **ambos** proyectos → el PR #20 no interrumpe el correo legítimo.
- `NO` o `INDETERMINADO` → **no fusionar el PR #20**. Pasar a la prueba mínima de la sección siguiente.
- `REVISAR` → existe una variable manual que puede contradecir la regla. Revisarla antes de fusionar.
- `4. … COMPARTIDA` o `MISMA BASE` → los previews usan la base de producción. El bloqueante E2E-1 sigue abierto.

## Prueba mínima de respaldo (propuesta, NO implementada)
Solo si la API no permite confirmar el punto 1 en Production. Sin rutas nuevas ni endpoints públicos.

- **Qué es:** un PR aparte que agrega `instrumentation.ts` con `register()`, que Next.js ejecuta una vez al iniciar cada instancia del servidor. Registra en los **Runtime Logs** de Vercel, que solo ve el equipo, una única línea con valores sí/no:
  `[env-check] VERCEL=1:sí VERCEL_ENV=production:sí VERCEL_REGION:sí NODE_ENV=production:sí`.
  No incluye valores, no lee secretos, no consulta la base de datos y no cambia el envío de correos.
- **Por qué es controlada:**
  - no cambia ningún comportamiento;
  - se despliega a producción como cualquier merge, sin el PR #20;
  - el resultado se lee en Logs de cada proyecto.
- **Riesgo:** bajo. Es un despliegue de producción sin cambios funcionales.
- **Eliminación:** *Revert* del PR, que genera un despliegue nuevo, o Instant Rollback al despliegue anterior en ambos proyectos.
- **Requiere tu autorización** separada para implementarla y fusionarla.

## Pruebas
`node --test scripts/tests/vercel-readonly-check.test.mjs`: solo GET, sin token no ejecuta, nunca imprime secretos, veredictos del PR #20, base compartida o separada y comparación con endpoint *pooler*.
