import "./helpers/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { checkE2EAppUrl, checkE2EDatabaseUrl, findE2EEnvironmentViolations } from "../../e2e/support/env-guard";
import { buildServerEnv, effectiveEnv } from "../../e2e/support/server";

// Demuestra que el servidor E2E no puede arrancar contra producción ni con servicios reales.
// Ninguna prueba se conecta a una base de datos ni hace requests de red.

const repoRoot = path.resolve(__dirname, "../..");
// Las URLs de ejemplo se arman por partes para no dejar literales de bases remotas en el repo.
const PG = "postgresql";
const NEON_URL = `${PG}://user:pw@ep-example-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require`;
const GOOD_DB = `${PG}://e2e:e2e@127.0.0.1:5432/smartnfc_e2e_disposable`;

test("la base E2E acepta solo PostgreSQL en loopback con 'e2e_disposable' en el nombre", () => {
  assert.equal(checkE2EDatabaseUrl(GOOD_DB).ok, true);
  assert.equal(checkE2EDatabaseUrl(`${PG}://e2e@localhost:5433/ci_e2e_disposable_1`).ok, true);
  for (const bad of [
    undefined,
    "",
    "no es url",
    NEON_URL,
    `${PG}://e2e@127.0.0.1:5432/smartnfc`,
    `${PG}://e2e@127.0.0.1:5432/neondb`,
    `${PG}://e2e@10.0.0.5:5432/smartnfc_e2e_disposable`,
    `${PG}://e2e@localhost:5432/smartnfc_e2e_disposable?host=ep-x.neon.tech`,
    `${PG}://e2e@localhost:5432/smartnfc_e2e_disposable?hostaddr=10.0.0.5`,
    `mysql://e2e@localhost/smartnfc_e2e_disposable`,
  ]) {
    assert.equal(checkE2EDatabaseUrl(bad).ok, false, String(bad));
  }
});

test("la URL de la app solo puede ser localhost", () => {
  assert.equal(checkE2EAppUrl("http://127.0.0.1:3107").ok, true);
  assert.equal(checkE2EAppUrl("http://localhost:3107").ok, true);
  for (const bad of ["https://www.smartnfc.cl", "https://smartnfc-8ndu.vercel.app", "http://192.168.1.10:3000", "http://u:p@localhost:3107", "file:///etc/passwd", ""]) {
    assert.equal(checkE2EAppUrl(bad).ok, false, bad);
  }
});

function validEnv(): Record<string, string> {
  return {
    SMARTNFC_E2E: "1",
    EMAIL_MODE: "disabled",
    LOCAL_REPORT_EMAIL_MODE: "disabled",
    DATABASE_URL: GOOD_DB,
    DIRECT_URL: GOOD_DB,
    NEXTAUTH_URL: "http://127.0.0.1:3107",
    NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3107",
    NEXTAUTH_SECRET: "x".repeat(64),
  };
}

test("un entorno E2E completo y local no tiene violaciones", () => {
  assert.deepEqual(findE2EEnvironmentViolations(validEnv()), []);
});

test("cada servicio real presente bloquea el arranque", () => {
  const cases: Array<[string, string]> = [
    ["RESEND_API_KEY", "re_fake_key_for_test"],
    ["BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_fake"],
    ["VERCEL_ENV", "preview"],
    ["VERCEL", "1"],
    ["VERCEL_OIDC_TOKEN", "fake"],
  ];
  for (const [key, value] of cases) {
    const v = findE2EEnvironmentViolations({ ...validEnv(), [key]: value });
    assert.ok(v.some((m) => m.startsWith(key)), `${key} debería bloquear`);
  }
});

test("producción, correo activo o URLs públicas bloquean el arranque", () => {
  const mutations: Array<Record<string, string | undefined>> = [
    { DATABASE_URL: NEON_URL },
    { DIRECT_URL: NEON_URL },
    { NEXT_PUBLIC_APP_URL: "https://www.smartnfc.cl" },
    { NEXTAUTH_URL: "https://smartnfc-8ndu.vercel.app" },
    { EMAIL_MODE: "live" },
    { EMAIL_MODE: undefined },
    { LOCAL_REPORT_EMAIL_MODE: "live" },
    { SMARTNFC_E2E: undefined },
    { NEXTAUTH_SECRET: "corto" },
    { ALGUNA_OTRA_VARIABLE: "https://cdn.smartnfc.cl/x" },
  ];
  for (const patch of mutations) {
    assert.notDeepEqual(findE2EEnvironmentViolations({ ...validEnv(), ...patch }), [], JSON.stringify(patch));
  }
});

