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

export type NfcPoint = { id: string; name: string; code: string; destination: string };
export type CardRef = { id: string; slug: string };
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
    personaPro: Account;
    personaBase: Account;
    equipoOwner: Account;
    equipoColab: Account;
    localA: Account;
    localB: Account;
  };
  local: { b: { locationId: string; pointId: string; pointCode: string; destination: string } };
  nfc: { companyId: string; points: { p1: NfcPoint; p2: NfcPoint; qrOnly: NfcPoint }; tokens: Record<"entregada" | "activa" | "suspendida" | "ajena" | "identidad" | "cruzada", string>; personaSlug: string };
  cards: { personaPro: CardRef; personaBase: CardRef; personaSinDerecho: CardRef; inactiva: CardRef; equipoColab: CardRef; empresaOwner: CardRef };
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

  // ── Etapa 2: Personas ──
  // personaPro: Pro activo + derecho permanente por compra (PURCHASE). Es la tarjeta que editan las pruebas.
  // personaBase: Pro VENCIDO + derecho permanente: el perfil básico debe seguir publicado (CLAUDE.md).
  // personaSinDerecho: sin licencia ni derecho: el perfil público muestra el estado neutral de inactivo.
  // inactiva: tarjeta desactivada: el perfil público responde 404.
  const personaProCo = await prisma.company.create({ data: { name: "Persona Pro E2E", slug: "e2e-persona-pro" } });
  const personaBaseCo = await prisma.company.create({ data: { name: "Persona Base E2E", slug: "e2e-persona-base" } });
  const sinDerechoCo = await prisma.company.create({ data: { name: "Persona Sin Derecho E2E", slug: "e2e-persona-sin-derecho" } });
  await prisma.companyProductLicense.create({ data: { companyId: personaProCo.id, product: "EMPRESAS", planCode: "EMPRESAS_PRO" } });
  await prisma.companyProductLicense.create({ data: { companyId: personaBaseCo.id, product: "EMPRESAS", planCode: "EMPRESAS_PRO", status: "EXPIRED", expiresAt: new Date(Date.now() - 24 * 3600_000) } });
  const personaPro = await user(prisma, personaProCo.id, "e2e-persona", "Persona Pro E2E", "COMPANY_OWNER");
  const personaBase = await user(prisma, personaBaseCo.id, "e2e-persona-base", "Persona Base E2E", "COMPANY_OWNER");
  const sinDerechoUser = await user(prisma, sinDerechoCo.id, "e2e-persona-sin-derecho", "Persona Sin Derecho E2E", "COMPANY_OWNER");
  const cardPro = await prisma.card.create({ data: { companyId: personaProCo.id, userId: personaPro.id, name: "Persona Pro E2E", slug: "e2e-persona-pro", profileName: "Persona Pro E2E" } });
  const cardBase = await prisma.card.create({ data: { companyId: personaBaseCo.id, userId: personaBase.id, name: "Persona Base E2E", slug: "e2e-persona-base",
    profileName: "Camila Base E2E", role: "Diseñadora ficticia", email: "camila.base@smartnfc.test", showEmail: true } });
  const cardSin = await prisma.card.create({ data: { companyId: sinDerechoCo.id, userId: sinDerechoUser.id, name: "Sin Derecho E2E", slug: "e2e-persona-sin-derecho", profileName: "Sin Derecho E2E" } });
  const cardInactiva = await prisma.card.create({ data: { companyId: personaProCo.id, userId: personaPro.id, name: "Inactiva E2E", slug: "e2e-tarjeta-inactiva", isActive: false } });
  for (const card of [cardPro, cardBase, cardInactiva]) {
    await prisma.cardProfileRight.create({ data: { cardId: card.id, companyId: card.companyId, origin: "PURCHASE", reason: "Datos ficticios E2E", grantedByUserId: superadmin.id } });
  }

  // ── Etapa 3: Empresas ──
  // e2e-equipo: licencia Equipo 5 con 2 identidades activas (dueña + colaborador activo con contraseña).
  // Las pruebas crean colaboradores hasta 5/5, verifican el bloqueo del sexto y suspenden al colaborador
  // con su sesión abierta. Es una empresa separada de e2e-empresa para no interferir con la etapa 1.
  const equipoCo = await prisma.company.create({ data: { name: "Equipo Ficticio E2E", slug: "e2e-equipo" } });
  await prisma.companyProductLicense.create({ data: { companyId: equipoCo.id, product: "EMPRESAS", planCode: "EMPRESAS_TEAM_5" } });
  const equipoOwner = await user(prisma, equipoCo.id, "e2e-equipo-owner", "Dueño Equipo E2E", "COMPANY_OWNER");
  const equipoColab = await user(prisma, equipoCo.id, "e2e-equipo-colab", "Colaboradora Equipo E2E", "COLLABORATOR");
  await prisma.card.create({ data: { companyId: equipoCo.id, userId: equipoOwner.id, name: "Dueño Equipo E2E", slug: "e2e-equipo-owner", profileName: "Dueño Equipo E2E" } });
  const cardEquipoColab = await prisma.card.create({ data: { companyId: equipoCo.id, userId: equipoColab.id, name: "Colaboradora Equipo E2E", slug: "e2e-equipo-colab", profileName: "Colaboradora Equipo E2E" } });
  await prisma.physicalNfcCard.create({ data: { token: `e2e-${randomBytes(6).toString("hex")}`, companyId: equipoCo.id, cardId: cardEquipoColab.id, status: "ACTIVA" } });
  const cardEmpresaOwner = await prisma.card.findUniqueOrThrow({ where: { slug: "e2e-owner" }, select: { id: true, slug: true } });

  // ── Etapa 4: Locales ──
  // e2e-local-a: Local Pro (1 local) con máximo 2 puntos activos por local; sin locales: la prueba los crea.
  // e2e-local-b: Local Pro con un local, una campaña y un punto WhatsApp activo (aislamiento).
  const localACo = await prisma.company.create({ data: { name: "Local A Ficticio E2E", slug: "e2e-local-a" } });
  const localBCo = await prisma.company.create({ data: { name: "Local B Ficticio E2E", slug: "e2e-local-b" } });
  await prisma.companyProductLicense.create({ data: { companyId: localACo.id, product: "LOCAL", planCode: "LOCAL_PRO", maxActiveTouchpointsPerLocation: 2 } });
  await prisma.companyProductLicense.create({ data: { companyId: localBCo.id, product: "LOCAL", planCode: "LOCAL_PRO" } });
  const localA = await user(prisma, localACo.id, "e2e-local-a", "Dueña Local A E2E", "COMPANY_OWNER");
  const localB = await user(prisma, localBCo.id, "e2e-local-b", "Dueño Local B E2E", "COMPANY_OWNER");
  const locB = await prisma.localLocation.create({ data: { companyId: localBCo.id, key: `e2e-loc-b-${randomBytes(4).toString("hex")}`, name: "Sucursal B E2E", displayName: "Café B Ficticio E2E", phone: "+56 9 5555 0000" } });
  const campB = await prisma.localCampaign.create({ data: { companyId: localBCo.id, locationId: locB.id, name: "Campaña B E2E", slug: `e2e-campana-b-${randomBytes(4).toString("hex")}` } });
  const destinationB = "https://wa.me/56955550000";
  const pointB = await prisma.localTouchpoint.create({ data: { campaignId: campB.id, name: "Punto B E2E", code: "e2e-punto-b", objective: "WHATSAPP", medium: "NFC_QR",
    location: "Caja B", destinationUrl: destinationB, presentationMode: "DIRECT", isActive: true } });

  // ── Etapa 5: NFC ──
  // e2e-nfc: Local Pro con dos puntos NFC+QR y uno solo QR. Inventario de tarjetas físicas en distintos
  // estados, una de otra empresa, una ligada a una identidad de Empresas y una ANÓMALA (de e2e-nfc ligada al
  // punto de e2e-local-b) para probar que /t no cruza empresas.
  const nfcCo = await prisma.company.create({ data: { name: "NFC Ficticio E2E", slug: "e2e-nfc" } });
  await prisma.companyProductLicense.create({ data: { companyId: nfcCo.id, product: "LOCAL", planCode: "LOCAL_PRO" } });
  const nfcLoc = await prisma.localLocation.create({ data: { companyId: nfcCo.id, key: `e2e-loc-nfc-${randomBytes(4).toString("hex")}`, name: "Sucursal NFC E2E", displayName: "Tienda NFC Ficticia E2E" } });
  const nfcCamp = await prisma.localCampaign.create({ data: { companyId: nfcCo.id, locationId: nfcLoc.id, name: "Campaña NFC E2E", slug: `e2e-campana-nfc-${randomBytes(4).toString("hex")}` } });
  const nfcPoint = async (name: string, code: string, digits: string, medium: "NFC_QR" | "QR") => {
    const destination = `https://wa.me/${digits}`;
    const pt = await prisma.localTouchpoint.create({ data: { campaignId: nfcCamp.id, name, code, objective: "WHATSAPP", medium, location: "Mesón", destinationUrl: destination, presentationMode: "DIRECT", isActive: true } });
    return { id: pt.id, name, code, destination };
  };
  const p1 = await nfcPoint("Punto NFC 1 E2E", "e2e-nfc-p1", "56966660001", "NFC_QR");
  const p2 = await nfcPoint("Punto NFC 2 E2E", "e2e-nfc-p2", "56966660002", "NFC_QR");
  const qrOnly = await nfcPoint("Punto Solo QR E2E", "e2e-nfc-qr", "56966660003", "QR");
  const nfcTokens = { entregada: "e2e-nfc-entregada", activa: "e2e-nfc-activa", suspendida: "e2e-nfc-suspendida", ajena: "e2e-nfc-ajena", identidad: "e2e-nfc-identidad", cruzada: "e2e-nfc-cruzada" };
  await prisma.physicalNfcCard.create({ data: { token: nfcTokens.entregada, companyId: nfcCo.id, status: "ENTREGADA" } });
  await prisma.physicalNfcCard.create({ data: { token: nfcTokens.activa, companyId: nfcCo.id, status: "ACTIVA" } });
  await prisma.physicalNfcCard.create({ data: { token: nfcTokens.suspendida, companyId: nfcCo.id, status: "SUSPENDIDA" } });
  await prisma.physicalNfcCard.create({ data: { token: nfcTokens.ajena, companyId: localBCo.id, status: "ACTIVA" } });
  await prisma.physicalNfcCard.create({ data: { token: nfcTokens.identidad, companyId: personaBaseCo.id, cardId: cardBase.id, status: "ACTIVA" } });
  await prisma.physicalNfcCard.create({ data: { token: nfcTokens.cruzada, companyId: nfcCo.id, localTouchpointId: pointB.id, status: "ACTIVA" } });

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
      personaPro: personaPro.account,
      personaBase: personaBase.account,
      equipoOwner: equipoOwner.account,
      equipoColab: equipoColab.account,
      localA: localA.account,
      localB: localB.account,
    },
    local: { b: { locationId: locB.id, pointId: pointB.id, pointCode: pointB.code, destination: destinationB } },
    nfc: { companyId: nfcCo.id, points: { p1, p2, qrOnly }, tokens: nfcTokens, personaSlug: cardBase.slug },
    cards: {
      personaPro: { id: cardPro.id, slug: cardPro.slug },
      personaBase: { id: cardBase.id, slug: cardBase.slug },
      personaSinDerecho: { id: cardSin.id, slug: cardSin.slug },
      inactiva: { id: cardInactiva.id, slug: cardInactiva.slug },
      equipoColab: { id: cardEquipoColab.id, slug: cardEquipoColab.slug },
      empresaOwner: cardEmpresaOwner,
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
