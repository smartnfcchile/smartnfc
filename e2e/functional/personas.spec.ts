// Etapa 2 — Personas: edición del perfil, enlaces, campos visibles, vCard y persistencia.
// Solo cuentas y tarjetas ficticias (@smartnfc.test, slugs e2e-*) sobre PostgreSQL desechable.
import { test, expect } from "../support/fixtures";
import type { Page } from "@playwright/test";
import { loginAndWaitForDashboard } from "../support/auth";
import { readOnly } from "../support/db-guard";
import { lazy } from "../support/state";
import { PROFILE_INACTIVE_TITLE } from "../../lib/public-profile-status";

const accounts = lazy("accounts");
const cards = lazy("cards");

// Datos ficticios que se escriben desde el editor. El nombre lleva "," y ";" para verificar el escape de la vCard.
const PERFIL = {
  profileName: "Ana Pérez, QA; E2E",
  role: "Jefa de Pruebas Ficticia",
  companyName: "Estudio Ficticio E2E",
  bio: "Perfil de prueba automatizada. No corresponde a una persona real.",
  location: "Valdivia (ficticio)",
  email: "ana.perez@smartnfc.test",
  phone: "56911112222",
  whatsapp: "56933334444",
  linkedin: "https://www.linkedin.com/in/ana-perez-e2e-ficticia",
};
const ENLACE = { title: "Catálogo ficticio E2E", url: "https://ejemplo.smartnfc.test/catalogo-e2e" };

async function openEditor(page: Page) {
  await page.goto(`/dashboard/editor/${cards.personaPro.id}`);
  await expect(page.getByRole("button", { name: "Guardar Cambios" }).first()).toBeVisible({ timeout: 20_000 });
}

async function tab(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).first().click();
}

/** Guarda con el botón real y devuelve el texto del aviso (la app usa alert()). */
async function save(page: Page) {
  const dialog = page.waitForEvent("dialog");
  await page.getByRole("button", { name: "Guardar Cambios" }).first().click();
  const d = await dialog;
  const message = d.message();
  await d.accept();
  return message;
}

async function vcardOf(page: Page) {
  const href = await page.locator('a[href^="data:text/vcard"]').first().getAttribute("href");
  expect(href, "el perfil público ofrece «Guardar contacto»").toBeTruthy();
  return decodeURIComponent(href!.slice(href!.indexOf(",") + 1));
}

const storedCard = () => readOnly((db) => db.card.findUniqueOrThrow({
  where: { id: cards.personaPro.id },
  select: { profileName: true, role: true, companyName: true, bio: true, location: true, email: true, phone: true, whatsapp: true, linkedin: true,
    showEmail: true, showPhone: true, showWhatsapp: true, showLinkedin: true, links: { select: { title: true, url: true } } },
})) as Promise<{
  profileName: string | null; role: string | null; companyName: string | null; bio: string | null; location: string | null;
  email: string | null; phone: string | null; whatsapp: string | null; linkedin: string | null;
  showEmail: boolean; showPhone: boolean; showWhatsapp: boolean; showLinkedin: boolean; links: Array<{ title: string; url: string }>;
}>;

