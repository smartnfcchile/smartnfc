import { selectDisposableDatabase } from "./helpers/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { PrismaClient } from "@prisma/client";

// Ejecuta los seeds reales contra un PostgreSQL desechable local (solo CI o desarrollo local).
// La base debe ser loopback y su nombre debe incluir "seed_guard_disposable"; si no, se omite
// (y el workflow de CI convierte esa omisión en fallo).

const url = process.env.SEED_GUARD_TEST_DATABASE_URL;
let allowed = false;
try {
  if (url) {
    selectDisposableDatabase(url, { requireNameIncludes: "seed_guard_disposable" });
    allowed = true;
  }
} catch {
  allowed = false;
}

const repoRoot = path.resolve(__dirname, "..", "..");

function run(file: string, args: string[], env: Record<string, string | undefined>) {
  const childEnv: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: url, ...env };
  delete childEnv.DIRECT_URL;
  for (const k of ["SUPER_ADMIN_EMAIL", "SEED_SUPERADMIN_EMAIL", "SEED_SUPERADMIN_PASSWORD", "SEED_DEMO_PASSWORD"]) {
    if (!(k in env)) delete childEnv[k];
  }
  return spawnSync(process.execPath, [path.join(repoRoot, "node_modules/tsx/dist/cli.mjs"), file, ...args], {
    cwd: repoRoot,
    env: childEnv,
    encoding: "utf8",
    timeout: 120_000,
  });
}

test("Seeds reales en PostgreSQL desechable: sin elevación de privilegios ni empresas arbitrarias", { skip: !allowed }, async (t) => {
  const { prisma: db } = require("../../lib/prisma") as { prisma: PrismaClient };
  try {
    const company = await db.company.create({ data: { name: "Cliente existente QA", slug: "qa-cliente-existente" } });
    await db.user.create({
      data: { email: "admin-existente@example.test", name: "Admin existente", role: "COMPANY_ADMIN", companyId: company.id },
    });

    await t.test("el seed principal no promueve una cuenta existente a SUPERADMIN", async () => {
      const r = run("prisma/seed.ts", [], { SUPER_ADMIN_EMAIL: "admin-existente@example.test" });
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout + r.stderr, /Superadministrador NO configurado/);
      const user = await db.user.findUnique({ where: { email: "admin-existente@example.test" } });
      assert.equal(user?.role, "COMPANY_ADMIN");
      assert.equal(await db.user.count({ where: { role: "SUPERADMIN" } }), 0);
    });

    await t.test("crea el usuario demo con contraseña aleatoria y no con un literal", async () => {
      const demo = await db.user.findUnique({ where: { email: "demo@smartnfc.test" } });
      assert.equal(demo?.role, "COMPANY_OWNER");
      assert.ok(demo?.password && demo.password.startsWith("$2"), "contraseña almacenada como hash");
    });

    await t.test("crea un SUPERADMIN solo cuando el correo no existe, y es idempotente", async () => {
      for (let i = 0; i < 2; i++) {
        const r = run("prisma/seed.ts", [], { SUPER_ADMIN_EMAIL: "super-nuevo@example.test", SEED_SUPERADMIN_PASSWORD: "solo-ci-desechable" });
        assert.equal(r.status, 0, r.stderr);
      }
      const supers = await db.user.findMany({ where: { role: "SUPERADMIN" }, select: { email: true } });
      assert.deepEqual(supers.map((s: { email: string }) => s.email), ["super-nuevo@example.test"]);
      assert.equal(await db.user.count({ where: { email: "demo@smartnfc.test" } }), 1);
    });

    await t.test("seed-sarcarnico exige una empresa explícita y no toma la primera de la base", async () => {
      const sinEmpresa = run("prisma/seed-sarcarnico.ts", [], {});
      assert.notEqual(sinEmpresa.status, 0);
      const inexistente = run("prisma/seed-sarcarnico.ts", ["--company=no-existe"], {});
      assert.notEqual(inexistente.status, 0);
      assert.equal(await db.localCampaign.count({ where: { slug: "sarcarnico" } }), 0, "nada creado sin empresa explícita");

      const ok = run("prisma/seed-sarcarnico.ts", ["--company=qa-cliente-existente"], {});
      assert.equal(ok.status, 0, ok.stderr);
      const campaign = await db.localCampaign.findUnique({ where: { slug: "sarcarnico" } });
      assert.equal(campaign?.companyId, company.id);
    });

    await t.test("los scripts de mantenimiento corren en dry-run sobre la base local", async () => {
      const r = run("scripts/maintenance/backfill-local-location-orphans.ts", [], {});
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /\[maintenance-guard\] Destino: .* DRY-RUN/);
      const tpl = run("scripts/seed-physical-card-templates.ts", [], {});
      assert.equal(tpl.status, 0, tpl.stderr);
      assert.match(tpl.stdout, /\[DRY-RUN\]/);
    });
  } finally {
    await db.$disconnect();
  }
});
