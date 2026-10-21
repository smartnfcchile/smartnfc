// Decide si la aplicación puede enviar correos transaccionales reales (invitaciones,
// restablecimiento de contraseña, avisos de producción) en el entorno actual.
//
// Producción en Vercel conserva su comportamiento: NODE_ENV=production y VERCEL_ENV=production
// permiten el envío sin configuración adicional. Cualquier otro entorno (desarrollo, pruebas,
// GitHub Actions, previews de Vercel) queda bloqueado salvo opt-in explícito con EMAIL_MODE=live,
// y los previews y GitHub Actions no envían nunca. Un valor desconocido de EMAIL_MODE bloquea.
//
// Los reportes de SmartNFC Local tienen su propio interruptor (LOCAL_REPORT_EMAIL_MODE).

export type EmailMode = "live" | "disabled";

export type EmailModeDecision = { mode: EmailMode; reason: string };

type Env = Record<string, string | undefined>;

export function resolveEmailMode(env: Env = process.env): EmailModeDecision {
  // Una variable definida con un valor inesperado (vacío, mayúsculas, otro texto) bloquea.
  const vercelEnv = env.VERCEL_ENV;
  if (vercelEnv !== undefined && vercelEnv !== "production") return { mode: "disabled", reason: `entorno Vercel '${vercelEnv}'` };
  const githubActions = env.GITHUB_ACTIONS;
  if (githubActions !== undefined && githubActions.trim() !== "" && githubActions.trim().toLowerCase() !== "false") {
    return { mode: "disabled", reason: "GitHub Actions" };
  }

  if (env.EMAIL_MODE !== undefined) {
    const explicit = env.EMAIL_MODE.trim();
    if (explicit === "live") return { mode: "live", reason: "EMAIL_MODE=live" };
    if (explicit === "disabled") return { mode: "disabled", reason: "EMAIL_MODE=disabled" };
    return { mode: "disabled", reason: explicit ? "EMAIL_MODE con valor no reconocido" : "EMAIL_MODE vacío" };
  }

  if (env.NODE_ENV === "production") return { mode: "live", reason: "producción" };
  return { mode: "disabled", reason: `NODE_ENV '${env.NODE_ENV ?? "sin definir"}'` };
}
