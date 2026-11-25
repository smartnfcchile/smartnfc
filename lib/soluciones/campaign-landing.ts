import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { requireSolutionsOperator } from "./access";
import { validateCampaignContent } from "./campaign-content";

type Scope = { companyId: string; projectId: string };
type DraftChange = Scope & { revision: number; content: unknown };
type VersionChange = Scope & { revision: number; versionId: string };

async function campaignOperation<T>(
  { companyId, projectId }: Scope,
  kind: string,
  run: (tx: Prisma.TransactionClient, scope: Scope, actorId: string) => Promise<{ id: string; value: T }>,
) {
  const { actor } = await requireSolutionsOperator(companyId);
  const scope = { companyId, projectId };
  return prisma.$transaction(async tx => {
    // Serialize writes for this campaign, including the first draft and site assignments.
    const result = await tx.solutionProject.updateMany({
      where: { id: projectId, companyId, mode: "CAMPAIGN", company: { isActive: true } },
      data: { revision: { increment: 1 } },
    });
    if (result.count !== 1) throw new Error("Campaña no disponible");
    const { id, value } = await run(tx, scope, actor.id);
    await tx.solutionOperation.create({
      data: { ...scope, id: randomUUID(), actorId: actor.id, kind, targetId: id },
    });
    return value;
  });
}

export function createCampaignSite(input: Scope & { name: string }) {
  return campaignOperation(input, "landing-site-create", async (tx, scope) => {
    const name = input.name.trim();
    if (!name || name.length > 120) throw new Error("Nombre de sede inválido");
    const site = await tx.campaignLandingSite.create({ data: { ...scope, name } });
    return { id: site.id, value: site };
  });
}

export function assignCampaignTagSite(input: Scope & { tagId: string; siteId: string | null }) {
  return campaignOperation(input, "landing-tag-site", async (tx, scope) => {
    if (input.siteId && !await tx.campaignLandingSite.findFirst({
      where: { ...scope, id: input.siteId }, select: { id: true },
    })) throw new Error("Sede no disponible");
    const result = await tx.solutionTag.updateMany({
      where: { ...scope, id: input.tagId, recordId: null },
      data: { campaignSiteId: input.siteId },
    });
    if (result.count !== 1) throw new Error("Etiqueta no disponible");
    return { id: input.tagId, value: undefined };
  });
}

export function saveCampaignDraft(input: DraftChange) {
  return campaignOperation(input, "landing-draft-save", async (tx, scope) => {
    const content = validateCampaignContent(input.content);
    const sites = await tx.campaignLandingSite.count({
      where: { ...scope, id: { in: content.variants.map(variant => variant.siteId) } },
    });
    if (sites !== content.variants.length) throw new Error("Sede no disponible");
    const landing = await tx.campaignLanding.findFirst({ where: scope });
    if (!Number.isSafeInteger(input.revision) || (landing?.revision ?? 0) !== input.revision) {
      throw new Error("El borrador cambió. Recarga antes de guardar.");
    }
    const revision = input.revision + 1;
    const saved = await tx.campaignLanding.upsert({
      where: { projectId_companyId: scope },
      create: { ...scope, draft: content, revision },
      update: { draft: content, revision },
    });
    return { id: scope.projectId, value: saved };
  });
}

export function approveCampaignDraft(input: Scope & { revision: number }) {
  return campaignOperation(input, "landing-approve", async (tx, scope, actorId) => {
    const landing = await tx.campaignLanding.findFirst({ where: { ...scope, revision: input.revision } });
    if (!landing) throw new Error("Borrador no disponible o desactualizado");
    const approved = await tx.campaignLandingVersion.findFirst({
      where: { ...scope, revision: landing.revision },
      select: { id: true },
    });
    if (approved) throw new Error("Esta revisión ya está aprobada. Puedes publicar la versión aprobada.");
    const version = await tx.campaignLandingVersion.create({
      data: {
        ...scope, revision: landing.revision, content: validateCampaignContent(landing.draft),
        approvedById: actorId,
      },
    });
    return { id: version.id, value: version };
  });
}

function changePublishedVersion(input: VersionChange, action: "landing-publish" | "landing-rollback") {
  return campaignOperation(input, action, async (tx, scope) => {
    const landing = await tx.campaignLanding.findFirst({ where: { ...scope, revision: input.revision } });
    const version = await tx.campaignLandingVersion.findFirst({
      where: { ...scope, id: input.versionId },
    });
    if (!landing || !version || landing.publishedVersionId === version.id) {
      throw new Error("Versión no disponible, ya seleccionada o revisión desactualizada");
    }
    const wasPublished = await tx.solutionOperation.findFirst({
      where: { ...scope, kind: "landing-publish", targetId: version.id }, select: { id: true },
    });
    if (action === "landing-publish" && (wasPublished || version.revision !== landing.revision)) {
      throw new Error("Solo se puede publicar la aprobación vigente por primera vez");
    }
    if (action === "landing-rollback" && !wasPublished) {
      throw new Error("Solo se puede restaurar una versión publicada anteriormente");
    }

    await tx.campaignLanding.update({
      where: { projectId_companyId: scope },
      data: { publishedVersionId: version.id, revision: { increment: 1 } },
    });
    return { id: version.id, value: version };
  });
}

export const publishCampaignVersion = (input: VersionChange) => changePublishedVersion(input, "landing-publish");
export const rollbackCampaignVersion = (input: VersionChange) => changePublishedVersion(input, "landing-rollback");
