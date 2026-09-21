import { randomUUID } from "node:crypto";
import { prisma } from "../prisma";
import { requireLocalAdmin } from "./access";
import { getCompanyEntitlements, lockCapacity, type EntitlementDb } from "../entitlements";
export async function selectLocation(companyId: string, locationId: string | undefined, db: EntitlementDb) {
  if (locationId) return db.localLocation.findFirstOrThrow({ where: { id: locationId, companyId, isActive: true } });
  const locations = await db.localLocation.findMany({ where: { companyId, isActive: true }, take: 2 });
  if (locations.length === 1) return locations[0];
  if (locations.length > 1) throw new Error("Selecciona el local de la campaña.");
  const e = await getCompanyEntitlements(companyId, db);
  if (!e.localOperational || (e.limits.MAX_LOCATIONS ?? 0) < 1) throw new Error("Sin cupo de locales.");
  return db.localLocation.create({ data: { companyId, key: "initial", origin: "TECHNICAL_INITIAL" } });
}
export async function saveLocation(input: { id?: string; name: string; address?: string }) {
  const { actor, company } = await requireLocalAdmin();
  const name = input.name.trim(), address = input.address?.trim() || null;
  if (name.length < 2 || name.length > 120 || (address?.length ?? 0) > 240) throw new Error("Datos del local no válidos.");
  return prisma.$transaction(async db => {
    await lockCapacity(db, company.id);
    const e = await getCompanyEntitlements(company.id, db);
    if (!e.localOperational) throw new Error("Local no disponible.");
    if (!input.id && await db.localLocation.count({ where: { companyId: company.id, isActive: true } }) >= (e.limits.MAX_LOCATIONS ?? 0)) throw new Error("Límite de locales alcanzado.");
    const result = input.id
      ? await db.localLocation.update({ where: { id: input.id, companyId: company.id }, data: { name, address } })
      : await db.localLocation.create({ data: { companyId: company.id, key: randomUUID(), name, address } });
    await db.adminAuditLog.create({ data: { companyId: company.id, actorUserId: actor.id, action: input.id ? "LOCATION_UPDATE" : "LOCATION_CREATE", entityType: "LOCAL_LOCATION", entityId: result.id } });
    return result.id;
  });
}

export async function moveCampaignLocation(campaignId: string, locationId: string) {
  const { actor, company } = await requireLocalAdmin();
  await prisma.$transaction(async db => {
    await lockCapacity(db, company.id);
    const e = await getCompanyEntitlements(company.id, db);
    if (!e.localOperational) throw new Error("Local no disponible.");
    const campaign = await db.localCampaign.findFirstOrThrow({ where: { id: campaignId, companyId: company.id } });
    const location = await selectLocation(company.id, locationId, db);
    if (campaign.locationId === location.id) return;
    if (!e.legacyProducts.includes("LOCAL")) {
      const target = await db.localTouchpoint.count({ where: { isActive: true, campaign: { companyId: company.id, locationId: location.id } } });
      const moving = await db.localTouchpoint.count({ where: { isActive: true, campaignId: campaign.id } });
      if (target + moving > (e.limits.MAX_TOUCHPOINTS_PER_LOCATION ?? 0)) throw new Error("El local de destino no tiene cupo para los puntos activos.");
    }
    await db.localCampaign.update({ where: { id: campaign.id, companyId: company.id }, data: { locationId: location.id } });
    await db.adminAuditLog.create({ data: { actorUserId: actor.id, companyId: company.id, action: "CAMPAIGN_LOCATION_UPDATE", entityType: "LOCAL_CAMPAIGN", entityId: campaign.id, metadata: JSON.stringify({ before: campaign.locationId, after: location.id }) } });
  });
}
