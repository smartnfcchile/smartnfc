import "../helpers/test-database";
import { selectDisposableDatabase } from "../helpers/test-database";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient({
  datasourceUrl: selectDisposableDatabase(process.env.E2E_DATABASE_URL, { requireNameIncludes: "campaign_e2e_disposable" }),
});
const route = "/superadmin/soluciones/cp3-e2e/publicacion";
const token = "/s/cp3-fictitious-token-00000000000000000001";
test.afterAll(async () => prisma.$disconnect());

test("SUPERADMIN publishes, assigns a site, withdraws and restores from the operations panel", async ({ browser, request }) => {
  const companyId = "campaign-e2e-org";
  const projectId = "cp3-e2e";
  const scope = { companyId, projectId };
  const siteId = "cp3-fictitious-site";
  await prisma.solutionProject.create({ data: { id: projectId, companyId, mode: "CAMPAIGN", name: "Operación UV ficticia", status: "DRAFT" } });
  await prisma.campaignLandingSite.create({ data: { ...scope, id: siteId, name: "Norte ficticia" } });
  await prisma.campaignLanding.create({ data: { ...scope, revision: 1, draft: {
    schemaVersion: 1, design: { name: "Campaña UV", color: "#047857", font: "system", style: "clean" },
    blocks: [{ id: "text", type: "hero", hidden: false, text: "Protección UV corporativa" }],
    variants: [{ siteId, blocks: [{ id: "text", type: "hero", hidden: false, text: "Protección UV Norte" }] }],
  } } });
  await prisma.solutionTag.create({ data: { ...scope, publicToken: token.split("/").at(-1)!, status: "ACTIVE" } });
  const source = await prisma.solutionProject.create({
    data: { companyId, mode: "CAMPAIGN", name: "Campaña de origen", status: "ACTIVE", destinationUrl: "https://example.com/source" },
  });
  const transferred = await prisma.solutionTag.create({
    data: { companyId, projectId: source.id, publicToken: "cp3-transfer-fictitious-0000000000000022", status: "DISABLED" },
  });
  const publicStatus = async () => (await request.get(token, { maxRedirects: 0 })).status();
  expect(await publicStatus()).toBe(404);
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:3000", viewport: { width: 1440, height: 1000 } });
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    await page.goto(route);
    await expect(page).toHaveURL(/\/login\?error=superadminRequired/);
    if (!process.env.E2E_ADMIN_PASSWORD) throw new Error("Missing disposable credentials");
    try {
      await page.goto("/login");
      await page.locator('input[type="email"]').fill("campaign-admin@example.test");
      await page.locator('input[type="password"]').fill(process.env.E2E_ADMIN_PASSWORD);
      await page.getByRole("button", { name: "Entrar al Sistema" }).click();
      await page.waitForURL(url => !url.pathname.startsWith("/login"), { timeout: 10000 });
    } catch { throw new Error("Could not start the disposable SUPERADMIN session"); }
    await page.goto(route);
    await expect(page.getByRole("heading", { name: "Publicación y puntos NFC/QR" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Publicar versión", exact: true })).toHaveCount(0);
    const operate = async (action: string) => {
      const control = page.getByRole("button", { name: action, exact: true });
      const form = page.locator("form").filter({ has: control });
      await form.getByRole("checkbox").check();
      await control.click();
    };
    await operate("Aprobar borrador");
    await expect(page.getByRole("button", { name: "Publicar versión", exact: true })).toBeVisible();
    expect(await publicStatus()).toBe(404);
    const evidence = process.env.E2E_ARTIFACTS;
    if (!evidence) throw new Error("Missing evidence folder");
    mkdirSync(evidence, { recursive: true });
    await operate("Publicar versión");
    await expect(page.getByText("Publicada y vigente", { exact: true })).toBeVisible();
    expect(await publicStatus()).toBe(404);
    await page.screenshot({ path: join(evidence, "antes-activar-campana.png"), fullPage: true });
    await page.getByRole("link", { name: "Ir a la activación" }).click();
    await expect(page.getByRole("heading", { name: "Destino: Landing SmartNFC" })).toBeVisible();
    await expect(page.getByLabel("Destino HTTPS")).toHaveCount(0);
    await page.getByRole("button", { name: "Activar proyecto" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Proyecto activado." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Probar enlace público" })).toHaveAttribute("href", token);
    expect((await prisma.solutionProject.findUniqueOrThrow({ where: { id: projectId } })).destinationUrl).toBeNull();
    await page.goto(route);
    await expect(page.getByText("Landing corporativa", { exact: true })).toBeVisible();
    expect(await publicStatus()).toBe(200);
    await page.getByLabel("Sede del punto").selectOption({ label: "Norte ficticia" });
    await operate("Guardar sede");
    await expect(page.getByText("Variante · Norte ficticia")).toBeVisible();
    expect(await (await request.get(token)).text()).toContain("Protección UV Norte");
    await expect(page.getByRole("link", { name: "http://127.0.0.1:3000" + token })).toHaveAttribute("href", "http://127.0.0.1:3000" + token);

    const association = page.getByRole("region", { name: "Asociar punto existente" });
    await association.getByLabel("Punto de origen").selectOption({ value: `${transferred.id}:${source.id}:${source.revision}` });
    await association.getByLabel("Sede de destino").selectOption({ label: "Norte ficticia" });
    await operate("Asociar punto existente");
    await expect(association.getByText("No hay puntos elegibles para esta búsqueda.")).toBeVisible();
    const movedUrl = "/s/" + transferred.publicToken;
    await expect(page.getByRole("link", { name: "http://127.0.0.1:3000" + movedUrl })).toHaveAttribute("href", "http://127.0.0.1:3000" + movedUrl);
    expect((await request.get(movedUrl)).status()).toBe(404);
    const moved = await prisma.solutionTag.findUniqueOrThrow({ where: { id: transferred.id } });
    expect([moved.projectId, moved.campaignSiteId, moved.status]).toEqual([projectId, siteId, "DISABLED"]);

    await page.screenshot({ path: join(evidence, "panel-campana-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({ path: join(evidence, "panel-campana-mobile.png"), fullPage: true });

    await operate("Retirar publicación");
    await expect(page.getByText("Retirada o sin publicar", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Probar enlace público" })).toHaveCount(0);
    expect(await publicStatus()).toBe(404);
    await operate("Restaurar v1");
    await expect(page.getByText("Variante · Norte ficticia")).toBeVisible();
    expect(await publicStatus()).toBe(200);
    for (const label of ["Aprobación", "Publicación", "Asignación de sede", "Retirada", "Restauración"]) {
      await expect(page.getByRole("listitem").filter({ hasText: new RegExp("· " + label + "$") })).toBeVisible();
    }
  } finally {
    await context.close().catch(() => {});
  }
});
