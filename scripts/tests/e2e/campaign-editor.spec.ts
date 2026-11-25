import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const editor = "/superadmin/soluciones/demo-campana/landing";
const art = process.env.E2E_ARTIFACTS;
const tracePath = process.env.E2E_RAW_TRACE;
const desktop = { width: 1440, height: 1000 };
const mobile = { width: 390, height: 844 };
const origin = "http://127.0.0.1:3000";
const credentials = {
  admin: { email: "campaign-admin@example.test", password: process.env.E2E_ADMIN_PASSWORD, role: "SUPERADMIN" },
  collab: { email: "campaign-collab@example.test", password: process.env.E2E_COLLAB_PASSWORD, role: "COLLABORATOR" },
} as const;

async function login(page: Page, user: keyof typeof credentials) {
  const { email, password, role } = credentials[user];
  if (!password) throw new Error("Missing ephemeral fixture credentials");
  try {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole("button", { name: "Entrar al Sistema" }).click();
    await page.waitForURL(url => !url.pathname.startsWith("/login"));
    const response = await page.request.get("/api/auth/session");
    if (!response.ok() || (await response.json())?.user?.role !== role) throw new Error("Wrong session role");
  } catch {
    // Avoid attaching Playwright's login call log or session response to the public CI report.
    throw new Error(`NextAuth form did not establish the expected ${user} session`);
  }
}

