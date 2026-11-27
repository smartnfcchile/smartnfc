import "./helpers/test-database";
import { selectDisposableDatabase } from "./helpers/test-database";
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { validateCampaignContent, type CampaignContent } from "../../lib/soluciones/campaign-content";

import { uvDemo } from "../../lib/soluciones/uv-demo";
import { newCampaignBlock } from "../../lib/soluciones/campaign-editor";

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

    const source = await prisma.solutionProject.create({
      data: { companyId: company.id, name: "Origen", mode: "CAMPAIGN", status: "ACTIVE", destinationUrl: "https://example.com/source" },
    });
    const sourceScope = { companyId: company.id, projectId: source.id };
    const sourceSite = await service.createCampaignSite({ ...sourceScope, name: "Sede origen" });
    const batch = await prisma.solutionBatch.create({ data: { ...sourceScope, name: "Lote origen", quantity: 2 } });
    const mobile = await prisma.solutionTag.create({
      data: { ...sourceScope, status: "DISABLED", publicToken: generateSolutionToken(), batchId: batch.id, campaignSiteId: sourceSite.id },
    });
    const active = await prisma.solutionTag.create({
      data: { ...sourceScope, status: "ACTIVE", publicToken: generateSolutionToken(), batchId: batch.id },
    });
    const transfer = {
      ...scope, tagId: mobile.id, sourceId: source.id, sourceRevision: source.revision + 1, siteId: site.id,
      revision: (await prisma.solutionProject.findUniqueOrThrow({ where: { id: project.id } })).revision,
    };
    await assert.rejects(service.transferCampaignTag({ ...transfer, siteId: otherSite.id }), /Sede/);
    await assert.rejects(service.transferCampaignTag({ ...transfer, companyId: foreign.id, projectId: other.id }), /Punto/);
    await assert.rejects(service.transferCampaignTag({ ...transfer, sourceId: asset.id, tagId: assetTag.id }), /Punto/);
    await assert.rejects(service.transferCampaignTag({ ...transfer, tagId: active.id }), /Punto/);
    await assert.rejects(service.transferCampaignTag({ ...transfer, sourceRevision: source.revision }), /asignación cambió/);
    assert.deepEqual(await resolvePublicSolutionTag(active.publicToken), { kind: "campaign", destination: "https://example.com/source" });
    const results = await Promise.allSettled([service.transferCampaignTag(transfer), service.transferCampaignTag(transfer)]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    const moved = await prisma.solutionTag.findUniqueOrThrow({ where: { id: mobile.id } });
    assert.deepEqual(
      [moved.projectId, moved.campaignSiteId, moved.publicToken, moved.status, moved.batchId],
      [project.id, site.id, mobile.publicToken, "DISABLED", null],
    );
    assert.equal(await resolvePublicSolutionTag(mobile.publicToken), null);
    const transfers = await prisma.solutionOperation.findMany({ where: { companyId: company.id, targetId: mobile.id }, orderBy: { kind: "asc" } });
    assert.deepEqual(transfers.map(entry => [entry.kind, entry.projectId, entry.actorId]), [
      ["landing-tag-transfer-in", project.id, user.id], ["landing-tag-transfer-out", source.id, user.id],
    ]);
  } finally {
    await prisma.$disconnect();
  }
});


test("accepts additive UV demo blocks and enforces safe actions and protected variants", () => {
  assert.deepEqual(validateCampaignContent(uvDemo), uvDemo);
  for (const type of ["card", "indicator", "risk-scale", "alert", "card-group"] as const) {
    const block = newCampaignBlock(type, "custom");
    assert.doesNotThrow(() => validateCampaignContent({ ...content, blocks: [block] }));
  }
  const indicator = uvDemo.blocks.find(block => block.type === "indicator")!;
  assert.throws(() => validateCampaignContent({ ...uvDemo, protectedBlockIds: [], blocks: [
    { ...indicator, action: { label: "Unsafe", href: "javascript:alert(1)" } },
  ] }));
  const reference = uvDemo.blocks.find(block => block.id === "reference")!;
  assert.throws(() => validateCampaignContent({ ...uvDemo, variants: [{ siteId: "site", blocks: [reference] }] }));
});


