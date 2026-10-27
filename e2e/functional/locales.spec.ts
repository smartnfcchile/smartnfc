// Etapa 4 — Locales: locales e identidad, puntos inteligentes, /p/[code], licencia vencida y reactivación,
// aislamiento y límite de puntos activos. Solo datos ficticios (empresas e2e-local-*) en la base desechable.
import { test, expect } from "../support/fixtures";
import type { Page } from "@playwright/test";
import { loginAndWaitForDashboard } from "../support/auth";
import { fixtureSetProductLicense, readOnly } from "../support/db-guard";
import { lazy } from "../support/state";

const accounts = lazy("accounts");
const local = lazy("local");

const LOCAL = { name: "Sucursal Centro E2E", address: "Calle Ficticia 123, Valdivia" };
const IDENTIDAD = { displayName: "Café Ficticio E2E", shortDescription: "Local de prueba automatizada; no es un negocio real.", phone: "+56 9 1111 2222" };
const PUNTO = { campaignName: "Campaña Centro E2E", name: "Caja principal E2E", location: "Mostrador", phone: "+56 9 3333 4444", digits: "56933334444", message: "Hola, vengo del punto E2E" };
const INACTIVO = "Punto Inteligente temporalmente inactivo";

type StoredPoint = { id: string; code: string; name: string; isActive: boolean; objective: string; destinationUrl: string | null; configurationVersion: number };

const companyA = () => readOnly((db) => db.company.findUniqueOrThrow({ where: { slug: "e2e-local-a" }, select: { id: true } })) as Promise<{ id: string }>;
const locationsA = async () => readOnly(async (db) => db.localLocation.findMany({
  where: { companyId: (await companyA()).id }, select: { id: true, name: true, address: true, displayName: true, shortDescription: true, phone: true, isActive: true },
})) as Promise<Array<{ id: string; name: string | null; address: string | null; displayName: string | null; shortDescription: string | null; phone: string | null; isActive: boolean }>>;
const pointsA = async () => readOnly(async (db) => db.localTouchpoint.findMany({
  where: { campaign: { companyId: (await companyA()).id } }, orderBy: { createdAt: "asc" },
  select: { id: true, code: true, name: true, isActive: true, objective: true, destinationUrl: true, configurationVersion: true },
})) as Promise<StoredPoint[]>;

async function fillPointForm(page: Page, p: { name: string; location?: string; phone: string; message: string; active: boolean; campaignName?: string }) {
  if (p.campaignName) {
    await page.locator('select[name="campaignId"]').selectOption("__new");
    await page.locator('input[name="campaignName"]').fill(p.campaignName);
  }
  await page.locator('input[name="name"]').fill(p.name);
  if (p.location) await page.locator('input[name="location"]').fill(p.location);
  await page.locator('select[name="objective"]').selectOption("WHATSAPP");
  await page.getByPlaceholder("+56 9 1234 5678").fill(p.phone);
  await page.getByPlaceholder("Hola, quiero hacer una consulta").fill(p.message);
  await page.locator('input[name="presentationMode"][value="DIRECT"]').check();
  const active = page.locator('input[name="isActive"]');
  if (p.active) await active.check(); else await active.uncheck();
  await page.getByRole("button", { name: "Guardar punto" }).click();
}

/** /p/[code] sin seguir la redirección: devuelve estado, destino y cuerpo. */
async function openPoint(page: Page, code: string) {
  const res = await page.request.get(`/p/${code}`, { maxRedirects: 0 });
  return { status: res.status(), location: res.headers()["location"] ?? "", body: await res.text() };
}

