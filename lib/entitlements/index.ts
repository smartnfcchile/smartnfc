import { Prisma, type ProfileRightOrigin } from "@prisma/client";
import { prisma } from "../prisma";
import { getCurrentUserContext } from "../permissions";
import { resolveEntitlements, profileRightEffective } from "./resolve";
import type { Capability, Limit } from "./catalog";
export type EntitlementDb = Prisma.TransactionClient;
// Internal server data layer. Never export this module from a use-server action.
export async function getCompanyEntitlements(companyId: string, db: EntitlementDb = prisma) {
  const now = new Date();
  const company = await db.company.findUnique({ where: { id: companyId }, include: {
    productLicenses: true, capabilityOverrides: true, limitOverrides: true,
    profileRights: { select: { expiresAt: true, revokedAt: true } },
  } });
  if (!company) throw new Error("Empresa no disponible.");
  const effectiveProfileRights = company.profileRights.filter(r => profileRightEffective(r, now)).length;
  return resolveEntitlements({ companyId, isActive: company.isActive, maxIdentities: company.maxIdentities,
    profileRights: effectiveProfileRights, licenses: company.productLicenses,
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
  return entitlements.capabilities.includes("PROFILE") && (profileRightEffective(right) || entitlements.empresasOperational);
}
export async function lockCapacity(db: EntitlementDb, companyId: string) {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"entitlements:" + companyId}))`;
}

// The only writer of CardProfileRight. Always an explicit, auditable Superadmin decision — never
// wired into Card creation. cardId is the primary key, so this always updates the same row: a
// PILOT->PURCHASE conversion (or any re-classification) never creates a second right for a Card.
export type ProfileRightGrant = { origin: Extract<ProfileRightOrigin, "INTERNAL" | "PILOT" | "PURCHASE">; expiresAt?: Date | null; reference?: string; reason: string };
export async function setCardProfileRight(db: EntitlementDb, cardId: string, companyId: string, actorUserId: string, grant: ProfileRightGrant) {
  await db.cardProfileRight.upsert({
    where: { cardId },
    create: { cardId, companyId, origin: grant.origin, expiresAt: grant.expiresAt ?? null, reference: grant.reference, reason: grant.reason, grantedByUserId: actorUserId },
    update: { origin: grant.origin, expiresAt: grant.expiresAt ?? null, revokedAt: null, revokedByUserId: null, reference: grant.reference, reason: grant.reason, grantedByUserId: actorUserId, grantedAt: new Date() },
  });
}
export async function revokeCardProfileRight(db: EntitlementDb, cardId: string, actorUserId: string) {
  await db.cardProfileRight.update({ where: { cardId }, data: { revokedAt: new Date(), revokedByUserId: actorUserId } });
}
