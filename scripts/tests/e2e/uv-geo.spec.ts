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
    await expect(card.locator("strong").first()).toHaveText("7,2");
    const inspectCard = (node: Element) => {
      const gauge = node.querySelector("svg")!;
      const value = node.querySelector("strong, #value")!;
      const button = node.querySelector("button")!;
      const box = node.getBoundingClientRect();
      return {
        background: getComputedStyle(node).backgroundImage,
        foreground: getComputedStyle(node).color,
        bands: [...gauge.querySelectorAll("path")].map(segment => segment.getAttribute("stroke")),
        font: getComputedStyle(value).fontFamily,
        valueSize: parseFloat(getComputedStyle(value).fontSize),
        buttonSize: button.getBoundingClientRect().height,
        buttonColor: getComputedStyle(button).color,
        buttonBackground: getComputedStyle(button).backgroundColor,
        overflows: node.scrollWidth > node.clientWidth || box.left < 0 || box.right > innerWidth,
      };
    };
    const actual = await card.evaluate(inspectCard);
    await page.screenshot({ path: info.outputPath(`uv-${width}.png`), fullPage: true });
    await card.screenshot({ path: info.outputPath(`stage2-card-${width}.png`) });

    await page.goto("/uv-stage1/index.html?estado=fallback");
    const approved = page.locator(".uv");
    await expect(approved.locator("#value")).toHaveText("7,2");
    await expect(approved.locator(".gauge svg path")).toHaveCount(5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await approved.screenshot({ path: info.outputPath(`stage1-card-${width}.png`) });
    const baseline = await approved.evaluate(inspectCard);
    await info.attach("visual-comparison", { body: JSON.stringify({ width, baseline, actual }, null, 2), contentType: "application/json" });
    expect(actual.background).toBe(baseline.background);
    expect(actual.foreground).toBe(baseline.foreground);
    expect(actual.bands).toEqual(baseline.bands);
    expect(actual.buttonColor).toBe(baseline.buttonColor);
    expect(actual.buttonBackground).toBe(baseline.buttonBackground);
    expect(actual.buttonSize).toBeGreaterThanOrEqual(44);
    expect(actual.valueSize).toBeGreaterThanOrEqual(44);
    expect(actual.overflows).toBe(false);
    expect(baseline.overflows).toBe(false);
  });
}


test("hybrid content renders before a forecast and sends only the coarse phone cell", async ({ page, context }, info) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: -39.814235, longitude: -73.245912, accuracy: 30 });
  let release!: () => void;
  const ready = new Promise<void>(resolve => { release = resolve; });
  const sent: unknown[] = [];
  await page.route("**/api/uv/forecast", async route => {
    const body = route.request().postDataJSON() as { token: string; cell?: string };
    sent.push(body);
    if (!body.cell) await ready;
    const now = new Date();
    const at = new Date(now.getTime() - now.getTime() % 3600000).toISOString();
    await route.fulfill({ json: {
      status: "available", source: body.cell ? "phone" : "center",
      series: { updatedAt: at, samples: [{ at, value: body.cell ? 7.2 : 4.3 }] },
    } });
  });
  try {
    await page.goto(path + "?mode=hybrid&transport=1");
    await expect.poll(() => sent.length).toBe(1);
    await expect(page.getByText("Contenido preventivo disponible.")).toBeVisible();
    await expect(page.getByText("Sin datos de pronóstico para mostrar.")).toHaveCount(0);
  } finally {
    release();
  }
  const card = page.getByRole("region", { name: "Pronóstico UV" });
  await expect(card.locator("strong").first()).toHaveText("4,3");
  await page.getByRole("button", { name: "Usar mi ubicación" }).click();
  await expect(card.locator("strong").first()).toHaveText("7,2");
  await expect(card.getByRole("status")).toContainText("zona aproximada del teléfono");
  await expect(card.getByText("SIMULADO", { exact: true })).toBeVisible();
  expect(sent).toEqual([{ token: "x".repeat(32) }, { token: "x".repeat(32), cell: "v1:-3981:-7325" }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await card.screenshot({ path: info.outputPath("stage3-simulated-phone-390.png") });
});


test("hybrid retains the center offline and recovers without accepting an older center response over the phone", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: -39.814235, longitude: -73.245912, accuracy: 30 });
  let releaseCenter!: () => void;
  const pendingCenter = new Promise<void>(resolve => { releaseCenter = resolve; });
  let centerResponded = false;
  let requested = 0;
  await page.route("**/api/uv/forecast", async route => {
    const input = route.request().postDataJSON() as { cell?: string };
    if (input.cell) requested++;
    else await pendingCenter;
    const at = new Date(Math.floor(Date.now() / 3600000) * 3600000).toISOString();
    await route.fulfill({ json: { status: "available", source: input.cell ? "phone" : "center",
      series: { updatedAt: at, samples: [{ at, value: input.cell ? 7.2 : 4.3 }] },
    } });
    if (!input.cell) centerResponded = true;
  });
  try {
    await page.goto(path + "?mode=hybrid&transport=1");
    const card = page.getByRole("region", { name: "Pronóstico UV" });
    await card.getByRole("button", { name: "Usar mi ubicación" }).click();
    await expect(card.locator("strong").first()).toHaveText("7,2");
    releaseCenter();
    await expect.poll(() => centerResponded).toBe(true);
    await expect(card.getByText("SIMULADO", { exact: true })).toBeVisible();
    await expect(card.locator("strong").first()).toHaveText("7,2");

    await page.unroute("**/api/uv/forecast");
    await context.setOffline(true);
    await card.getByRole("button", { name: "Actualizar mi ubicación" }).click();
    await expect(card.getByRole("status")).toContainText("aún no está disponible");
    await expect(card.locator("strong").first()).toHaveText("4,3");
    await expect(page.getByText("Contenido preventivo disponible.")).toBeVisible();
    await context.setOffline(false);
    await page.route("**/api/uv/forecast", async route => {
      const at = new Date(Math.floor(Date.now() / 3600000) * 3600000).toISOString();
      await route.fulfill({ json: { status: "available", source: "phone",
        series: { updatedAt: at, samples: [{ at, value: 7.2 }] },
      } });
    });
    await card.getByRole("button", { name: "Actualizar mi ubicación" }).click();
    await expect(card.getByRole("status")).toContainText("zona aproximada del teléfono");
    await expect(card.locator("strong").first()).toHaveText("7,2");
    expect(requested).toBe(1);
  } finally {
    releaseCenter();
    await context.setOffline(false);
  }
});
