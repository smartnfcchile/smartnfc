// Guard de destino de base de datos para seeds y scripts de mantenimiento.
//
// Funciones puras: no conectan a ninguna base de datos y nunca devuelven credenciales.
// Los módulos con efecto (seed-guard.ts, maintenance-guard.ts) las aplican al proceso real.
//
// Reglas:
// - Seeds y utilidades de depuración: solo PostgreSQL en loopback. Sin excepción.
// - Mantenimiento: dry-run en cualquier destino (siempre mostrando el destino); --apply en loopback
//   permitido; --apply en un destino remoto exige --confirm-host=<host exacto> y nunca en CI.
// - La URL validada es la misma que usará Prisma: si DATABASE_URL no está en el entorno se lee
//   de los archivos .env igual que Prisma, y luego se fija en process.env antes de crear el cliente.

import fs from "node:fs";
import path from "node:path";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const REDIRECT_PARAMS = ["host", "hostaddr", "service"];
export const DB_URL_KEYS = ["DATABASE_URL", "DIRECT_URL"] as const;

type Env = Record<string, string | undefined>;

export type DatabaseTarget =
  | { kind: "loopback" | "remote"; host: string; redacted: string; redirect?: boolean }
  | { kind: "invalid"; reason: string; redacted: string };

export function describeDatabaseTarget(raw: string | undefined): DatabaseTarget {
  if (raw === undefined || raw.trim() === "") return { kind: "invalid", reason: "URL no configurada", redacted: "(sin URL)" };
  if (raw.includes("${")) return { kind: "invalid", reason: "URL con variables sin resolver", redacted: "(URL con variables)" };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { kind: "invalid", reason: "URL inválida", redacted: "(URL inválida)" };
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    return { kind: "invalid", reason: `protocolo no permitido (${url.protocol})`, redacted: "(protocolo no permitido)" };
  }
  const host = url.hostname.toLowerCase();
  const redacted = `${host}${url.port ? ":" + url.port : ""}${url.pathname}`;
  const redirect = [...url.searchParams.keys()].find((k) => REDIRECT_PARAMS.includes(k.toLowerCase()));
  if (!host) return { kind: "invalid", reason: "URL sin host", redacted };
  // Un parámetro host/hostaddr/service puede llevar una URL "local" a otro servidor: se trata como remoto.
  if (redirect) return { kind: "remote", host, redacted: `${redacted} (?${redirect}=…)`, redirect: true };
  return { kind: LOOPBACK_HOSTS.has(host) ? "loopback" : "remote", host, redacted };
}

// Parser mínimo de .env (KEY=VALUE, comillas simples/dobles, `export`, comentarios).
export function parseDotenv(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of content.replace(/^﻿/, "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let value = m[2].trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.lastIndexOf(quote) > 0) {
      value = value.slice(1, value.lastIndexOf(quote));
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    out[m[1]] = value;
  }
  return out;
}

export type ResolvedUrls = {
  values: Partial<Record<(typeof DB_URL_KEYS)[number], string>>;
  conflicts: string[];
};

// Reproduce de forma conservadora la carga de Prisma: el entorno del proceso tiene prioridad;
// si falta, se usan los .env candidatos. Valores distintos entre archivos se reportan como conflicto.
export function resolveDatabaseUrls(env: Env, dotenvFiles: string[]): ResolvedUrls {
  const values: ResolvedUrls["values"] = {};
  const conflicts: string[] = [];
  const parsed = dotenvFiles.filter((f) => fs.existsSync(f)).map((f) => ({ file: f, vars: parseDotenv(fs.readFileSync(f, "utf8")) }));
  for (const key of DB_URL_KEYS) {
    if (env[key] !== undefined) {
      values[key] = env[key];
      continue;
    }
    const found = [...new Set(parsed.map((p) => p.vars[key]).filter((v): v is string => v !== undefined))];
    if (found.length > 1) conflicts.push(key);
    else if (found.length === 1) values[key] = found[0];
  }
  return { values, conflicts };
}

