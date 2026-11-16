// Lanzador del servidor E2E de SmartNFC (Fase A del plan E2E).
//
// Uso (siempre a través de los scripts de package.json):
//   npm run e2e:check    → solo valida el entorno; no se conecta a nada.
//   npm run e2e:prepare  → valida y aplica migraciones SOLO sobre la base desechable.
//   npm run e2e:build    → valida y compila con la configuración E2E (deja una marca en .next).
//   npm run e2e          → Playwright arranca este lanzador en modo "start" (o "dev" con E2E_SERVER_MODE=dev).
//
// Protecciones:
//   1. La base se toma SOLO de E2E_DATABASE_URL. El DATABASE_URL heredado (shell o .env) se ignora.
//   2. Las variables de servicios reales se fuerzan a "" para que los archivos .env no puedan rellenarlas.
//   3. Se replica la carga de .env que hará Next.js (@next/env) y se valida el entorno EFECTIVO.
//   4. Si algo no cumple, el proceso termina con código 1 antes de conectarse a la base o abrir el puerto.
//   5. En modo start se exige una compilación hecha por este lanzador con la misma URL pública.

import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { E2E_DEFAULT_PORT, FORBIDDEN_NON_EMPTY_VARS, findE2EEnvironmentViolations } from "./env-guard";

type Mode = "check-only" | "migrate" | "build" | "start" | "dev";
/** Entorno plano (sin las restricciones de tipos que el proyecto agrega a NodeJS.ProcessEnv). */
export type Env = Record<string, string | undefined>;

const ROOT = path.resolve(__dirname, "../..");
const BUILD_MARKER = path.join(ROOT, ".next", "e2e-build.json");

function parseMode(argv: string[]): Mode {
  const flag = argv.find((a) => a.startsWith("--"));
  switch (flag) {
    case "--check-only": return "check-only";
    case "--migrate": return "migrate";
    case "--build": return "build";
    case "--dev": return "dev";
    case "--start":
    case undefined: return "start";
    default:
      fail([`opción desconocida: ${flag}`]);
  }
}

function fail(reasons: string[]): never {
  console.error("\n[e2e-guard] ENTORNO E2E RECHAZADO. No se inició nada.");
  for (const r of reasons) console.error(`  - ${r}`);
  console.error("Revisa docs/e2e.md. El E2E solo corre contra PostgreSQL desechable en loopback y sin servicios reales.\n");
  process.exit(1);
}

export function e2ePort(env: Env = process.env) {
  const raw = env.E2E_PORT?.trim();
  const port = raw ? Number(raw) : E2E_DEFAULT_PORT;
  if (!Number.isInteger(port) || port < 1024 || port > 65535) fail([`E2E_PORT inválido (${raw})`]);
  return port;
}

/** Entorno que recibirá Next.js, construido desde cero para E2E. */
export function buildServerEnv(inherited: Env, mode: Mode): Env {
  const port = e2ePort(inherited);
  const appUrl = `http://127.0.0.1:${port}`;
  const env: Env = { ...inherited };

  env.SMARTNFC_E2E = "1";
  env.DATABASE_URL = inherited.E2E_DATABASE_URL ?? "";
  env.DIRECT_URL = env.DATABASE_URL;
  env.NEXTAUTH_URL = appUrl;
  env.NEXT_PUBLIC_APP_URL = appUrl;
  env.NEXTAUTH_SECRET = randomBytes(32).toString("hex");
  env.IP_HASH_SECRET = randomBytes(32).toString("hex");
  env.EMAIL_MODE = "disabled";
  env.LOCAL_REPORT_EMAIL_MODE = "disabled";
  env.EMAIL_FROM = "SmartNFC E2E <no-reply@smartnfc.test>";
  env.NEXT_TELEMETRY_DISABLED = "1";
  // "" (y no undefined): @next/env no sobrescribe variables ya definidas, aunque estén vacías.
  for (const key of FORBIDDEN_NON_EMPTY_VARS) env[key] = "";
  for (const key of ["SMARTNFC_PRODUCTION_EMAIL", "LOCAL_REPORT_SUPPORT_EMAIL", "GOOGLE_SITE_VERIFICATION", "SUPER_ADMIN_EMAIL", "SEED_SUPERADMIN_EMAIL", "SEED_SUPERADMIN_PASSWORD"]) env[key] = "";
  // Next fija NODE_ENV según el comando; se replica para que la validación lea los mismos .env.
  env.NODE_ENV = mode === "dev" ? "development" : "production";
  return env;
}