test("UV forecast POST traverses published points, cache and simulated provider with company budgets", {
  skip: !process.env.CAMPAIGN_TEST_DATABASE_URL,
}, async () => {
  selectDisposableDatabase(process.env.CAMPAIGN_TEST_DATABASE_URL);
  const { prisma } = await import("../../lib/prisma");
  const { POST } = await import("../../app/api/uv/forecast/route");
  const { forecastCell } = await import("../../lib/soluciones/forecast-cell");
  const { generateSolutionToken } = await import("../../lib/soluciones/tags");
  const token = generateSolutionToken();
  const url = "https://uv.example.test/api/uv/forecast";
  const call = (body: object, origin = "https://uv.example.test") => POST(new Request(url, {
    method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
  }));
  assert.equal(forecastCell(-39.8149, -73.24), "v1:-3981:-7324");
  assert.equal(forecastCell(-39.8151, -73.24), "v1:-3982:-7324");
  assert.equal((await call({ token }, "https://other.example.test")).status, 403);
  assert.equal((await call({ token, latitude: -39.81 })).status, 400);
  for (const cell of ["v1:-03981:-7324", "v1:9001:0", "v1:0:18001"]) {
    assert.equal((await call({ token, cell })).status, 400);
  }
  async function publishPoint(companyId: string) {
    const project = await prisma.solutionProject.create({
      data: { name: "Laboratorio UV", companyId, mode: "CAMPAIGN", status: "ACTIVE" },
    });
    const draft = validateCampaignContent({ ...content, blocks: [...content.blocks, {
      id: "uv", type: "uv-forecast", hidden: false, title: "Centro laboratorio",
      latitude: -39.81, longitude: -73.25, timezone: "America/Santiago", locationMode: "hybrid",
    }] });
    await prisma.campaignLanding.create({ data: { projectId: project.id, companyId, draft } });
    const version = await prisma.campaignLandingVersion.create({
      data: { projectId: project.id, companyId, revision: 1, content: draft, approvedById: "ci-fixture" },
    });
    await prisma.campaignLanding.update({
      where: { projectId: project.id }, data: { publishedVersionId: version.id, destination: "LANDING" },
    });
    return prisma.solutionTag.create({
      data: { companyId, projectId: project.id, status: "ACTIVE", publicToken: generateSolutionToken() },
    });
  }
  const previousFlag = process.env.SMARTNFC_MET_UV_ENABLED;
  const oldFetch = globalThis.fetch;
  let providerCalls = 0;
  const at = new Date().toISOString();
  globalThis.fetch = async url => {
    assert.equal(new URL(String(url)).hostname, "api.met.no");
    providerCalls++;
    return Response.json({ properties: { meta: { updated_at: at }, timeseries: [
      { time: at, data: { instant: { details: { ultraviolet_index_clear_sky: 7.2 } } } },
    ] } });
  };
  try {
    process.env.SMARTNFC_MET_UV_ENABLED = "0";
    assert.equal((await call({ token })).status, 503);
    const [owner, other] = await Promise.all([
      prisma.company.create({ data: { name: "Laboratorio UV A" } }),
      prisma.company.create({ data: { name: "Laboratorio UV B" } }),
    ]);
    const [point, secondPoint, otherPoint] = await Promise.all([
      publishPoint(owner.id), publishPoint(owner.id), publishPoint(other.id),
    ]);
    process.env.SMARTNFC_MET_UV_ENABLED = "1";
    assert.equal((await call({ token })).status, 404);
    assert.equal(await prisma.publicRateLimit.count({ where: { action: "uv-forecast" } }), 0);

    const centerResponse = await call({ token: point.publicToken });
    assert.equal(centerResponse.status, 200);
    assert.deepEqual(await centerResponse.json(), {
      status: "available", source: "center", series: { updatedAt: at, samples: [{ at, value: 7.2 }] },
    });
    const key = "v1:-3981:-7325";
    const cached = await prisma.campaignUvCache.findUniqueOrThrow({ where: { locationKey: key } });
    assert.ok(cached.expiresAt && cached.expiresAt.getTime() >= Date.now() + 3 * 3600000);
    const mobile = await call({ token: point.publicToken, cell: key });
    assert.equal((await mobile.json()).source, "phone");
    assert.equal(providerCalls, 1);

    const ownerCounters = await prisma.publicRateLimit.findMany({ where: { action: "uv-forecast", keyHash: { not: "shared" } } });
    assert.equal(ownerCounters.length, 1);
    await prisma.publicRateLimit.update({ where: { id: ownerCounters[0].id }, data: { count: 29, updatedAt: new Date(Date.now() + 60_000) } });
    const concurrent = await Promise.all([call({ token: point.publicToken }), call({ token: secondPoint.publicToken })]);
    assert.deepEqual(concurrent.map(response => response.status).sort(), [200, 429]);
    assert.equal((await call({ token: otherPoint.publicToken })).status, 200);
    assert.equal(providerCalls, 1);
    const shared = await prisma.publicRateLimit.findFirstOrThrow({ where: { action: "uv-forecast", keyHash: "shared" } });
    assert.equal(shared.count, 4);
  } finally {
    globalThis.fetch = oldFetch;
    if (previousFlag === undefined) delete process.env.SMARTNFC_MET_UV_ENABLED;
    else process.env.SMARTNFC_MET_UV_ENABLED = previousFlag;
    await prisma.publicRateLimit.deleteMany({ where: { action: "uv-forecast" } });
    await prisma.campaignUvCache.deleteMany();
    await prisma.campaignUvProviderState.deleteMany();
    await prisma.$disconnect();
  }
});
