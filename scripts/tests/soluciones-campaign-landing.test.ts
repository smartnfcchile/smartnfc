import "./helpers/test-database";
import { selectDisposableDatabase } from "./helpers/test-database";
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { validateCampaignContent, type CampaignContent } from "../../lib/soluciones/campaign-content";

const content: CampaignContent = {
  schemaVersion: 1,
  design: { name: "Campaña ficticia", color: "#123456", font: "system", style: "clean" },
  blocks: [{ id: "hero", type: "hero", hidden: false, text: "Versión inicial" }],
  variants: [],
};

test("valida bloques tipados, identidad guiada y variantes", () => {
  assert.deepEqual(validateCampaignContent(content), content);
  assert.throws(() => validateCampaignContent({ ...content, blocks: [...content.blocks, ...content.blocks] }));
  assert.throws(() => validateCampaignContent({ ...content, blocks: [
    { id: "link", type: "button", hidden: false, text: "Abrir", href: "javascript:alert(1)" },
  ] }));
  assert.throws(() => validateCampaignContent({ ...content, variants: [
    { siteId: "sede", blocks: [{ ...content.blocks[0], id: "extra" }] },
  ] }));
});

test("ciclo de campaña, aislamiento y resolución anterior", {
  skip: !process.env.CAMPAIGN_TEST_DATABASE_URL,
}, async () => {
  selectDisposableDatabase(process.env.CAMPAIGN_TEST_DATABASE_URL);
  let session: { user: { id: string; companyId: string } } | null = null;
  require("next-auth");
  require.cache[require.resolve("next-auth")]!.exports = { getServerSession: async () => session };
  const { prisma } = require("../../lib/prisma") as typeof import("../../lib/prisma");
  const service = require("../../lib/soluciones/campaign-landing") as typeof import("../../lib/soluciones/campaign-landing");
  const { resolvePublicSolutionTag } = require("../../lib/soluciones/public-record") as typeof import("../../lib/soluciones/public-record");
  const { generateSolutionToken } = require("../../lib/soluciones/tags") as typeof import("../../lib/soluciones/tags");
  try {
    const company = await prisma.company.create({ data: { name: "Prueba", id: randomUUID() } });
    const foreign = await prisma.company.create({ data: { name: "Otra empresa", id: randomUUID() } });
    const user = await prisma.user.create({
      data: { companyId: company.id, email: randomUUID() + "@example.test", role: "COMPANY_ADMIN", status: "ACTIVE", isActive: true },
    });
    const project = await prisma.solutionProject.create({
      data: { companyId: company.id, name: "Campaña", mode: "CAMPAIGN", status: "ACTIVE", destinationUrl: "https://example.com/?campaign=test" },
    });
    const scope = { companyId: company.id, projectId: project.id };
    await assert.rejects(service.saveCampaignDraft({ ...scope, revision: 0, content }), /No autorizado/);
    session = { user: { id: user.id, companyId: company.id } };
    await assert.rejects(service.saveCampaignDraft({ ...scope, revision: 0, content }), /SuperAdmin/);
    await prisma.user.update({ where: { id: user.id }, data: { role: "SUPERADMIN" } });

    const other = await prisma.solutionProject.create({ data: { companyId: foreign.id, name: "Otra", mode: "CAMPAIGN" } });
    const otherScope = { companyId: foreign.id, projectId: other.id };
    const { saveLanding } = require("../../app/superadmin/soluciones/[projectId]/landing/actions") as typeof import("../../app/superadmin/soluciones/[projectId]/landing/actions");
    const invalid = await saveLanding(scope, 0, { ...content, protectedBlockIds: ["missing"] });
    assert.ok("error" in invalid);
    assert.deepEqual(await saveLanding(otherScope, 0, content), { revision: 1 });
    const conflict = await saveLanding(otherScope, 0, content);
    assert.ok("conflict" in conflict && conflict.conflict);
    const site = await service.createCampaignSite({ ...scope, name: "Sede uno" });
    const otherSite = await service.createCampaignSite({ ...otherScope, name: "Sede otra" });
    const tag = await prisma.solutionTag.create({ data: { ...scope, publicToken: generateSolutionToken(), status: "ACTIVE" } });
    const expected = { kind: "campaign", destination: "https://example.com/?campaign=test" };
    assert.deepEqual(await resolvePublicSolutionTag(tag.publicToken), expected);
    await assert.rejects(service.assignCampaignTagSite({ ...scope, tagId: tag.id, siteId: otherSite.id }), /Sede/);
    await assert.rejects(service.assignCampaignTagSite({ ...otherScope, tagId: tag.id, siteId: otherSite.id }), /Etiqueta/);
    await service.assignCampaignTagSite({ ...scope, tagId: tag.id, siteId: site.id });
    const draft = { ...content, variants: [{ siteId: site.id, blocks: [], color: "#abcdef" }] };
    await assert.rejects(service.saveCampaignDraft({
      ...scope, revision: 0, content: { ...draft, variants: [{ siteId: otherSite.id, blocks: [] }] },
    }), /Sede/);
    await service.saveCampaignDraft({ ...scope, revision: 0, content: draft });
    await assert.rejects(service.saveCampaignDraft({ ...scope, revision: 0, content: draft }), /cambió/);
    const first = await service.approveCampaignDraft({ ...scope, revision: 1 });
    await assert.rejects(service.approveCampaignDraft({ ...scope, revision: 1 }), /ya está aprobada/);
    assert.equal(await prisma.campaignLandingVersion.count({ where: scope }), 1);
    await assert.rejects(prisma.campaignLandingVersion.update({
      where: { id: first.id }, data: { content: {} },
    }), /Campaign landing versions are immutable/);
    await assert.rejects(prisma.campaignLandingVersion.delete({
      where: { id: first.id },
    }), /Campaign landing versions are immutable/);
    assert.equal((await prisma.campaignLanding.findUniqueOrThrow({ where: { projectId: project.id } })).publishedVersionId, null);
    await assert.rejects(service.rollbackCampaignVersion({ ...scope, revision: 1, versionId: first.id }), /publicada anteriormente/);
    await assert.rejects(service.publishCampaignVersion({ ...otherScope, revision: 1, versionId: first.id }), /Versión/);
    const existing = await prisma.campaignLanding.findUniqueOrThrow({ where: { projectId: project.id } });
    assert.equal(existing.destination, "REDIRECT");
    assert.equal(existing.expiresAt, null);
    await assert.rejects(service.publishCampaignVersion({
      ...scope, revision: 1, versionId: first.id, expiresAt: new Date(0),
    }), /caducidad futura/);
    await service.publishCampaignVersion({ ...scope, revision: 1, versionId: first.id });
    await service.saveCampaignDraft({ ...scope, revision: 2, content: { ...draft, design: { ...draft.design, name: "Versión dos" } } });
    const second = await service.approveCampaignDraft({ ...scope, revision: 3 });
    const expiry = new Date(Date.now() + 3600000);
    await service.publishCampaignVersion({ ...scope, revision: 3, versionId: second.id, expiresAt: expiry });
    await service.rollbackCampaignVersion({ ...scope, revision: 4, versionId: first.id });
    const landing = await prisma.campaignLanding.findUniqueOrThrow({ where: { projectId: project.id }, include: { publishedVersion: true } });
    assert.equal(landing.publishedVersionId, first.id);
    assert.deepEqual(landing.publishedVersion?.content, draft);
    assert.equal(landing.destination, "LANDING");
    assert.deepEqual(landing.expiresAt, expiry);
    const audit = await prisma.solutionOperation.findMany({ where: { ...scope, kind: { in: ["landing-approve", "landing-publish", "landing-rollback"] } } });
    assert.equal(audit.length, 5);
    await assert.rejects(service.unpublishCampaignVersion({ ...scope, revision: 4 }), /cambi/);
    await assert.rejects(service.unpublishCampaignVersion({ ...otherScope, revision: 1 }), /No hay/);
    await assert.rejects(service.unpublishCampaignVersion({
      projectId: project.id, companyId: foreign.id, revision: 5,
    }), /Campaña no disponible/);
    const withdrawals = await Promise.allSettled([
      service.unpublishCampaignVersion({ ...scope, revision: 5 }),
      service.unpublishCampaignVersion({ ...scope, revision: 5 }),
    ]);
    const hidden = withdrawals.find(result => result.status === "fulfilled");
    const rejected = withdrawals.find(result => result.status === "rejected");
    assert.ok(hidden && rejected);
    assert.ok(rejected.reason instanceof service.CampaignDraftConflict);
    assert.equal(hidden.value.revision, 6);
    const withdrawn = await prisma.campaignLanding.findUniqueOrThrow({ where: { projectId: project.id } });
    assert.equal(withdrawn.publishedVersionId, null);
    assert.equal(withdrawn.destination, "LANDING");
    assert.deepEqual(withdrawn.expiresAt, expiry);
    const withdrawalAudit = await prisma.solutionOperation.findFirstOrThrow({
      where: { ...scope, kind: "landing-unpublish" },
    });
    assert.equal(withdrawalAudit.targetId, first.id);
    assert.equal(withdrawalAudit.actorId, user.id);

    // Simulate the clock passing the deadline without waiting or mutating shared data.
    await prisma.campaignLanding.update({
      where: { projectId: project.id }, data: { expiresAt: new Date(0) },
    });
    await assert.rejects(service.rollbackCampaignVersion({ ...scope, revision: 6, versionId: first.id }), /caducidad/);
    await assert.rejects(service.rollbackCampaignVersion({ ...scope, revision: 6, versionId: first.id, expiresAt: null }), /nueva vigencia/);
    await service.rollbackCampaignVersion({ ...scope, revision: 6, versionId: first.id, expiresAt: expiry });
    const renewed = await prisma.campaignLanding.findUniqueOrThrow({ where: { projectId: project.id } });
    assert.equal(renewed.revision, 7);
    assert.equal(renewed.publishedVersionId, first.id);
    assert.deepEqual(renewed.expiresAt, expiry);
    assert.ok(audit.every(entry => entry.actorId === user.id && entry.createdAt instanceof Date));
    assert.equal((await prisma.solutionTag.findUniqueOrThrow({ where: { id: tag.id } })).publicToken, tag.publicToken);
    const resolved = await resolvePublicSolutionTag(tag.publicToken);
    assert.equal(resolved?.kind, "campaignLanding");
    assert.equal(resolved.blocks[0].id, "0");

    const asset = await prisma.solutionProject.create({ data: { companyId: company.id, name: "Activo", mode: "ASSETS", status: "ACTIVE" } });
    const assetScope = { companyId: company.id, projectId: asset.id };
    await assert.rejects(service.saveCampaignDraft({ ...assetScope, revision: 0, content }), /Campaña/);
    const template = await prisma.solutionTemplate.create({ data: { ...assetScope, code: "demo", name: "Demo",
      fields: [{ key: "area", label: "Área", kind: "text", public: true }, { key: "internal", label: "Interno", kind: "text", public: false }] } });
    const record = await prisma.solutionRecord.create({ data: { ...assetScope, templateId: template.id, externalCode: "DEMO", status: "ACTIVE", data: { area: "Zona A", internal: "Privado" } } });
    const assetTag = await prisma.solutionTag.create({ data: { ...assetScope, recordId: record.id, publicToken: generateSolutionToken(), status: "ACTIVE" } });
    const publicAsset = await resolvePublicSolutionTag(assetTag.publicToken);
    assert.equal(publicAsset?.kind, "asset");
    assert.deepEqual(publicAsset.fields.map(field => field.key), ["area"]);
  } finally {
    await prisma.$disconnect();
  }
});
