// Guard del entorno E2E (Fase A del plan E2E, 26-10-2026).
//
// Funciones puras: no se conectan a ninguna base, no hacen requests y nunca imprimen credenciales.
// Las usan el lanzador del servidor E2E (e2e/support/server.ts), playwright.config.ts y sus pruebas
// (scripts/tests/e2e-env-guard.test.ts).
//
// Regla: el servidor E2E solo arranca si TODAS las condiciones se cumplen. Ante cualquier duda, se niega.

export const E2E_DATABASE_NAME_MARKER = "e2e_disposable";
export const E2E_DEFAULT_PORT = 3107;

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

// Variables que, si traen un valor, permitirían tocar servicios reales (correo, archivos, plataforma de Vercel).
export const FORBIDDEN_NON_EMPTY_VARS = [
  "RESEND_API_KEY",
  "BLOB_READ_WRITE_TOKEN",
  "BLOB_STORE_ID",
  "VERCEL_OIDC_TOKEN",
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_TARGET_ENV",
  "VERCEL_REGION",
  "VERCEL_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
] as const;

// Si aparecen en CUALQUIER variable del entorno efectivo, el entorno se considera conectado a producción.
export const PRODUCTION_MARKERS = [
  "neon.tech",
  "neon.build",
  "smartnfc.cl",
  "vercel.app",
  "vercel-storage.com",
  "blob.vercel",
] as const;

// Modos de correo exigidos. Con el PR #20, sendEmail() solo envía en producción de Vercel confirmada
// (VERCEL=1, VERCEL_ENV=production, VERCEL_REGION); aquí todas esas variables quedan vacías. LOCAL_REPORT_EMAIL_MODE lo usa lib/local/report-transport.ts.
export const REQUIRED_EXACT_VALUES: Record<string, string> = {
  SMARTNFC_E2E: "1",
  EMAIL_MODE: "disabled",
  LOCAL_REPORT_EMAIL_MODE: "disabled",
};

export type Check = { ok: true } | { ok: false; reason: string };

function hostnameOf(url: URL) {
  return url.hostname.toLowerCase();
}

/** Base de datos E2E: PostgreSQL en loopback y con "e2e_disposable" en el nombre. */
export function checkE2EDatabaseUrl(raw: string | undefined): Check {
  if (!raw || raw.trim() === "") return { ok: false, reason: "E2E_DATABASE_URL no configurada" };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "URL de base inválida" };
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") return { ok: false, reason: `protocolo de base no permitido (${url.protocol})` };
  if (!LOOPBACK_HOSTS.has(hostnameOf(url))) return { ok: false, reason: `host de base no local (${redactHost(url.hostname)}); solo PostgreSQL desechable en loopback` };
  // Parámetros libpq que podrían redirigir una URL "local" a otro host.
  for (const key of url.searchParams.keys()) {
    if (["host", "hostaddr", "service", "options"].includes(key.toLowerCase())) return { ok: false, reason: `parámetro de base '${key}' no permitido` };
  }
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!database) return { ok: false, reason: "falta el nombre de la base" };
  if (!database.includes(E2E_DATABASE_NAME_MARKER)) return { ok: false, reason: `el nombre de la base debe incluir '${E2E_DATABASE_NAME_MARKER}'` };
  return { ok: true };
}

/** URL de la aplicación bajo prueba: solo http(s) en loopback, sin credenciales embebidas. */
export function checkE2EAppUrl(raw: string | undefined, label = "URL"): Check {
  if (!raw || raw.trim() === "") return { ok: false, reason: `${label} no configurada` };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: `${label} inválida` };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, reason: `${label}: protocolo no permitido (${url.protocol})` };
  if (url.username || url.password) return { ok: false, reason: `${label}: no se permiten credenciales en la URL` };
  if (!LOOPBACK_HOSTS.has(hostnameOf(url))) return { ok: false, reason: `${label}: host no local (${url.hostname}); el E2E solo apunta a localhost` };
  return { ok: true };
}

/**
 * Revisa el entorno EFECTIVO del servidor E2E (después de que Next.js cargue sus archivos .env).
 * Devuelve la lista de violaciones; vacía significa que el entorno es seguro.
 */
export function findE2EEnvironmentViolations(env: Record<string, string | undefined>): string[] {
  const violations: string[] = [];

  for (const [key, expected] of Object.entries(REQUIRED_EXACT_VALUES)) {
    if (env[key] !== expected) violations.push(`${key} debe ser exactamente "${expected}"`);
  }

  const db = checkE2EDatabaseUrl(env.DATABASE_URL);
  if (!db.ok) violations.push(`DATABASE_URL: ${db.reason}`);
  if (env.DIRECT_URL !== undefined && env.DIRECT_URL !== "" && env.DIRECT_URL !== env.DATABASE_URL) {
    violations.push("DIRECT_URL debe estar vacía o ser igual a DATABASE_URL");
  }

  for (const key of ["NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"]) {
    const check = checkE2EAppUrl(env[key], key);
    if (!check.ok) violations.push(check.reason);
  }

  for (const key of FORBIDDEN_NON_EMPTY_VARS) {
    if ((env[key] ?? "").trim() !== "") violations.push(`${key} debe estar vacía en E2E (servicio real)`);
  }

  for (const [key, value] of Object.entries(env)) {
    if (!value) continue;
    const lower = value.toLowerCase();
    const marker = PRODUCTION_MARKERS.find((m) => lower.includes(m));
    if (marker) violations.push(`${key} contiene una referencia de producción (${marker})`);
  }

  if ((env.NEXTAUTH_SECRET ?? "").length < 32) violations.push("NEXTAUTH_SECRET debe existir y tener al menos 32 caracteres (se genera por ejecución)");

  return violations;
}

/** Host censurado para mensajes (nunca muestra usuario ni contraseña). */
export function redactHost(host: string) {
  if (host.length <= 6) return host;
  return `${host.slice(0, 3)}…${host.slice(-12)}`;
}