async function openEditor(page: Page) {
  await page.goto(editor);
  await expect(page.getByRole("heading", { name: "Landing de Campañas", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar borrador" })).toBeVisible();
}

function instrument(page: Page) {
  const issues: string[] = [];
  page.on("pageerror", () => issues.push("Uncaught browser exception"));
  page.on("requestfailed", request => {
    if (request.url().startsWith(origin + "/") && !request.failure()?.errorText.includes("ERR_ABORTED")) issues.push("Failed local request");
  });
  page.on("response", response => {
    if (response.url().startsWith(origin + "/") && response.status() >= 500) issues.push("Local server error");
  });
  return issues;
}

async function stubFictionalMedia(context: BrowserContext) {
  await context.route("https://example.com/uv-*.svg", route => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="56"><rect width="120" height="56" fill="#047857"/><text x="10" y="35" fill="white">UV FICTICIO</text></svg>',
  }));
}

test("NextAuth denies anonymous and collaborator access", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: origin, viewport: desktop });
  try {
    const page = await context.newPage();
    await page.goto(editor);
    await expect(page).toHaveURL(/\/login\?error=superadminRequired/);
    await login(page, "collab");
    await page.goto(editor);
    await expect(page).toHaveURL(/\/login\?error=superadminRequired/);
    await expect(page.getByRole("button", { name: "Guardar borrador" })).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("SUPERADMIN edits six blocks, site identity, and drafts across desktop and mobile sessions", async ({ browser }) => {
  if (!art || !tracePath) throw new Error("Missing scoped evidence paths");
  mkdirSync(art, { recursive: true });
  const desktopContext = await browser.newContext({ baseURL: origin, viewport: desktop });
  const mobileContext = await browser.newContext({ baseURL: origin, viewport: mobile, isMobile: true, hasTouch: true });
  let tracing = false;
  try {
    await Promise.all([stubFictionalMedia(desktopContext), stubFictionalMedia(mobileContext)]);
    const page = await desktopContext.newPage();
    const phone = await mobileContext.newPage();
    const issues = [...[instrument(page), instrument(phone)]];
    await login(page, "admin");
    await login(phone, "admin");
    await openEditor(page);
    await openEditor(phone);
    await desktopContext.tracing.start({ snapshots: false, screenshots: true, sources: false });
    tracing = true;

    const library = page.getByRole("region", { name: "Biblioteca de bloques" });
    const settings = page.getByRole("region", { name: "Configuración" });
    const preview = page.getByRole("region", { name: "Vista previa del borrador" });
    const boxes = await Promise.all([library.boundingBox(), settings.boundingBox(), preview.boundingBox()]);
    expect(boxes.every(Boolean)).toBe(true);
    expect(boxes[0]!.x).toBeLessThan(boxes[1]!.x);
    expect(boxes[1]!.x).toBeLessThan(boxes[2]!.x);

    const cases = [
      { name: "Hero", field: "Título", text: "Protégete de la radiación UV" },
      { name: "Texto", field: "Texto", text: "Aplica protección antes de salir" },
      { name: "Imagen", field: "URL HTTPS de la imagen", text: "https://example.com/uv-image.svg" },
      { name: "Lista", field: "Elemento 1", text: "Lleva ropa de protección" },
      { name: "Preguntas frecuentes", field: "Pregunta 1", text: "¿Dónde encuentro sombra?" },
      { name: "Botón HTTPS", field: "Texto del botón", text: "Consultar medidas" },
    ];
    for (const [index, item] of cases.entries()) {
      await library.getByRole("button", { name: "+ " + item.name, exact: true }).click();
      const input = item.name === "Hero" || item.name === "Texto" ? settings.locator("textarea") : settings.getByLabel(item.field, { exact: true });
      await input.fill(item.text);
      if (item.name === "Imagen") await settings.getByLabel("Texto alternativo").fill("Viñeta UV ficticia");
      if (item.name === "Botón HTTPS") await settings.getByLabel("Destino HTTPS").fill("https://example.com/medidas");
      const rendered = item.name === "Imagen" ? preview.getByAltText("Viñeta UV ficticia") : preview.getByText(item.text, { exact: true });
      await expect(rendered).toHaveCount(1);
      await settings.getByRole("button", { name: "Duplicar", exact: true }).click();
      await expect(rendered).toHaveCount(2);
      await settings.getByRole("button", { name: "Subir", exact: true }).click();
      await expect(library.locator('ol button[aria-pressed="true"]')).toHaveText(`${index + 1}. ${item.name}`);
      await settings.getByRole("button", { name: "Bajar", exact: true }).click();
      await expect(library.locator('ol button[aria-pressed="true"]')).toHaveText(`${index + 2}. ${item.name}`);
      await settings.getByLabel("Ocultar bloque").check();
      await expect(rendered).toHaveCount(1);
      await settings.getByRole("button", { name: "Eliminar", exact: true }).click();
      await expect(library.locator("ol li")).toHaveCount(index + 1);
    }

    await library.getByRole("button", { name: "Identidad y sedes" }).click();
    await settings.getByLabel("Logo (URL HTTPS)", { exact: true }).fill("https://example.com/uv-logo.svg");
    await settings.getByLabel("Color corporativo").fill("#104050");
    await settings.getByLabel("Tipografía").selectOption("serif");
    await settings.getByLabel("Estilo").selectOption("bold");
    await expect(preview.locator('img[src$="uv-logo.svg"]')).toBeVisible();
    await expect(preview.locator("article")).toHaveClass(/font-serif/);
    await expect(preview.getByRole("heading", { name: cases[0].text })).toHaveClass(/font-extrabold/);
    await expect(preview.locator("header")).toHaveCSS("border-top-color", "rgb(16, 64, 80)");

    await library.getByRole("button", { name: "1. Hero", exact: true }).click();
    await settings.getByLabel("Proteger en todas las sedes").check();
    await library.getByRole("button", { name: "Identidad y sedes" }).click();
    await settings.getByLabel("Nueva sede").fill("Sede Costa ficticia");
    await settings.getByRole("button", { name: "Crear sede" }).click();
    await expect(settings.getByLabel("Color de la sede")).toBeVisible();
    await settings.getByLabel("Color de la sede").fill("#047857");
    await library.getByRole("button", { name: /1\. Hero/ }).click();
    await expect(settings.getByText(/solo puede editarse en la plantilla/)).toBeVisible();
    await expect(settings.getByLabel("Título", { exact: true })).toHaveCount(0);
    await library.getByRole("button", { name: "2. Texto", exact: true }).click();
    await settings.locator("textarea").fill("Punto de sombra junto al acceso ficticio");
    await expect(preview.getByText("Punto de sombra junto al acceso ficticio")).toBeVisible();
    await expect(preview.getByRole("heading", { name: cases[0].text })).toBeVisible();
    await expect(preview.locator("header")).toHaveCSS("border-top-color", "rgb(4, 120, 87)");
    await page.getByRole("button", { name: "Guardar borrador" }).click();
    await expect(page.getByText("Borrador guardado.", { exact: true })).toBeVisible();
    await page.screenshot({ path: join(art, "editor-desktop-1440x1000.png"), fullPage: true });

    const tinyLibrary = phone.getByRole("region", { name: "Biblioteca de bloques" });
    const tinySettings = phone.getByRole("region", { name: "Configuración" });
    const tinyPreview = phone.getByRole("region", { name: "Vista previa del borrador" });
    const tinyBoxes = await Promise.all([tinyLibrary.boundingBox(), tinySettings.boundingBox(), tinyPreview.boundingBox()]);
    expect(tinyBoxes.every(Boolean)).toBe(true);
    expect(tinyBoxes[0]!.y).toBeLessThan(tinyBoxes[1]!.y);
    expect(tinyBoxes[1]!.y).toBeLessThan(tinyBoxes[2]!.y);
    expect(await phone.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(mobile.width);
    await tinyLibrary.getByRole("button", { name: "+ Hero", exact: true }).click();
    await tinySettings.locator("textarea").fill("Edición de la segunda sesión");
    await phone.getByRole("button", { name: "Guardar borrador" }).click();
    await expect(phone.getByRole("alert").filter({ hasText: /Otra sesión guardó/ })).toBeVisible();
    await expect(tinyPreview.getByText("Edición de la segunda sesión")).toBeVisible();
    await expect(phone.getByRole("button", { name: "Guardar borrador" })).toBeDisabled();
    await phone.screenshot({ path: join(art, "conflicto-mobile-390x844.png"), fullPage: true });

    await phone.reload();
    await expect(tinyPreview.getByRole("heading", { name: cases[0].text })).toBeVisible();
    await phone.getByLabel("Contenido").selectOption({ label: "Sede Costa ficticia" });
    await expect(tinyPreview.getByText("Punto de sombra junto al acceso ficticio")).toBeVisible();
    await expect(tinyPreview.locator("header")).toHaveCSS("border-top-color", "rgb(4, 120, 87)");
    await tinyPreview.scrollIntoViewIfNeeded();
    await phone.screenshot({ path: join(art, "variante-mobile-390x844.png"), fullPage: true });
    expect(issues.flat()).toEqual([]);
  } finally {
    try {
      if (tracing) await desktopContext.tracing.stop({ path: tracePath });
    } finally {
      await Promise.all([desktopContext.close(), mobileContext.close()]);
    }
  }
});
