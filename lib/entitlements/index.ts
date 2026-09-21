import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { getCurrentUserContext } from "../permissions";
import { resolveEntitlements } from "./resolve";
import type { Capability, Limit } from "./catalog";
export type EntitlementDb = Prisma.TransactionClient;
// Internal server data layer. Never export this module from a use-server action.
export async function getCompanyEntitlements(companyId: string, db: EntitlementDb = prisma) {
  const company = await db.company.findUnique({ where: { id: companyId }, include: {
    productLicenses: true, capabilityOverrides: true, limitOverrides: true, _count: { select: { profileRights: true } },
  } });
  if (!company) throw new Error("Empresa no disponible.");
  return resolveEntitlements({ companyId, isActive: company.isActive, maxIdentities: company.maxIdentities,
    profileRights: company._count.profileRights, licenses: company.productLicenses,
    capabilityOverrides: company.capabilityOverrides, limitOverrides: company.limitOverrides });
}
export async function hasCapability(companyId: string, capability: Capability, db: EntitlementDb = prisma) {
  return (await getCompanyEntitlements(companyId, db)).capabilities.includes(capability);
}
export async function getEntitlementLimit(companyId: string, limit: Limit, db: EntitlementDb = prisma) {
  return (await getCompanyEntitlements(companyId, db)).limits[limit];
}
export async function requireCapability(companyId: string, capability: Capability, db: EntitlementDb = prisma) {
  if (!(await hasCapability(companyId, capability, db))) throw new Error("Capacidad no disponible.");
}
// Exposed callers must derive tenant from the revalidated session, never from request data.
export async function getCurrentCompanyEntitlements(requestedCompanyId?: string) {
  const actor = await getCurrentUserContext();
  if (requestedCompanyId && requestedCompanyId !== actor.companyId) throw new Error("Acceso denegado.");
  return getCompanyEntitlements(actor.companyId);
}
export async function hasCardProfileRight(cardId: string, companyId: string, db: EntitlementDb = prisma) {
  const card = await db.card.findFirst({ where: { id: cardId, companyId }, select: { id: true } });
  if (!card) return false;
  const right = await db.cardProfileRight.findFirst({ where: { cardId, companyId } });
  const entitlements = await getCompanyEntitlements(companyId, db);
  return entitlements.capabilities.includes("PROFILE") && (!!right || entitlements.empresasOperational);
}
export async function lockCapacity(db: EntitlementDb, companyId: string) {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"entitlements:" + companyId}))`;
}

export async function grantProvisionedProfile(db: EntitlementDb, cardId: string, companyId: string, actorUserId: string) {
  // Provisioning is an administrative grant, never evidence of payment or a physical card purchase.
  await db.cardProfileRight.create({ data: { cardId, companyId, origin: "ADMIN_GRANTED", reason: "Perfil provisionado por administración", grantedByUserId: actorUserId } });
}
