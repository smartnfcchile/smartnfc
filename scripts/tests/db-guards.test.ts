import "./helpers/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  decideMaintenanceTarget,
  decideSeedTarget,
  describeDatabaseTarget,
  parseDotenv,
  resolveDatabaseUrls,
} from "../lib/db-target";
import { decideSuperadminSeed, seedPassword } from "../lib/seed-policy";

// Ninguna prueba de este archivo se conecta a una base de datos. Los destinos remotos usan el
// dominio reservado .invalid (RFC 6761), que nunca resuelve; los procesos hijos se detienen en el
// guard antes de cargar Prisma.

const scheme = "postgresql";
const LOCAL = `${scheme}://dev@127.0.0.1:5432/smartnfc_local`;
const LOCAL_NAMED = `${scheme}://dev@localhost:5432/smartnfc_local`;
const REMOTE = `${scheme}://u:p@db.example.invalid:5432/neondb`;
const REMOTE_OTHER = `${scheme}://u:p@other.example.invalid:5432/neondb`;
const LOCAL_REDIRECT = `${scheme}://u@localhost:5432/db?host=db.example.invalid`;

const repoRoot = path.resolve(__dirname, "..", "..");
const resolved = (values: Record<string, string | undefined>) => ({ values, conflicts: [] as string[] });

test("Destino: clasifica loopback, remoto, redirecciones e inválidos sin exponer credenciales", () => {
  assert.equal(describeDatabaseTarget(LOCAL).kind, "loopback");
  assert.equal(describeDatabaseTarget(LOCAL_NAMED).kind, "loopback");
  assert.equal(describeDatabaseTarget(`${scheme}://u@[::1]:5432/db`).kind, "loopback");
  assert.equal(describeDatabaseTarget(REMOTE).kind, "remote");
  assert.equal(describeDatabaseTarget(`${scheme}://u@10.0.0.5:5432/db`).kind, "remote");
  assert.equal(describeDatabaseTarget(LOCAL_REDIRECT).kind, "remote");
  for (const bad of [undefined, "", "   ", "not a url", "mysql://u@localhost/db", `${scheme}://u@localhost/\${DB}`]) {
    assert.equal(describeDatabaseTarget(bad).kind, "invalid", String(bad));
  }
  const target = describeDatabaseTarget(REMOTE);
  assert.ok(!target.redacted.includes("u:p") && !target.redacted.includes(":p@"), "nunca incluye credenciales");
});

test("Parser .env: comillas, export, comentarios y BOM", () => {
  const vars = parseDotenv(`﻿# comentario\nexport DATABASE_URL="${LOCAL}"\nDIRECT_URL='${LOCAL}' \nOTHER=valor # nota\nVACIO=\n`);
  assert.equal(vars.DATABASE_URL, LOCAL);
  assert.equal(vars.DIRECT_URL, LOCAL);
  assert.equal(vars.OTHER, "valor");
  assert.equal(vars.VACIO, "");
});