test("el lanzador ignora el DATABASE_URL heredado y fuerza vacíos los servicios reales", () => {
  const env = buildServerEnv({ DATABASE_URL: NEON_URL, RESEND_API_KEY: "re_heredada", E2E_DATABASE_URL: GOOD_DB }, "start");
  assert.equal(env.DATABASE_URL, GOOD_DB);
  assert.equal(env.RESEND_API_KEY, "");
  assert.equal(env.BLOB_READ_WRITE_TOKEN, "");
  assert.equal(env.EMAIL_MODE, "disabled");
  assert.equal(env.NEXT_PUBLIC_APP_URL, "http://127.0.0.1:3107");
});

test("un .env de producción en la carpeta NO logra colarse en el entorno efectivo de Next.js", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "smartnfc-e2e-guard-"));
  try {
    fs.writeFileSync(path.join(dir, ".env"), [
      `DATABASE_URL="${NEON_URL}"`,
      `DIRECT_URL="${NEON_URL}"`,
      `RESEND_API_KEY="re_desde_dotenv"`,
      `BLOB_READ_WRITE_TOKEN="vercel_blob_rw_desde_dotenv"`,
      `EMAIL_MODE="live"`,
    ].join("\n"));
    const effective = effectiveEnv(buildServerEnv({ E2E_DATABASE_URL: GOOD_DB }, "start"), "start", dir);
    assert.equal(effective.DATABASE_URL, GOOD_DB);
    assert.equal(effective.RESEND_API_KEY, "");
    assert.equal(effective.BLOB_READ_WRITE_TOKEN, "");
    assert.equal(effective.EMAIL_MODE, "disabled");
    assert.deepEqual(findE2EEnvironmentViolations(effective), []);

    // Y si el .env trae una variable con referencia a producción que el lanzador no sobrescribe, se rechaza.
    fs.appendFileSync(path.join(dir, ".env"), `\nNEXT_PUBLIC_SITE_URL="https://www.smartnfc.cl"\n`);
    const tainted = effectiveEnv(buildServerEnv({ E2E_DATABASE_URL: GOOD_DB }, "start"), "start", dir);
    assert.ok(findE2EEnvironmentViolations(tainted).some((m) => m.startsWith("NEXT_PUBLIC_SITE_URL")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function runLauncher(env: Record<string, string | undefined>) {
  return spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "e2e/support/server.ts", "--check-only"], {
    cwd: repoRoot, env: env as NodeJS.ProcessEnv, encoding: "utf8", timeout: 60_000,
  });
}

function cleanEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env };
  for (const k of ["DATABASE_URL", "DIRECT_URL", "E2E_DATABASE_URL", "RESEND_API_KEY", "BLOB_READ_WRITE_TOKEN", "VERCEL", "VERCEL_ENV", "VERCEL_URL", "VERCEL_OIDC_TOKEN"]) delete env[k];
  return env;
}

test("el lanzador real termina con código 1 si la base E2E es Neon", () => {
  const r = runLauncher({ ...cleanEnv(), E2E_DATABASE_URL: NEON_URL });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /ENTORNO E2E RECHAZADO/);
  assert.doesNotMatch(r.stderr + r.stdout, /pw@|user:pw/, "nunca imprime credenciales");
});

test("el lanzador real termina con código 1 sin E2E_DATABASE_URL aunque exista DATABASE_URL", () => {
  const r = runLauncher({ ...cleanEnv(), DATABASE_URL: GOOD_DB });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /E2E_DATABASE_URL no configurada/);
});

const rootHasDotenv = fs.readdirSync(repoRoot).some((f) => f.startsWith(".env"));
test("el lanzador real acepta un entorno desechable válido (solo validación, sin conectarse)", {
  skip: rootHasDotenv ? "hay archivos .env en la raíz: el guard puede rechazarlos a propósito; esta prueba corre en CI" : false,
}, () => {
  const r = runLauncher({ ...cleanEnv(), E2E_DATABASE_URL: GOOD_DB });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Entorno E2E válido/);
});