export function defaultDotenvFiles(repoRoot: string, cwd: string): string[] {
  return [...new Set([path.join(cwd, ".env"), path.join(repoRoot, ".env"), path.join(repoRoot, "prisma", ".env")])];
}

export type GuardDecision = { allowed: true; summary: string } | { allowed: false; reason: string };

function describeAll(resolved: ResolvedUrls) {
  return DB_URL_KEYS.filter((k) => resolved.values[k] !== undefined).map((k) => ({ key: k, target: describeDatabaseTarget(resolved.values[k]) }));
}

// Seeds y utilidades locales: solo loopback.
export function decideSeedTarget(resolved: ResolvedUrls): GuardDecision {
  if (resolved.conflicts.length) return { allowed: false, reason: `valores distintos en archivos .env para ${resolved.conflicts.join(", ")}` };
  if (resolved.values.DATABASE_URL === undefined) return { allowed: false, reason: "DATABASE_URL no definida" };
  for (const { key, target } of describeAll(resolved)) {
    if (target.kind === "invalid") return { allowed: false, reason: `${key}: ${target.reason}` };
    if (target.kind !== "loopback") return { allowed: false, reason: `${key} apunta a un servidor no local (${target.redacted}). Los seeds solo se ejecutan contra PostgreSQL local desechable.` };
  }
  return { allowed: true, summary: describeDatabaseTarget(resolved.values.DATABASE_URL).redacted };
}

export function parseMaintenanceArgs(argv: string[]) {
  const apply = argv.includes("--apply") && !argv.includes("--dry-run");
  const confirm = argv.find((a) => a.startsWith("--confirm-host="));
  return { apply, confirmHost: confirm ? confirm.slice("--confirm-host=".length).trim().toLowerCase() : undefined };
}

function isCi(env: Env) {
  return [env.CI, env.GITHUB_ACTIONS].some((v) => v !== undefined && v.trim() !== "" && v.trim().toLowerCase() !== "false");
}

// Mantenimiento: dry-run en cualquier destino; --apply remoto solo con confirmación exacta del host.
export function decideMaintenanceTarget(resolved: ResolvedUrls, argv: string[], env: Env): GuardDecision {
  if (resolved.conflicts.length) return { allowed: false, reason: `valores distintos en archivos .env para ${resolved.conflicts.join(", ")}` };
  const db = describeDatabaseTarget(resolved.values.DATABASE_URL);
  if (db.kind === "invalid") return { allowed: false, reason: `DATABASE_URL: ${db.reason}` };
  const { apply, confirmHost } = parseMaintenanceArgs(argv);
  if (!apply) return { allowed: true, summary: `${db.redacted} · DRY-RUN` };

  const targets = describeAll(resolved);
  const invalid = targets.find((t) => t.target.kind === "invalid");
  if (invalid && invalid.target.kind === "invalid") return { allowed: false, reason: `${invalid.key}: ${invalid.target.reason}` };
  const remote = targets.filter((t) => t.target.kind === "remote");
  if (remote.length === 0) return { allowed: true, summary: `${db.redacted} · APPLY (local)` };

  if (isCi(env)) return { allowed: false, reason: "--apply contra un servidor remoto no está permitido en CI" };
  if (remote.some((t) => t.target.kind === "remote" && t.target.redirect)) {
    return { allowed: false, reason: "la URL redirige el host mediante parámetros (host/hostaddr/service); --apply no se puede confirmar" };
  }
  const hosts = new Set(remote.map((t) => (t.target.kind === "remote" ? t.target.host : "")));
  if (hosts.size > 1) return { allowed: false, reason: "DATABASE_URL y DIRECT_URL apuntan a servidores remotos distintos" };
  const [host] = [...hosts];
  if (!confirmHost) return { allowed: false, reason: `--apply sobre un servidor remoto (${db.redacted}) exige --confirm-host=<host> escrito a mano` };
  if (confirmHost !== host) return { allowed: false, reason: "--confirm-host no coincide con el host real de DATABASE_URL" };
  return { allowed: true, summary: `${db.redacted} · APPLY (remoto confirmado)` };
}
