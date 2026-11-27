import { expect, test } from "@playwright/test";

const path = "/s/geo-fixture";

test.beforeEach(async ({ page }, info) => {
  const report = (kind: string, detail: string) => console.log(`[${info.project.name}] ${kind}: ${detail}`);
  page.on("console", message => {
    if (message.type() === "error" || message.text().startsWith("UV native click")) report("console", message.text());
  });
  page.on("pageerror", error => report("pageerror", error.message));
  page.on("requestfailed", request => {
    if (request.resourceType() === "script") report("script failed", `${request.url()} ${request.failure()?.errorText}`);
  });
  page.on("response", response => {
    if (response.request().resourceType() === "script" && response.status() >= 400) {
      report("script HTTP error", `${response.status()} ${response.url()}`);
    }
  });
  await page.addInitScript(() => {
    document.addEventListener("click", event => {
      if (!(event.target instanceof Element) || !event.target.closest("button")) return;
      console.info("UV native click", JSON.stringify({
        secure: window.isSecureContext,
        geolocation: typeof navigator.geolocation?.getCurrentPosition,
        scripts: performance.getEntriesByType("resource").filter(entry => entry.name.includes("/_next/")).length,
      }));
    }, true);
  });
});

test("policy headers limit geolocation to the public token route", async ({ request }) => {
  expect((await request.get(path)).headers()["permissions-policy"]).toContain("geolocation=(self)");
  expect((await request.get("/login")).headers()["permissions-policy"]).toContain("geolocation=()");
  expect((await request.get("/s/geo-fixture/extra")).headers()["permissions-policy"]).toContain("geolocation=()");
});

test("fixed, mobile and hybrid, with actual browser geolocation after a click", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: -41, longitude: -73, accuracy: 30 });
  await page.goto(path + "?mode=fixed");
  await expect(page.getByRole("button", { name: "Usar mi ubicación" })).toHaveCount(0);
  await expect(page.getByText("SIMULADO", { exact: true })).toBeVisible();

  for (const mode of ["mobile", "hybrid"]) {
    await page.goto(path + "?mode=" + mode);
    await expect(page.getByRole("status")).toContainText("solo si lo autorizas");
    await page.getByRole("button", { name: "Usar mi ubicación" }).click();
    await expect(page.getByRole("status")).toContainText("Ubicación obtenida. El pronóstico para el teléfono aún no está disponible.");
    await expect(page.getByText("Origen: datos simulados para demostración.")).toBeVisible();
    await expect(page.getByRole("link", { name: "MET Norway" })).toHaveCount(0);
    await expect(page.getByText("Contenido preventivo disponible.")).toBeVisible();
    if (mode === "hybrid") await expect(page.getByText(/Centro de respaldo/)).toBeVisible();
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  }
});

test("refusal keeps the center card and preventive content available", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.geolocation, "getCurrentPosition", {
      value: (_success: PositionCallback, error: PositionErrorCallback) => error({ code: 1 } as GeolocationPositionError),
    });
  });
  await page.goto(path + "?mode=hybrid");
  await page.getByRole("button", { name: "Usar mi ubicación" }).click();
  await expect(page.getByRole("status")).toContainText("No se concedió permiso");
  await expect(page.getByText(/Centro de respaldo/)).toBeVisible();
  await expect(page.getByText("Contenido preventivo disponible.")).toBeVisible();
});

for (const width of [320, 375, 390, 430]) {
  test(`premium card fits ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(path + "?mode=hybrid");
    const card = page.getByRole("region", { name: "Pronóstico UV" });
    await expect(card).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect(await card.locator("svg path").count()).toBeGreaterThan(4);
    await expect(card.getByText("7,2", { exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`uv-${width}.png`), fullPage: true });
    await card.screenshot({ path: info.outputPath(`stage2-card-${width}.png`) });

    await page.goto("/uv-stage1/index.html?estado=fallback");
    const approved = page.locator(".uv");
    await expect(approved.locator("#value")).toHaveText("7,2");
    await expect(approved.locator(".gauge svg path")).toHaveCount(5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await approved.screenshot({ path: info.outputPath(`stage1-card-${width}.png`) });
  });
}
