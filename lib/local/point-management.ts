import { lockCapacity, requireCapability, getCompanyEntitlements } from "../entitlements";
import { selectLocation } from "./locations";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { requireLocalAdmin } from "./access";
import { canCreateLocalTouchpoint, canCreateLocalCampaign } from "../product-access";
import { pointConfigurationSchema, safeDestination } from "./point-config";
import { newCampaignBrandSource } from "./brand";
import { actionLabel, storedActionDestination, type StoredAction } from "./public-actions";

/**
 * Espejo heredado de las acciones de SMART_LANDING en smartLinks (máx. 6, solo https). Mantiene funcionando
 * cualquier lectura histórica de smartLinks y permite volver a una versión anterior del código sin romper el punto.
 */
function smartLinksMirror(actions: StoredAction[]) {
  return actions.filter(a => a.enabled).map(a => ({ label: actionLabel(a), url: storedActionDestination(a) }))
    .filter(link => safeDestination(link.url)).slice(0, 6);
}

export async function saveLocalPoint(input: unknown, pointId?: string, version?: number, campaignId?: string, campaignName?: string, locationId?: string) {
  const { actor, company } = await requireLocalAdmin();
  const config = pointConfigurationSchema.parse(input);
  return prisma.$transaction(async tx => {
    await lockCapacity(tx, company.id);
    await requireCapability(company.id, "LOCAL_TOUCHPOINTS", tx);
    await requireCapability(company.id, `LOCAL_${config.objective}`, tx);
    const existing = pointId ? await tx.localTouchpoint.findFirst({
      where: { id: pointId, campaign: { companyId: company.id } }, include: { physicalNfcCard: true }
    }) : null;
    if (pointId && !existing) throw new Error("Punto no disponible.");
    if (existing && (!Number.isInteger(version) || existing.configurationVersion !== version)) {
      throw new Error("El punto cambió mientras lo editabas. Actualiza la página antes de guardar.");
    }
    let selectedCampaignId = existing?.campaignId || campaignId || "";
    if (!existing && campaignId === "__new") {
      if (!(await canCreateLocalCampaign(company.id, tx))) throw new Error("Se alcanzó el límite de campañas del local.");
      const name = campaignName?.trim();
      if (!name || name.length < 2 || name.length > 80) throw new Error("Escribe un nombre de campaña de 2 a 80 caracteres.");
      const location = await selectLocation(company.id, locationId, tx);
      // Mismos valores que usa la vista previa de "Crear una campaña nueva" (newCampaignBrandSource).
      const group = await tx.localCampaign.create({ data: { companyId: company.id, locationId: location.id, name,
        slug: "local-" + randomUUID().replaceAll("-", "").slice(0, 20), ...newCampaignBrandSource(company.name) } });
      selectedCampaignId = group.id;
    }
    const campaign = await tx.localCampaign.findFirst({
      where: { id: selectedCampaignId, companyId: company.id, status: { not: "ARCHIVED" } }
    });
    if (!campaign) throw new Error("Selecciona una campaña disponible del local.");

    const entitlement = await getCompanyEntitlements(company.id, tx);
    const needsCapacity = !existing || (!existing.isActive && config.isActive && !entitlement.legacyProducts.includes("LOCAL"));
    if (needsCapacity && !(await canCreateLocalTouchpoint(company.id, campaign.locationId ?? undefined, tx, config.isActive))) throw new Error("Se alcanzó el límite de puntos del local.");

    if (config.isActive && config.objective === "CLUB" && (campaign.status !== "PUBLISHED" || !campaign.publishedSnapshot)) {
      throw new Error("Publica el Club antes de activar este punto.");
    }
    if (config.medium === "QR" && existing?.physicalNfcCard) {
      throw new Error("Desvincula la tarjeta NFC antes de cambiar el soporte a solo QR.");
    }
    const actions = config.objective === "CLUB" ? [] : config.actions;
    const data = { ...config,
      destinationUrl: ["CLUB", "SMART_LANDING"].includes(config.objective) ? null : config.destinationUrl,
      smartLinks: (config.objective !== "SMART_LANDING" ? [] : actions.length ? smartLinksMirror(actions) : config.smartLinks) as Prisma.InputJsonValue,
      actions: actions as Prisma.InputJsonValue,
      objectiveConfig: (config.objective === "CLUB" ? { ctaLabel: "" } : config.objectiveConfig) as Prisma.InputJsonValue
    };
    const point = existing
      ? await tx.localTouchpoint.update({ where: { id: existing.id, configurationVersion: version }, data: { ...data, configurationVersion: { increment: 1 } } })
      : await tx.localTouchpoint.create({ data: { ...data, campaignId: campaign.id, code: randomUUID().replaceAll("-", "") } });
    await tx.adminAuditLog.create({ data: { actorUserId: actor.id, companyId: company.id,
      action: existing ? "LOCAL_POINT_UPDATE" : "LOCAL_POINT_CREATE", entityType: "LOCAL_TOUCHPOINT", entityId: point.id,
      metadata: JSON.stringify({ objective: point.objective, medium: point.medium, isActive: point.isActive, presentationMode: point.presentationMode, actions: actions.length, version: point.configurationVersion }) } });
    return point.id;
  });
}
