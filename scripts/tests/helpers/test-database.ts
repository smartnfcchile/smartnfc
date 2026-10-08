// Database isolation for every scripts/tests suite (incident H4, 2026-09-22).
//
// Every suite imports this module FIRST. Prisma Client fills process.env.DATABASE_URL from .env
// when the variable is absent, and the developer .env may point to production (Neon). On import,
// this module replaces whatever DATABASE_URL/DIRECT_URL the test process inherited (shell, CI or
// .env) with an unresolvable sentinel. A suite, or any app module it loads, can therefore only reach
// a database it explicitly opted into through selectDisposableDatabase(), which accepts loopback
// PostgreSQL only. Forgetting to opt in fails closed (connection error) instead of silently writing
// to whatever .env points at.
//
// This module never connects to any database and never prints credentials.

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

// RFC 6761: names under .invalid never resolve.
export const BLOCKED_DATABASE_URL = "postgresql://blocked@smartnfc-test-database-not-selected.invalid:5432/blocked";

export type DisposableCheck = { ok: true; url: URL } | { ok: false; reason: string };

export function checkDisposableDatabaseUrl(raw: string | undefined, options: { requireNameIncludes?: string } = {}): DisposableCheck {
  if (!raw || raw.trim() === "") return { ok: false, reason: "URL no configurada" };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "URL inválida" };
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") return { ok: false, reason: `protocolo no permitido (${url.protocol})` };
  if (!LOOPBACK_HOSTS.has(url.hostname.toLowerCase())) return { ok: false, reason: `host no local (${url.hostname}); solo se admite PostgreSQL desechable en loopback` };
  // libpq-style overrides could redirect a loopback-looking URL elsewhere.
  for (const key of url.searchParams.keys()) {
    if (["host", "hostaddr", "service"].includes(key.toLowerCase())) return { ok: false, reason: `parámetro '${key}' no permitido` };
  }
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!database) return { ok: false, reason: "falta el nombre de la base" };
  if (options.requireNameIncludes && !database.includes(options.requireNameIncludes)) {
    return { ok: false, reason: `el nombre de la base debe incluir '${options.requireNameIncludes}'` };
  }
  return { ok: true, url };
}

// Points DATABASE_URL at a verified disposable database. Throws (never falls back) otherwise.
export function selectDisposableDatabase(raw: string | undefined, options: { requireNameIncludes?: string } = {}): string {
  const check = checkDisposableDatabaseUrl(raw, options);
  if (!check.ok) {
    throw new Error(`[test-database] Base de pruebas rechazada: ${check.reason}. Nunca Neon, nunca producción.`);
  }
  process.env.DATABASE_URL = raw!;
  process.env.DIRECT_URL = raw!;
  return raw!;
}

process.env.DATABASE_URL = BLOCKED_DATABASE_URL;
process.env.DIRECT_URL = BLOCKED_DATABASE_URL;
