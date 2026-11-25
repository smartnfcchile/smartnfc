import "../helpers/test-database";
import { selectDisposableDatabase } from "../helpers/test-database";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient({
  datasourceUrl: selectDisposableDatabase(process.env.E2E_DATABASE_URL, { requireNameIncludes: "campaign_e2e_disposable" }),
});
const landingToken = "cp2-fictional-landing-token-00000000000001";
const generalToken = "cp2-fictional-general-token-00000000000001";
const redirectToken = "cp2-fictional-redirect-token-0000000000001";
const assetToken = "cp2-fictional-asset-token-000000000000001";
const route = (token: string) => "/s/" + token;
const companyId = "private-company-id-cp2";
const projectId = "private-project-id-cp2";
const scope = { companyId, projectId };
const a = "private-site-north-cp2";
const b = "private-site-south-cp2";
const v1 = "private-version-one-cp2";
const v2 = "private-version-two-cp2";

function content(title: string) {
  return {
    schemaVersion: 1,
    design: { name: "Campaña UV ficticia", color: "#1d4ed8", style: "bold", font: "system" },
    protectedBlockIds: ["private-hero-id"],
    blocks: [
      { id: "private-hero-id", type: "hero", hidden: false, text: title },
      { id: "place", type: "text", hidden: false, text: "Información corporativa" },
      { id: "hidden", type: "text", hidden: true, text: "HIDDEN_SECRET_CP2" },
      { id: "button", type: "button", hidden: false, text: "Guía ficticia", href: "https://example.com/uv" },
    ],
    variants: [
      { siteId: a, color: "#047857", blocks: [{ id: "place", type: "text", hidden: false, text: "Punto de sombra · Sede Norte" }] },
      { siteId: b, blocks: [{ id: "place", type: "text", hidden: false, text: "OTHER_SITE_SECRET_CP2" }] },
    ],
  };
}

test.afterAll(async () => prisma.$disconnect());

