// Navegación pública de SmartNFC. Solo lectura: no inicia sesión ni envía formularios.
import { test, expect } from "../support/fixtures";

const LANDINGS = [
  { label: "Personas", path: "/personas" },
  { label: "Locales", path: "/local" },
  { label: "Empresas", path: "/empresas" },
];

test.describe("Navegación pública", () => {
  test("la portada carga y muestra las tres soluciones", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    // La portada define su propio título; la plantilla "%s | SmartNFC" no aplica al segmento raíz.
    await expect(page).toHaveTitle(/Soluciones NFC/);
    await expect(page.locator("h1").first()).toBeVisible();
    for (const { path } of LANDINGS) {
      await expect(page.locator(`a[href="${path}"]`).first()).toBeAttached();
    }
    await expect(page.locator('a[href="/login"]').first()).toBeAttached();
  });

  for (const { label, path } of LANDINGS) {
    test(`la landing ${label} responde y tiene título principal`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();
    });
  }

  test("los enlaces de WhatsApp apuntan a wa.me sin abrirse", async ({ page }) => {
    await page.goto("/");
    const hrefs = await page.locator('a[href*="wa.me"]').evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(new URL(href).hostname).toBe("wa.me");
  });

  test("la página de login es accesible sin sesión", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBe(200);
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });
});
