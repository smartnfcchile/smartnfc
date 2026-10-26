// Decide si la aplicación puede enviar correos transaccionales reales (invitaciones,
// restablecimiento de contraseña, avisos de producción) en el entorno actual.
//
// Regla (lista de permitidos, no de bloqueados): solo se envía cuando TODAS las señales confirman
// una función ejecutándose dentro de un despliegue de PRODUCCIÓN de Vercel:
//
//   NODE_ENV=production                 compilación de producción de Next.js
//   VERCEL=1                            Vercel expone sus variables de sistema
//   VERCEL_ENV=production               despliegue de producción (no preview ni development)
//   VERCEL_TARGET_ENV ausente o production
//   VERCEL_REGION definida y ≠ dev1     solo existe en ejecución, dentro de la infraestructura de
//                                       Vercel; `vercel env pull` no la escribe y `vercel dev` usa dev1
//   sin CI ni GITHUB_ACTIONS
//   EMAIL_MODE ausente o "live"         EMAIL_MODE=disabled es el interruptor de emergencia
//
// Cualquier ausencia, valor inesperado (vacío, mayúsculas, espacios) o contradicción bloquea.
// Ya no existe opt-in local: EMAIL_MODE=live fuera de producción de Vercel NO envía.
//
// Los reportes de SmartNFC Local tienen su propio interruptor (LOCAL_REPORT_EMAIL_MODE).

export type EmailMode = "live" | "disabled";

export type EmailModeDecision = { mode: EmailMode; reason: string };

type Env = Record<string, string | undefined>;

const blocked = (reason: string): EmailModeDecision => ({ mode: "disabled", reason });

function isTruthyFlag(value: string | undefined) {
  if (value === undefined) return false;
  const v = value.trim().toLowerCase();
  return v !== "" && v !== "false" && v !== "0";
}

export function resolveEmailMode(env: Env = process.env): EmailModeDecision {
  // 1. Interruptor explícito. Se evalúa primero para que "disabled" gane siempre.
  if (env.EMAIL_MODE !== undefined) {
    const explicit = env.EMAIL_MODE.trim();
    if (explicit === "disabled") return blocked("EMAIL_MODE=disabled");
    if (explicit !== "live") return blocked(explicit ? "EMAIL_MODE con valor no reconocido" : "EMAIL_MODE vacío");
  }

  // 2. Integración continua: nunca, aunque el resto parezca producción.
  if (isTruthyFlag(env.GITHUB_ACTIONS)) return blocked("GitHub Actions");
  if (isTruthyFlag(env.CI)) return blocked("CI");

  // 3. Compilación de producción.
  if (env.NODE_ENV !== "production") return blocked(`NODE_ENV '${env.NODE_ENV ?? "sin definir"}'`);

  // 4. Despliegue de producción de Vercel, con señales coherentes entre sí.
  if (env.VERCEL !== "1") return blocked(env.VERCEL === undefined ? "fuera de Vercel (VERCEL sin definir)" : "VERCEL con valor inesperado");
  if (env.VERCEL_ENV !== "production") return blocked(`entorno Vercel '${env.VERCEL_ENV ?? "sin definir"}'`);
  if (env.VERCEL_TARGET_ENV !== undefined && env.VERCEL_TARGET_ENV !== "production") {
    return blocked(`VERCEL_TARGET_ENV '${env.VERCEL_TARGET_ENV}' contradice VERCEL_ENV`);
  }
  const region = env.VERCEL_REGION?.trim() ?? "";
  if (region === "") return blocked("sin VERCEL_REGION (no es una función en ejecución en Vercel)");
  if (region === "dev1") return blocked("vercel dev (VERCEL_REGION=dev1)");

  return { mode: "live", reason: "producción de Vercel confirmada" };
}

/**
 * true cuando el entorno se declara producción pero el envío quedó bloqueado: es la situación que
 * cortaría invitaciones y restablecimientos reales. sendEmail la registra como error visible.
 */
export function looksLikeBlockedProduction(env: Env = process.env, decision = resolveEmailMode(env)) {
  return decision.mode === "disabled" && env.NODE_ENV === "production" && (env.VERCEL_ENV === "production" || env.VERCEL === "1")
    && env.EMAIL_MODE?.trim() !== "disabled";
}