test("anonymous public landing, stable token, isolated payload, revocation and legacy regressions", async ({ browser, request }) => {
  await prisma.company.create({ data: { id: companyId, name: "Organización ficticia" } });
  await prisma.solutionProject.create({ data: { companyId, id: projectId, name: "Proyecto interno", mode: "CAMPAIGN", status: "ACTIVE", destinationUrl: "https://example.com/legacy" } });
  await prisma.campaignLandingSite.createMany({ data: [{ ...scope, id: a, name: "Norte" }, { ...scope, id: b, name: "Sur" }] });
  await prisma.campaignLanding.create({ data: { ...scope, destination: "LANDING", draft: content("DRAFT_SECRET_CP2") } });
  await prisma.campaignLandingVersion.createMany({ data: [
    { ...scope, id: v1, revision: 1, approvedById: "PRIVATE_APPROVER_CP2", content: content("Protección UV · V1") },
    { ...scope, id: v2, revision: 2, approvedById: "PRIVATE_APPROVER_CP2", content: content("Protección UV · V2") },
  ] });
  await prisma.solutionTag.createMany({ data: [
    { ...scope, campaignSiteId: a, publicToken: landingToken, status: "ACTIVE" },
    { ...scope, publicToken: generalToken, status: "ACTIVE" },
  ] });
  const redirect = await prisma.solutionProject.create({ data: { companyId, name: "Redirección ficticia", mode: "CAMPAIGN", status: "ACTIVE", destinationUrl: "https://example.com/legacy" } });
  await prisma.solutionTag.create({ data: { companyId, projectId: redirect.id, publicToken: redirectToken, status: "ACTIVE" } });
  const asset = await prisma.solutionProject.create({ data: { companyId, name: "Activo ficticio", mode: "ASSETS", status: "ACTIVE" } });
  const assetScope = { companyId, projectId: asset.id };
  const template = await prisma.solutionTemplate.create({ data: { ...assetScope, code: "demo", name: "Ficha", fields: [
    { key: "area", label: "Área", kind: "text", public: true }, { key: "internal", label: "Interno", kind: "text", public: false },
  ] } });
  const record = await prisma.solutionRecord.create({ data: { ...assetScope, externalCode: "ASSET-CP2", templateId: template.id, status: "ACTIVE", data: { area: "Área ficticia", internal: "PRIVATE_ASSET_CP2" } } });
  await prisma.solutionTag.create({ data: { ...assetScope, recordId: record.id, publicToken: assetToken, status: "ACTIVE" } });

  const points = prisma.campaignLanding;
  const setVersion = (id: string | null, expiresAt: Date | null = null) =>
    points.update({ where: { projectId }, data: { publishedVersionId: id, expiresAt } });
  expect((await request.get(route(landingToken))).status()).toBe(404);
  await setVersion(v1);

  const publicHtml = await request.get(route(landingToken));
  expect(publicHtml.status()).toBe(200);
  expect(publicHtml.headers()["cache-control"]).toContain("no-store");
  const html = await publicHtml.text();
  for (const privateValue of [companyId, projectId, a, b, v1, v2, "private-hero-id", "PRIVATE_APPROVER_CP2", "DRAFT_SECRET_CP2", "HIDDEN_SECRET_CP2", "OTHER_SITE_SECRET_CP2", "Protección UV · V2"]) {
    expect(html).not.toContain(privateValue);
  }
  expect(await (await request.get(route(generalToken))).text()).toContain("Información corporativa");
  const evidence = process.env.E2E_ARTIFACTS;
  if (!evidence) throw new Error("Missing evidence output");
  mkdirSync(evidence, { recursive: true });
  for (const [name, viewport] of [["desktop", { width: 1440, height: 1000 }], ["mobile", { width: 390, height: 844 }]] as const) {
    const ctx = await browser.newContext({ viewport, isMobile: name === "mobile", hasTouch: name === "mobile" });
    try {
      const page = await ctx.newPage();
      await page.goto("http://127.0.0.1:3000" + route(landingToken));
      await expect(page.getByRole("heading", { name: "Protección UV · V1" })).toBeVisible();
      await expect(page.getByText("Punto de sombra · Sede Norte")).toBeVisible();
      await expect(page.locator("article header")).toHaveCSS("border-top-color", "rgb(4, 120, 87)");
      await expect(page.getByRole("link", { name: "Guía ficticia" })).toHaveAttribute("href", "https://example.com/uv");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await page.screenshot({ path: join(evidence, "landing-publica-" + name + ".png"), fullPage: true });
    } finally {
      await ctx.close();
    }
  }
  await setVersion(v2);
  expect(await (await request.get(route(landingToken))).text()).toContain("Protección UV · V2");
  await setVersion(v2, new Date(0));
  const expired = await request.get(route(landingToken));
  expect(expired.status()).toBe(404);
  expect(expired.headers()["cache-control"]).toContain("no-store");
  await setVersion(null);
  expect((await request.get(route(landingToken))).status()).toBe(404);
  await setVersion(v2);
  await prisma.solutionProject.update({ where: { id: projectId }, data: { status: "INACTIVE" } });
  expect((await request.get(route(landingToken))).status()).toBe(404);
  expect((await request.get(route("nonexistent-fictional-token-00000000000000"))).status()).toBe(404);

  const legacy = await request.get(route(redirectToken), { maxRedirects: 0 });
  expect(legacy.status()).toBe(307);
  expect(legacy.headers().location).toBe("https://example.com/legacy");
  const assetResponse = await request.get(route(assetToken));
  expect(assetResponse.status()).toBe(200);
  const assetHtml = await assetResponse.text();
  expect(assetHtml).toContain("Área ficticia");
  expect(assetHtml).not.toContain("PRIVATE_ASSET_CP2");
  for (const path of ["/personas", "/empresas", "/local"]) expect((await request.get(path)).status()).toBe(200);
});