test.describe("Locales: dueña de Local Pro (en serie)", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ allowMutations: true });

  test.beforeEach(async ({ page }) => {
    await loginAndWaitForDashboard(page, accounts.localA);
  });

  test("crear un local: se guarda, se audita y aparece al recargar", async ({ page }) => {
    await page.goto("/dashboard/local/locales");
    await page.locator('input[name="name"]').fill(LOCAL.name);
    await page.locator('input[name="address"]').fill(LOCAL.address);
    await page.getByRole("button", { name: "Crear local" }).click();
    await expect.poll(async () => (await locationsA()).length).toBe(1);
    const [loc] = await locationsA();
    expect(loc).toMatchObject({ name: LOCAL.name, address: LOCAL.address, isActive: true });
    expect(await readOnly((db) => db.adminAuditLog.count({ where: { action: "LOCATION_CREATE", entityId: loc.id } }))).toBe(1);
    await page.reload();
    await expect(page.getByText(LOCAL.name).first()).toBeVisible();
  });

  test("editar la identidad del local: se guarda y persiste al recargar", async ({ page }) => {
    const [loc] = await locationsA();
    await page.goto(`/dashboard/local/locales/${loc.id}`);
    await page.locator("#identity-displayName").fill(IDENTIDAD.displayName);
    await page.locator("#identity-shortDescription").fill(IDENTIDAD.shortDescription);
    await page.locator("#identity-phone").fill(IDENTIDAD.phone);
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Identidad guardada. Se aplicará a las experiencias de este local.")).toBeVisible({ timeout: 20_000 });
    expect((await locationsA())[0]).toMatchObject({ displayName: IDENTIDAD.displayName, shortDescription: IDENTIDAD.shortDescription });
    expect((await locationsA())[0].phone).toBeTruthy();
    await page.reload();
    await expect(page.locator("#identity-displayName")).toHaveValue(IDENTIDAD.displayName);
    await expect(page.locator("#identity-shortDescription")).toHaveValue(IDENTIDAD.shortDescription);
  });

  test("crear un punto inteligente WhatsApp activo: se guarda con código y /p/[code] lleva al destino", async ({ page }) => {
    await page.goto("/dashboard/local/puntos/nuevo");
    await fillPointForm(page, { ...PUNTO, active: true });
    await expect(page.getByText("Punto guardado. El código físico se conserva.")).toBeVisible({ timeout: 20_000 });

    const points = await pointsA();
    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({ name: PUNTO.name, isActive: true, objective: "WHATSAPP" });
    expect(points[0].code).toMatch(/^[a-zA-Z0-9_-]{3,100}$/);
    expect(points[0].destinationUrl).toContain(`wa.me/${PUNTO.digits}`);

    const pub = await openPoint(page, points[0].code);
    expect([302, 303, 307, 308]).toContain(pub.status);
    expect(pub.location).toContain(`wa.me/${PUNTO.digits}`);
    await expect.poll(() => readOnly((db) => db.localVisit.count({ where: { touchpointId: points[0].id } }))).toBeGreaterThanOrEqual(1);

    await page.goto("/dashboard/local/puntos");
    await expect(page.getByText(PUNTO.name).first()).toBeVisible();
  });

  test("editar el punto: cambia el destino, conserva el código y persiste al recargar", async ({ page }) => {
    const [before] = await pointsA();
    await page.goto(`/dashboard/local/puntos/${before.id}`);
    await fillPointForm(page, { name: "Caja principal editada E2E", phone: PUNTO.phone, message: "Mensaje editado E2E", active: true });
    await expect(page.getByText(/Punto guardado/)).toBeVisible({ timeout: 20_000 });

    const [after] = await pointsA();
    expect(after.code, "el código físico/QR no cambia").toBe(before.code);
    expect(after.name).toBe("Caja principal editada E2E");
    expect(after.configurationVersion).toBeGreaterThan(before.configurationVersion);
    expect(decodeURIComponent(after.destinationUrl ?? "")).toContain("Mensaje editado E2E");

    await page.goto(`/dashboard/local/puntos/${before.id}`);
    await expect(page.locator('input[name="name"]')).toHaveValue("Caja principal editada E2E");
    expect(decodeURIComponent((await openPoint(page, after.code)).location)).toContain("Mensaje editado E2E");
  });

  test("límite de puntos activos (2 por local): el tercero activo se rechaza; inactivo sí se puede guardar", async ({ page }) => {
    await page.goto("/dashboard/local/puntos/nuevo");
    await fillPointForm(page, { name: "Punto 2 E2E", location: "Terraza", phone: PUNTO.phone, message: "Punto 2", active: true });
    await expect(page.getByText("Punto guardado. El código físico se conserva.")).toBeVisible({ timeout: 20_000 });

    await page.goto("/dashboard/local/puntos/nuevo");
    await fillPointForm(page, { name: "Punto 3 E2E", location: "Entrada", phone: PUNTO.phone, message: "Punto 3", active: true });
    await expect(page.getByRole("alert").filter({ hasText: "Se alcanzó el límite de puntos del local." })).toBeVisible({ timeout: 20_000 });
    expect((await pointsA()).filter((p) => p.isActive)).toHaveLength(2);
    expect((await pointsA()).some((p) => p.name === "Punto 3 E2E")).toBe(false);

    // React 19 reinicia los campos no controlados tras la acción: se vuelve a completar, esta vez inactivo.
    await page.goto("/dashboard/local/puntos/nuevo");
    await fillPointForm(page, { name: "Punto 3 E2E", location: "Entrada", phone: PUNTO.phone, message: "Punto 3", active: false });
    await expect(page.getByText("Punto guardado. El código físico se conserva.")).toBeVisible({ timeout: 20_000 });
    const all = await pointsA();
    expect(all).toHaveLength(3);
    expect(all.filter((p) => p.isActive)).toHaveLength(2);
  });

  test("licencia vencida: /p/[code] muestra solo «Punto Inteligente temporalmente inactivo» y conserva los datos", async ({ page }) => {
    const [point] = await pointsA();
    await fixtureSetProductLicense("e2e-local-a", "LOCAL", { status: "EXPIRED", expiresAt: new Date(Date.now() - 3600_000) });
    try {
      const pub = await openPoint(page, point.code);
      expect(pub.status, "no es 404 ni redirección").toBe(403);
      expect(pub.location).toBe("");
      expect(pub.body).toContain(INACTIVO);
      for (const privado of [IDENTIDAD.displayName, IDENTIDAD.phone, PUNTO.digits, "wa.me", "licencia", "vencid", "pago", "deuda", "plan"]) {
        expect(pub.body.toLowerCase(), `no expone «${privado}»`).not.toContain(privado.toLowerCase());
      }
      // La suspensión comercial no borra nada.
      expect(await pointsA()).toHaveLength(3);
      expect((await pointsA())[0].code).toBe(point.code);
      expect(await locationsA()).toHaveLength(1);
    } finally {
      await fixtureSetProductLicense("e2e-local-a", "LOCAL", { status: "ACTIVE", expiresAt: null });
    }
  });

  test("reactivación de la licencia: el mismo código vuelve a llevar al mismo destino", async ({ page }) => {
    const [point] = await pointsA();
    const pub = await openPoint(page, point.code);
    expect([302, 303, 307, 308]).toContain(pub.status);
    expect(decodeURIComponent(pub.location)).toContain("Mensaje editado E2E");
    expect(pub.location).toContain(`wa.me/${PUNTO.digits}`);
  });

  test("Local Pro incluye 1 local: un segundo local no se crea", async ({ page }) => {
    await page.goto("/dashboard/local/locales");
    await page.locator('input[name="name"]').fill("Segundo Local E2E");
    await page.getByRole("button", { name: "Crear local" }).click();
    await page.waitForTimeout(3_000);
    expect(await locationsA()).toHaveLength(1);
  });
});

test.describe("Locales: aislamiento entre propietarios", () => {
  test("la dueña del Local A no ve ni abre el local ni el punto del Local B", async ({ page }) => {
    await loginAndWaitForDashboard(page, accounts.localA);
    await page.goto("/dashboard/local/puntos");
    await expect(page.getByText("Punto B E2E")).toHaveCount(0);
    expect((await page.goto(`/dashboard/local/puntos/${local.b.pointId}`))?.status()).toBe(404);
    expect((await page.goto(`/dashboard/local/locales/${local.b.locationId}`))?.status()).toBe(404);
    await expect(page.getByText("Café B Ficticio E2E")).toHaveCount(0);
  });

  test("el punto del Local B sigue funcionando para el público", async ({ page }) => {
    const res = await page.request.get(`/p/${local.b.pointCode}`, { maxRedirects: 0 });
    expect([302, 303, 307, 308]).toContain(res.status());
    expect(res.headers()["location"]).toContain(local.b.destination.replace("https://", ""));
  });
});
