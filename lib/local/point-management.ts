import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { requireLocalAdmin } from "./access";
import { canCreateLocalTouchpoint, canCreateLocalCampaign } from "../product-access";
import { pointConfigurationSchema } from "./point-config";

export async function saveLocalPoint(input: unknown, pointId?: string, version?: number, campaignId?: string, campaignName?: string) {
  const { actor, company } = await requireLocalAdmin();
  const config = pointConfigurationSchema.parse(input);
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"local-capacity:" + company.id}))`;
    const existing = pointId ? await tx.localTouchpoint.findFirst({
      where: { id: pointId, campaign: { companyId: company.id } }, include: { physicalNfcCard: true }
    }) : null;
    if (pointId && !existing) throw new Error("Punto no disponible.");
    if (existing && (!Number.isInteger(version) || existing.configurationVersion !== version)) {
      throw new Error("El punto cambió mientras lo editabas. Actualiza la página antes de guardar.");
    }
    if (!existing && !(await canCreateLocalTouchpoint(company.id))) throw new Error("Se alcanzó el límite de puntos del local.");
    let selectedCampaignId = existing?.campaignId || campaignId || "";
    if (!existing && campaignId === "__new") {
      if (!(await canCreateLocalCampaign(company.id))) throw new Error("Se alcanzó el límite de campañas del local.");
      const name = campaignName?.trim();
      if (!name || name.length < 2 || name.length > 80) throw new Error("Escribe un nombre de campaña de 2 a 80 caracteres.");
      const group = await tx.localCampaign.create({ data: { companyId: company.id, name,
        slug: "local-" + randomUUID().replaceAll("-", "").slice(0, 20), businessName: company.name } });
      selectedCampaignId = group.id;
    }
    const campaign = await tx.localCampaign.findFirst({
      where: { id: selectedCampaignId, companyId: company.id, status: { not: "ARCHIVED" } }
    });
    if (!campaign) throw new Error("Selecciona una campaña disponible del local.");

    if (config.isActive && config.objective === "CLUB" && (campaign.status !== "PUBLISHED" || !campaign.publishedSnapshot)) {
      throw new Error("Publica el Club antes de activar este punto.");
    }
    if (config.medium === "QR" && existing?.physicalNfcCard) {
      throw new Error("Desvincula la tarjeta NFC antes de cambiar el soporte a solo QR.");
    }
    const data = { ...config,
      destinationUrl: ["CLUB", "SMART_LANDING"].includes(config.objective) ? null : config.destinationUrl,
      smartLinks: (config.objective === "SMART_LANDING" ? config.smartLinks : []) as Prisma.InputJsonValue
    };
    const point = existing
      ? await tx.localTouchpoint.update({ where: { id: existing.id, configurationVersion: version }, data: { ...data, configurationVersion: { increment: 1 } } })
      : await tx.localTouchpoint.create({ data: { ...data, campaignId: campaign.id, code: randomUUID().replaceAll("-", "") } });
    await tx.adminAuditLog.create({ data: { actorUserId: actor.id, companyId: company.id,
      action: existing ? "LOCAL_POINT_UPDATE" : "LOCAL_POINT_CREATE", entityType: "LOCAL_TOUCHPOINT", entityId: point.id,
      metadata: JSON.stringify({ objective: point.objective, medium: point.medium, isActive: point.isActive, version: point.configurationVersion }) } });
    return point.id;
  });
}
