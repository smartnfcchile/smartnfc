import { prisma } from "../prisma";
import { requireSuperAdmin } from "../permissions";
import { CAPABILITIES, BASE, LIMITS, type Capability, type Limit } from "./catalog";
import { lockCapacity } from ".";
export async function createEntitlementOverride(input: { companyId: string; kind: "CAPABILITY" | "LIMIT"; key: Capability | Limit; value: boolean | number; reason: string; startsAt: Date; expiresAt?: Date }) {
  const actor = await requireSuperAdmin();
  if (!input.reason.trim() || !Number.isFinite(+input.startsAt) || (input.expiresAt && (!Number.isFinite(+input.expiresAt) || input.expiresAt <= input.startsAt))) throw new Error("Vigencia y motivo obligatorios.");
  return prisma.$transaction(async db => {
    await lockCapacity(db, input.companyId);
    await db.company.findUniqueOrThrow({ where: { id: input.companyId } });
    const common = { companyId: input.companyId, reason: input.reason.trim(), authorUserId: actor.id, startsAt: input.startsAt, expiresAt: input.expiresAt };
    let row;
    if (input.kind === "CAPABILITY") {
      if (!CAPABILITIES.includes(input.key as Capability) || (BASE as readonly string[]).includes(input.key) || typeof input.value !== "boolean") throw new Error("Capacidad no válida para excepción.");
      row = await db.companyCapabilityOverride.create({ data: { ...common, capability: input.key, enabled: input.value } });
    } else {
      if (!LIMITS.includes(input.key as Limit) || typeof input.value !== "number" || !Number.isSafeInteger(input.value) || input.value < 0) throw new Error("Límite no válido.");
      row = await db.companyLimitOverride.create({ data: { ...common, limit: input.key, value: input.value } });
    }
    await db.adminAuditLog.create({ data: { actorUserId: actor.id, companyId: input.companyId, action: "ENTITLEMENT_OVERRIDE_CREATE", entityType: input.kind, entityId: row.id, metadata: JSON.stringify({ key: input.key, value: input.value, reason: input.reason }) } });
    return row.id;
  });
}
export async function revokeEntitlementOverride(companyId: string, kind: "CAPABILITY" | "LIMIT", id: string, reason: string) {
  const actor = await requireSuperAdmin();
  if (!reason.trim()) throw new Error("Motivo obligatorio.");
  await prisma.$transaction(async db => {
    await lockCapacity(db, companyId);
    const where = { id, companyId, revokedAt: null };
    const data = { revokedAt: new Date(), revokedByUserId: actor.id };
    if (kind === "CAPABILITY") await db.companyCapabilityOverride.update({ where, data });
    else await db.companyLimitOverride.update({ where, data });
    await db.adminAuditLog.create({ data: { actorUserId: actor.id, companyId, action: "ENTITLEMENT_OVERRIDE_REVOKE", entityType: kind, entityId: id, metadata: JSON.stringify({ reason }) } });
  });
}
