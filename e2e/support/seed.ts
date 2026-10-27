// Datos ficticios para las pruebas funcionales. Solo se ejecuta tras pasar las tres barreras de db-guard.ts.
// Cada ejecución vacía la base desechable y genera contraseñas y tokens aleatorios nuevos.
// Correos: siempre @smartnfc.test (dominio reservado, RFC 6761). Empresas: slug con prefijo "e2e-".

import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { connectE2EDatabase, E2E_EMAIL_DOMAIN, truncateE2EDatabase } from "./db-guard";

export const STATE_DIR = path.resolve(__dirname, "../.state");
export const ACCOUNTS_FILE = path.join(STATE_DIR, "accounts.json");

export type UserRole = "SUPERADMIN" | "COMPANY_OWNER" | "COMPANY_ADMIN" | "COLLABORATOR";
export type Account = { email: string; password: string; name: string; role: UserRole };
export type SeedState = {
  createdAt: string;
  accounts: {
    superadmin: Account;
    owner: Account;
    collaborator: Account;
    suspended: Account;
    inactiveCompany: Account;
    resetComplete: Account;
    resetRequest: Account;
    pending: Omit<Account, "password">;
    pendingMessage: Omit<Account, "password">;
    resetMessage: Account;
  };
  tokens: { activation: string; activationExpired: string; reset: string; activationMessage: string; resetMessage: string };
  companies: { empresa: string; inactiva: string; platform: string };
};

/** Contraseña aleatoria que cumple la política de SmartNFC (12+, mayúscula, minúscula, número y símbolo). */
export function strongPassword() {
  return `E2e-${randomBytes(9).toString("base64url")}#7aZ`;
}
const token = () => randomBytes(32).toString("base64url");
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const email = (local: string) => `${local}@${E2E_EMAIL_DOMAIN}`;

async function user(prisma: PrismaClient, companyId: string, local: string, name: string, role: UserRole, extra: { status?: string; isActive?: boolean; withPassword?: boolean } = {}) {
  const password = strongPassword();
  const created = await prisma.user.create({
    data: {
      companyId,
      email: email(local),
      name,
      role,
      status: extra.status ?? "ACTIVE",
      isActive: extra.isActive ?? true,
      password: extra.withPassword === false ? null : await bcrypt.hash(password, 10),
    },
  });
  return { id: created.id, account: { email: created.email, password, name, role } };
}

export async function seedE2E(): Promise<SeedState> {
  const prisma = await connectE2EDatabase();
  await truncateE2EDatabase(prisma);

  const platform = await prisma.company.create({ data: { name: "SmartNFC E2E Plataforma", slug: "e2e-plataforma" } });
  const empresa = await prisma.company.create({ data: { name: "Empresa Ficticia E2E", slug: "e2e-empresa" } });
  const inactiva = await prisma.company.create({ data: { name: "Empresa Inactiva E2E", slug: "e2e-inactiva", isActive: false } });
  await prisma.companyProductLicense.create({ data: { companyId: empresa.id, product: "EMPRESAS", planCode: "EMPRESAS_TEAM_5" } });

  const superadmin = await user(prisma, platform.id, "e2e-superadmin", "Superadmin E2E", "SUPERADMIN");
  const owner = await user(prisma, empresa.id, "e2e-owner", "Dueña E2E", "COMPANY_OWNER");
  const collaborator = await user(prisma, empresa.id, "e2e-colaborador", "Colaborador E2E", "COLLABORATOR");
  const suspended = await user(prisma, empresa.id, "e2e-suspendido", "Suspendido E2E", "COLLABORATOR", { status: "SUSPENDED" });
  const inactiveCompany = await user(prisma, inactiva.id, "e2e-inactiva", "Usuario Empresa Inactiva E2E", "COMPANY_OWNER");
  const resetComplete = await user(prisma, empresa.id, "e2e-reset", "Restablecer E2E", "COLLABORATOR");
  const resetRequest = await user(prisma, empresa.id, "e2e-reset-solicitud", "Solicitud E2E", "COLLABORATOR");
  const pending = await user(prisma, empresa.id, "e2e-pendiente", "Pendiente E2E", "COLLABORATOR", { status: "PENDING", withPassword: false });
  const pendingMessage = await user(prisma, empresa.id, "e2e-pendiente-mensaje", "Pendiente Mensaje E2E", "COLLABORATOR", { status: "PENDING", withPassword: false });
  const resetMessage = await user(prisma, empresa.id, "e2e-reset-mensaje", "Restablecer Mensaje E2E", "COLLABORATOR");
  const pendingExpired = await user(prisma, empresa.id, "e2e-pendiente-vencido", "Pendiente Vencido E2E", "COLLABORATOR", { status: "PENDING", withPassword: false });

  for (const [u, local] of [[owner, "e2e-owner"], [collaborator, "e2e-colaborador"]] as const) {
    await prisma.card.create({ data: { companyId: empresa.id, userId: u.id, name: u.account.name, slug: local, profileName: u.account.name } });
  }

  const tokens = { activation: token(), activationExpired: token(), reset: token(), activationMessage: token(), resetMessage: token() };
  const inOneDay = new Date(Date.now() + 24 * 3600_000);
  await prisma.userActivationToken.create({ data: { userId: pending.id, tokenHash: sha256(tokens.activation), expiresAt: inOneDay } });
  await prisma.userActivationToken.create({ data: { userId: pendingExpired.id, tokenHash: sha256(tokens.activationExpired), expiresAt: new Date(Date.now() - 3600_000) } });
  await prisma.passwordResetToken.create({ data: { userId: resetComplete.id, tokenHash: sha256(tokens.reset), expiresAt: inOneDay } });
  await prisma.userActivationToken.create({ data: { userId: pendingMessage.id, tokenHash: sha256(tokens.activationMessage), expiresAt: inOneDay } });
  await prisma.passwordResetToken.create({ data: { userId: resetMessage.id, tokenHash: sha256(tokens.resetMessage), expiresAt: inOneDay } });

  const state: SeedState = {
    createdAt: new Date().toISOString(),
    accounts: {
      superadmin: superadmin.account,
      owner: owner.account,
      collaborator: collaborator.account,
      suspended: suspended.account,
      inactiveCompany: inactiveCompany.account,
      resetComplete: resetComplete.account,
      resetRequest: resetRequest.account,
      pending: { email: pending.account.email, name: pending.account.name, role: pending.account.role },
      pendingMessage: { email: pendingMessage.account.email, name: pendingMessage.account.name, role: pendingMessage.account.role },
      resetMessage: resetMessage.account,
    },
    tokens,
    companies: { empresa: empresa.id, inactiva: inactiva.id, platform: platform.id },
  };
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(state, null, 2), { mode: 0o600 });
  return state;
}

export function loadSeedState(): SeedState {
  try {
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf8"));
  } catch {
    throw new Error("[e2e] No hay datos ficticios. El globalSetup de Playwright debe ejecutar el seed primero.");
  }
}
