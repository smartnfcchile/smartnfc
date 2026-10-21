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
  const vercelEnv = env.VERCEL_ENV;
  if (vercelEnv && vercelEnv !== "production") return { mode: "disabled", reason: `entorno Vercel '${vercelEnv}'` };
  if (env.GITHUB_ACTIONS === "true") return { mode: "disabled", reason: "GitHub Actions" };

  const explicit = env.EMAIL_MODE?.trim();
  if (explicit === "disabled") return { mode: "disabled", reason: "EMAIL_MODE=disabled" };
  if (explicit === "live") return { mode: "live", reason: "EMAIL_MODE=live" };
  if (explicit) return { mode: "disabled", reason: "EMAIL_MODE con valor no reconocido" };

  if (env.NODE_ENV === "production") return { mode: "live", reason: "producción" };
  return { mode: "disabled", reason: `NODE_ENV '${env.NODE_ENV ?? "sin definir"}'` };
}