/** Aplica la misma carga de .env que hará Next.js y devuelve el entorno efectivo. */
export function effectiveEnv(serverEnv: Env, mode: Mode, cwd = ROOT): Env {
  const saved = process.env;
  process.env = { ...serverEnv } as NodeJS.ProcessEnv;
  try {
    const { combinedEnv } = loadEnvConfig(cwd, mode === "dev", { info: () => {}, error: console.error }, true);
    return { ...combinedEnv };
  } finally {
    process.env = saved;
  }
}

function portInUse(port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => resolve(false));
  });
}

function run(cmd: string, args: string[], env: Env) {
  return new Promise<number>((resolve) => {
    const child = spawn(cmd, args, { cwd: ROOT, env: env as NodeJS.ProcessEnv, stdio: "inherit" });
    const forward = (sig: NodeJS.Signals) => child.kill(sig);
    process.on("SIGINT", forward);
    process.on("SIGTERM", forward);
    child.on("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

const bin = {
  next: path.join(ROOT, "node_modules", "next", "dist", "bin", "next"),
  prisma: path.join(ROOT, "node_modules", "prisma", "build", "index.js"),
};

async function main() {
  const mode = parseMode(process.argv.slice(2));
  const serverEnv = buildServerEnv(process.env, mode);
  const effective = effectiveEnv(serverEnv, mode);
  const violations = findE2EEnvironmentViolations(effective);
  if (violations.length) fail(violations);

  const port = e2ePort(serverEnv);
  console.log(`[e2e-guard] Entorno E2E válido: base desechable en loopback, app en http://127.0.0.1:${port}, correo y servicios externos bloqueados.`);
  if (mode === "check-only") return;

  if (mode === "migrate") {
    process.exit(await run(process.execPath, [bin.prisma, "migrate", "deploy"], effective));
  }

  if (mode === "build") {
    const gen = await run(process.execPath, [bin.prisma, "generate"], effective);
    if (gen !== 0) process.exit(gen);
    const code = await run(process.execPath, [bin.next, "build"], effective);
    if (code === 0) {
      fs.writeFileSync(BUILD_MARKER, JSON.stringify({ appUrl: effective.NEXT_PUBLIC_APP_URL, builtAt: new Date().toISOString() }, null, 2));
      console.log("[e2e-guard] Compilación E2E lista.");
    }
    process.exit(code);
  }

  if (await portInUse(port)) fail([`el puerto ${port} ya está en uso; el E2E nunca reutiliza un servidor existente`]);

  if (mode === "start") {
    let marker: { appUrl?: string } | null = null;
    try { marker = JSON.parse(fs.readFileSync(BUILD_MARKER, "utf8")); } catch { /* sin marca */ }
    if (!marker || marker.appUrl !== effective.NEXT_PUBLIC_APP_URL) {
      fail(["no hay una compilación E2E para esta URL. Ejecuta primero: npm run e2e:build (o usa E2E_SERVER_MODE=dev)"]);
    }
    process.exit(await run(process.execPath, [bin.next, "start", "-H", "127.0.0.1", "-p", String(port)], effective));
  }

  // mode === "dev": solo uso local, sin compilación previa.
  if (effective.CI) fail(["el modo dev no se usa en CI"]);
  process.exit(await run(process.execPath, [bin.next, "dev", "-H", "127.0.0.1", "-p", String(port)], effective));
}

if (require.main === module) {
  main().catch((error) => {
    console.error("[e2e-guard] Error inesperado:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