test("Resolución: el entorno manda; si falta se usa .env; valores distintos entre .env son conflicto", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "db-guard-"));
  try {
    const rootEnv = path.join(dir, ".env");
    const prismaEnv = path.join(dir, "prisma.env");
    fs.writeFileSync(rootEnv, `DATABASE_URL="${REMOTE}"\n`);
    assert.equal(resolveDatabaseUrls({}, [rootEnv]).values.DATABASE_URL, REMOTE, "sin variable en el entorno se lee .env como Prisma");
    assert.equal(resolveDatabaseUrls({ DATABASE_URL: LOCAL }, [rootEnv]).values.DATABASE_URL, LOCAL, "el entorno tiene prioridad");
    fs.writeFileSync(prismaEnv, `DATABASE_URL=${LOCAL}\n`);
    assert.deepEqual(resolveDatabaseUrls({}, [rootEnv, prismaEnv]).conflicts, ["DATABASE_URL"]);
    // Un .env remoto sin variable en el entorno bloquea el seed.
    assert.equal(decideSeedTarget(resolveDatabaseUrls({}, [rootEnv])).allowed, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("Seeds: solo PostgreSQL local, sin forma de saltarlo", () => {
  assert.equal(decideSeedTarget(resolved({ DATABASE_URL: LOCAL })).allowed, true);
  assert.equal(decideSeedTarget(resolved({ DATABASE_URL: LOCAL, DIRECT_URL: LOCAL_NAMED })).allowed, true);
  for (const values of [
    { DATABASE_URL: REMOTE },
    { DATABASE_URL: LOCAL, DIRECT_URL: REMOTE },
    { DATABASE_URL: LOCAL_REDIRECT },
    { DATABASE_URL: undefined },
    { DATABASE_URL: "" },
    { DATABASE_URL: "basura" },
  ]) {
    assert.equal(decideSeedTarget(resolved(values)).allowed, false, JSON.stringify(values));
  }
  assert.equal(decideSeedTarget({ values: { DATABASE_URL: LOCAL }, conflicts: ["DATABASE_URL"] }).allowed, false);
});

test("Mantenimiento: dry-run en cualquier destino; --apply remoto exige --confirm-host exacto y nunca en CI", () => {
  const remote = resolved({ DATABASE_URL: REMOTE });
  const decide = (r: ReturnType<typeof resolved>, argv: string[], env: Record<string, string | undefined> = {}) =>
    decideMaintenanceTarget(r, argv, env).allowed;

  assert.equal(decide(remote, []), true, "dry-run por defecto");
  assert.equal(decide(remote, ["--dry-run"]), true);
  assert.equal(decide(remote, ["--apply", "--dry-run"]), true, "--dry-run prevalece y no escribe");
  assert.equal(decide(resolved({ DATABASE_URL: LOCAL }), ["--apply"]), true, "--apply local permitido");

  assert.equal(decide(remote, ["--apply"]), false, "--apply remoto sin confirmación");
  assert.equal(decide(remote, ["--apply", "--confirm-host="]), false);
  assert.equal(decide(remote, ["--apply", "--confirm-host=other.example.invalid"]), false, "host distinto");
  assert.equal(decide(remote, ["--apply", "--confirm-host=db.example"]), false, "host parcial");
  assert.equal(decide(remote, ["--apply", "--confirm-host=db.example.invalid"]), true, "host exacto");
  assert.equal(decide(remote, ["--apply", "--confirm-host=DB.Example.Invalid"]), true, "sin distinguir mayúsculas");
  assert.equal(decide(remote, ["--apply", "--confirm-host=db.example.invalid"], { CI: "true" }), false, "nunca en CI");
  assert.equal(decide(remote, ["--apply", "--confirm-host=db.example.invalid"], { GITHUB_ACTIONS: "true" }), false);
  assert.equal(decide(resolved({ DATABASE_URL: LOCAL_REDIRECT }), ["--apply", "--confirm-host=localhost"]), false, "redirección por parámetro");
  assert.equal(decide(resolved({ DATABASE_URL: REMOTE, DIRECT_URL: REMOTE_OTHER }), ["--apply", "--confirm-host=db.example.invalid"]), false);
  assert.equal(decide(resolved({ DATABASE_URL: LOCAL, DIRECT_URL: REMOTE }), ["--apply"]), false, "DIRECT_URL remoto también exige confirmación");
  assert.equal(decide(resolved({ DATABASE_URL: undefined }), []), false, "sin destino no hay ni dry-run");
  assert.equal(decide({ values: { DATABASE_URL: REMOTE }, conflicts: ["DATABASE_URL"] }, []), false);
});

test("Seed: nunca promueve cuentas existentes a SUPERADMIN ni usa contraseñas fijas", () => {
  assert.deepEqual(decideSuperadminSeed(null, false), { action: "create" });
  assert.deepEqual(decideSuperadminSeed({ role: "SUPERADMIN" }, true), { action: "refresh-existing-superadmin", updatePassword: true });
  for (const role of ["COMPANY_OWNER", "COMPANY_ADMIN", "COLLABORATOR", "VENDOR", "OTRO"]) {
    assert.equal(decideSuperadminSeed({ role }, true).action, "refuse-promotion", role);
  }
  const a = seedPassword(undefined);
  const b = seedPassword("   ");
  assert.ok(a.generated && b.generated && a.value !== b.value && a.value.length >= 16, "aleatoria y distinta en cada ejecución");
  assert.deepEqual(seedPassword("desde-entorno"), { value: "desde-entorno", generated: false });
});

// --- Revisión estática del código protegido ---

const SEED_FILES = ["prisma/seed.ts", "prisma/seed-demo.ts", "prisma/seed-leads.ts", "prisma/seed-sarcarnico.ts", "query_current.ts"];
const MAINTENANCE_FILES = [
  ...fs.readdirSync(path.join(repoRoot, "scripts/maintenance")).filter((f) => f.endsWith(".ts")).map((f) => `scripts/maintenance/${f}`),
  "scripts/seed-physical-card-templates.ts",
];

function firstStatement(file: string): string {
  const src = fs.readFileSync(path.join(repoRoot, file), "utf8").replace(/^﻿/, "").replace(/\/\*[\s\S]*?\*\//g, "");
  return src.split(/\r?\n/).map((l) => l.trim()).find((l) => l !== "" && !l.startsWith("//")) ?? "";
}

test("Todo seed y utilidad local importa el seed-guard como primera instrucción", () => {
  const seeds = fs.readdirSync(path.join(repoRoot, "prisma")).filter((f) => /^seed.*\.ts$/.test(f)).map((f) => `prisma/${f}`);
  for (const s of seeds) assert.ok(SEED_FILES.includes(s), `seed nuevo sin cubrir: ${s}`);
  for (const file of SEED_FILES) {
    assert.match(firstStatement(file), /^import "(\.\.\/|\.\/)scripts\/lib\/seed-guard";$/, file);
  }
});

test("Todo script que escribe en la base importa el maintenance-guard como primera instrucción", () => {
  assert.ok(MAINTENANCE_FILES.length >= 4);
  for (const file of MAINTENANCE_FILES) {
    assert.match(firstStatement(file), /^import "(\.\.\/|\.\/)lib\/maintenance-guard";$/, file);
  }
});

test("Los seeds no contienen contraseñas literales, promociones por upsert ni empresas arbitrarias", () => {
  for (const file of SEED_FILES) {
    const src = fs.readFileSync(path.join(repoRoot, file), "utf8");
    assert.doesNotMatch(src, /bcrypt\.hash\(\s*["'`]/, `${file}: contraseña literal`);
    assert.doesNotMatch(src, /update:\s*\{[^}]*SUPERADMIN/, `${file}: promoción a SUPERADMIN en upsert`);
    assert.doesNotMatch(src, /company\.findFirst\(/, `${file}: selección arbitraria de empresa`);
  }
});

// --- Procesos reales: el guard detiene el script antes de cargar Prisma ---

function run(file: string, args: string[], env: Record<string, string | undefined>) {
  const childEnv: NodeJS.ProcessEnv = { ...process.env, ...env };
  for (const [k, v] of Object.entries(env)) if (v === undefined) delete childEnv[k];
  return spawnSync(process.execPath, [path.join(repoRoot, "node_modules/tsx/dist/cli.mjs"), file, ...args], {
    cwd: repoRoot,
    env: childEnv,
    encoding: "utf8",
    timeout: 60_000,
  });
}

test("Procesos: cada seed se niega a correr contra un servidor remoto", () => {
  for (const file of SEED_FILES) {
    for (const env of [
      { DATABASE_URL: REMOTE, DIRECT_URL: undefined },
      { DATABASE_URL: LOCAL, DIRECT_URL: REMOTE },
    ]) {
      const r = run(file, [], { ...env, SUPER_ADMIN_EMAIL: "qa@example.test" });
      assert.equal(r.status, 1, `${file} ${JSON.stringify(env)}\n${r.stderr}`);
      assert.match(r.stderr, /\[seed-guard\] Ejecución rechazada/, file);
      assert.doesNotMatch(r.stdout + r.stderr, /u:p@|:p@/, "no imprime credenciales");
    }
  }
});

test("Procesos: --apply remoto sin confirmación correcta o en CI se rechaza antes de conectar", () => {
  for (const file of MAINTENANCE_FILES) {
    for (const [args, extra] of [
      [["--apply"], {}],
      [["--apply", "--confirm-host=other.example.invalid"], {}],
      [["--apply", "--confirm-host=db.example.invalid"], { CI: "true" }],
    ] as Array<[string[], Record<string, string>]>) {
      const r = run(file, args, { DATABASE_URL: REMOTE, DIRECT_URL: undefined, CI: undefined, GITHUB_ACTIONS: undefined, ...extra });
      assert.equal(r.status, 1, `${file} ${args.join(" ")}\n${r.stderr}`);
      assert.match(r.stderr, /\[maintenance-guard\] Ejecución rechazada/, file);
      assert.doesNotMatch(r.stdout + r.stderr, /u:p@|:p@/, "no imprime credenciales");
    }
  }
});
