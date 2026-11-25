import "../helpers/test-database";
import { selectDisposableDatabase } from "../helpers/test-database";
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const url = selectDisposableDatabase(process.env.E2E_DATABASE_URL, { requireNameIncludes: "campaign_e2e_disposable" });
if (new URL(url).pathname !== "/campaign_e2e_disposable" || !process.env.GITHUB_ENV) {
  throw new Error("Run the fixture setup only in the disposable E2E runner.");
}
const prisma = new PrismaClient({ datasourceUrl: url, log: [] });

async function seed() {
  const [row] = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
  if (row?.db !== "campaign_e2e_disposable") throw new Error("Unexpected database");
  const secrets = {
    NEXTAUTH_SECRET: randomBytes(48).toString("base64url"),
    E2E_ADMIN_PASSWORD: randomBytes(32).toString("base64url"),
    E2E_COLLAB_PASSWORD: randomBytes(32).toString("base64url"),
  };
  const [adminHash, collabHash] = await Promise.all([
    bcrypt.hash(secrets.E2E_ADMIN_PASSWORD, 12), bcrypt.hash(secrets.E2E_COLLAB_PASSWORD, 12),
  ]);
  await prisma.company.create({
    data: {
      id: "campaign-e2e-org", name: "Organización UV ficticia", isActive: true,
      users: { create: [
        { email: "campaign-admin@example.test", name: "QA Superadmin", password: adminHash, role: "SUPERADMIN", status: "ACTIVE", isActive: true },
        { email: "campaign-collab@example.test", name: "QA Colaborador", password: collabHash, role: "COLLABORATOR", status: "ACTIVE", isActive: true },
      ] },
      solutionProjects: { create: { id: "demo-campana", name: "Prevención UV ficticia", mode: "CAMPAIGN", status: "DRAFT" } },
    },
  });
  for (const [key, secret] of Object.entries(secrets)) {
    console.log(`::add-mask::${secret}`);
    appendFileSync(process.env.GITHUB_ENV!, `${key}=${secret}\n`);
  }
}

seed().catch(() => { console.error("Could not seed the disposable database."); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