test.describe("Personas: edición del perfil (en serie sobre una tarjeta ficticia)", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ allowMutations: true });

  test.beforeEach(async ({ page }) => {
    await loginAndWaitForDashboard(page, accounts.personaPro);
  });

  test("editar información y contacto: se guarda, persiste al recargar y se publica", async ({ page }) => {
    await openEditor(page);
    await tab(page, "Información");
    for (const key of ["profileName", "role", "companyName", "bio", "location"] as const) {
      await page.locator(`[name="${key}"]`).fill(PERFIL[key]);
    }
    await tab(page, "Contacto");
    for (const key of ["email", "phone", "whatsapp", "linkedin"] as const) {
      await page.locator(`input[name="${key}"]`).fill(PERFIL[key]);
    }
    for (const show of ["showEmail", "showPhone", "showWhatsapp", "showLinkedin"]) {
      await page.locator(`input[name="${show}"]`).check();
    }
    expect(await save(page)).toContain("Cambios guardados con éxito");

    // Persistencia en la base
    const db = await storedCard();
    expect(db).toMatchObject({ ...PERFIL, showEmail: true, showPhone: true, showWhatsapp: true, showLinkedin: true });

    // Persistencia al volver a abrir el editor
    await openEditor(page);
    await tab(page, "Información");
    await expect(page.locator('[name="profileName"]')).toHaveValue(PERFIL.profileName);
    await expect(page.locator('[name="bio"]')).toHaveValue(PERFIL.bio);
    await tab(page, "Contacto");
    await expect(page.locator('input[name="email"]')).toHaveValue(PERFIL.email);

    // Perfil público
    const res = await page.goto(`/c/${cards.personaPro.slug}`);
    expect(res?.status()).toBe(200);
    for (const text of [PERFIL.profileName, PERFIL.role, PERFIL.bio]) {
      await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
    }
    await expect(page.locator(`a[href="mailto:${PERFIL.email}"]`).first()).toBeAttached();
    await expect(page.locator(`a[href^="tel:"]`).first()).toBeAttached();
    await expect(page.locator(`a[href^="https://wa.me/"]`).first()).toBeAttached();
    expect(await page.locator(`a[href^="https://wa.me/"]`).first().getAttribute("href")).toContain(PERFIL.whatsapp);
    await expect(page.locator(`a[href="${PERFIL.linkedin}"]`).first()).toBeAttached();
  });

  test("vCard «Guardar contacto»: datos del perfil con el escape correcto", async ({ page }) => {
    await page.goto(`/c/${cards.personaPro.slug}`);
    const vcard = await vcardOf(page);
    const lines = vcard.split(/\r?\n/);
    expect(lines[0]).toBe("BEGIN:VCARD");
    expect(lines).toContain("VERSION:3.0");
    expect(lines).toContain("FN:Ana Pérez\\, QA\\; E2E");
    expect(lines).toContain(`ORG:${PERFIL.companyName}`);
    expect(lines).toContain(`TITLE:${PERFIL.role}`);
    expect(lines).toContain(`TEL:${PERFIL.phone}`);
    expect(lines).toContain(`EMAIL:${PERFIL.email}`);
    expect(lines.at(-1)).toBe("END:VCARD");
  });

  test("enlaces personalizados: agregar y eliminar, con persistencia y publicación", async ({ page }) => {
    await openEditor(page);
    await tab(page, "Enlaces");
    await page.locator('input[name="title"]').fill(ENLACE.title);
    await page.locator('input[name="url"]').fill(ENLACE.url);
    await page.getByRole("button", { name: "Agregar Enlace" }).click();
    await expect(page.getByText(ENLACE.title).first()).toBeVisible();
    await expect.poll(async () => (await storedCard()).links).toEqual([ENLACE]);

    await page.goto(`/c/${cards.personaPro.slug}`);
    await expect(page.locator(`a[href="${ENLACE.url}"]`).first()).toBeAttached();

    await openEditor(page);
    await tab(page, "Enlaces");
    page.once("dialog", (d) => d.accept());
    // Fila del enlace: <div class="flex ..."> con el título y el botón de eliminar (confirm() se acepta).
    const row = page.locator("div.justify-between", { has: page.getByText(ENLACE.url, { exact: true }) });
    await row.getByRole("button").click();
    await expect.poll(async () => (await storedCard()).links).toEqual([]);
    await page.goto(`/c/${cards.personaPro.slug}`);
    await expect(page.locator(`a[href="${ENLACE.url}"]`)).toHaveCount(0);
  });

  test("ocultar correo y teléfono: se guarda y desaparecen del perfil público", async ({ page }) => {
    await openEditor(page);
    await tab(page, "Contacto");
    await page.locator('input[name="showEmail"]').uncheck();
    await page.locator('input[name="showPhone"]').uncheck();
    expect(await save(page)).toContain("Cambios guardados con éxito");

    const db = await storedCard();
    expect(db.showEmail).toBe(false);
    expect(db.showPhone).toBe(false);
    expect(db.email).toBe(PERFIL.email); // el dato se conserva; solo deja de mostrarse

    await page.goto(`/c/${cards.personaPro.slug}`);
    await expect(page.getByText(PERFIL.profileName).first()).toBeVisible();
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
    await expect(page.locator('a[href^="https://wa.me/"]').first()).toBeAttached(); // WhatsApp sigue visible
  });

  // BUG-E2E-2 (candidato, requiere decisión de producto): con «Mostrar» desmarcado, el correo y el teléfono
  // siguen saliendo en la vCard (lib/card-profile/vcard.ts no considera showEmail/showPhone) y en el HTML de la
  // página, porque app/c/[slug]/page.tsx entrega la tarjeta completa al componente cliente.
  test("BUG-E2E-2: un dato oculto no se publica en la vCard ni en el HTML del perfil", async ({ page }) => {
    test.fail(true, "BUG-E2E-2: correo/teléfono ocultos siguen en la vCard y en el HTML público");
    await page.goto(`/c/${cards.personaPro.slug}`);
    const vcard = await vcardOf(page);
    expect(vcard).not.toContain(PERFIL.email);
    expect(vcard).not.toContain(PERFIL.phone);
    const html = await page.content();
    expect(html).not.toContain(PERFIL.email);
    expect(html).not.toContain(PERFIL.phone);
  });
});

test.describe("Personas: estados del perfil público y permisos (solo lectura)", () => {
  test("Pro vencido: el perfil básico con derecho permanente sigue publicado", async ({ page }) => {
    const res = await page.goto(`/c/${cards.personaBase.slug}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByText("Camila Base E2E").first()).toBeVisible();
    await expect(page.locator('a[href="mailto:camila.base@smartnfc.test"]').first()).toBeAttached();
  });

  test("sin derecho de perfil: muestra el estado neutral, sin datos ni motivos administrativos", async ({ page }) => {
    const res = await page.goto(`/c/${cards.personaSinDerecho.slug}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByText(PROFILE_INACTIVE_TITLE)).toBeVisible();
    await expect(page.getByText("Sin Derecho E2E")).toHaveCount(0);
    await expect(page.getByText(/licencia|pago|deuda|plan/i)).toHaveCount(0);
  });

  test("tarjeta desactivada: el perfil público responde 404", async ({ page }) => {
    const res = await page.goto(`/c/${cards.inactiva.slug}`);
    expect(res?.status()).toBe(404);
  });

  test("otra empresa no puede abrir el editor de la tarjeta", async ({ page }) => {
    await loginAndWaitForDashboard(page, accounts.owner);
    await page.goto(`/dashboard/editor/${cards.personaPro.id}`);
    await expect(page.getByText("Acceso Denegado")).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar Cambios" })).toHaveCount(0);
  });

  test("Superadmin ve el perfil protegido, no el formulario", async ({ page }) => {
    await loginAndWaitForDashboard(page, accounts.superadmin);
    await page.goto(`/dashboard/editor/${cards.personaPro.id}`);
    await expect(page.getByText("Perfil protegido")).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar Cambios" })).toHaveCount(0);
  });
});
