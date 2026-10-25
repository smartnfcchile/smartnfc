import type { Prisma, PrismaClient } from "@prisma/client";
import { LocationError, installationDto, parseInstallation, type PointKind } from "./validation";

export type LocationActor = { id: string; companyId: string; role: string };
type Db = Prisma.TransactionClient;
// Tenant always comes from the revalidated session, never from request data.
export async function installationOwner(db: Db, actor: LocationActor, kind: PointKind, id: string): Promise<{ localTouchpointId: string } | { physicalNfcCardId: string }> {
  if (!["SUPERADMIN", "COMPANY_OWNER", "COMPANY_ADMIN"].includes(actor.role)) throw new LocationError("Permisos insuficientes.", 403);
  if (kind === "physical") {
    const physical = await db.physicalNfcCard.findFirst({ where: { id, companyId: actor.companyId }, select: { id: true, localTouchpointId: true } });
    if (!physical) throw new LocationError("Punto no disponible.", 404);
    // A Local's NFC and QR share one fixed installation, independent of their digital destination.
    if (physical.localTouchpointId) return installationOwner(db, actor, "local", physical.localTouchpointId);
    return { physicalNfcCardId: physical.id };
  }
  const local = await db.localTouchpoint.findFirst({ where: { id, campaign: { companyId: actor.companyId, status: { not: "ARCHIVED" } } }, select: { id: true } });
  if (!local) throw new LocationError("Punto no disponible.", 404);
  return { localTouchpointId: local.id };
}
export async function readInstallation(db: Db, actor: LocationActor, kind: PointKind, id: string) {
  const where = await installationOwner(db, actor, kind, id);
  const row = await db.pointGeolocation.findFirst({ where });
  return installationDto(row);
}
export async function writeInstallation(db: PrismaClient, actor: LocationActor, kind: PointKind, id: string, input: unknown | null) {
  const data = input === null ? null : parseInstallation(input);
  return db.$transaction(async tx => {
    // Same company lock used by destination/link management: serialize physical reassignment.
    await tx.$queryRaw`SELECT id FROM "Company" WHERE id = ${actor.companyId} FOR UPDATE`;
    const owner = await installationOwner(tx, actor, kind, id);
    if (data) {
      const where = "localTouchpointId" in owner ? { localTouchpointId: owner.localTouchpointId } : { physicalNfcCardId: owner.physicalNfcCardId };
      await tx.pointGeolocation.upsert({ where, create: { ...owner, ...data, updatedById: actor.id }, update: { ...data, updatedById: actor.id } });
    } else await tx.pointGeolocation.deleteMany({ where: owner });
    await tx.adminAuditLog.create({ data: { actorUserId: actor.id, companyId: actor.companyId,
      action: data ? "POINT_LOCATION_SAVE" : "POINT_LOCATION_DELETE", entityType: kind === "local" ? "LOCAL_TOUCHPOINT" : "PHYSICAL_NFC_CARD", entityId: id } });
    // Audit excludes coordinates and addresses: deleting a location removes its personal data.
    return readInstallation(tx, actor, kind, id);
  });
}
