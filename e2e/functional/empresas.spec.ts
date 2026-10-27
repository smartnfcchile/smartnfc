// Etapa 3 — Empresas: alta de colaboradores hasta el límite, bloqueo, suspensión, corte de sesión y
// aislamiento entre empresas. Solo datos ficticios (@smartnfc.test, empresas e2e-*) en la base desechable.
import { test, expect, isolatedContext } from "../support/fixtures";
import type { Page } from "@playwright/test";
import { login, loginAndWaitForDashboard, LOGIN_ERROR } from "../support/auth";
import { readOnly } from "../support/db-guard";
import { lazy } from "../support/state";

const accounts = lazy("accounts");
const cards = lazy("cards");

const NUEVOS = [1, 2, 3].map((n) => ({ name: `Colaborador Nuevo ${n} E2E`, email: `e2e-equipo-nuevo-${n}@smartnfc.test` }));
const SEXTO = { name: "Colaborador Excedente E2E", email: "e2e-equipo-excedente@smartnfc.test" };
const REEMPLAZO = { name: "Colaborador Reemplazo E2E", email: "e2e-equipo-reemplazo@smartnfc.test" };

const equipo = () => readOnly(async (db) => {
  const company = await db.company.findUniqueOrThrow({ where: { slug: "e2e-equipo" }, select: { id: true } });
  return {
    companyId: company.id,
    activeCards: await db.card.count({ where: { companyId: company.id, isActive: true } }),
    users: await db.user.count({ where: { companyId: company.id } }),
  };
});

async function openUsers(page: Page) {
  await page.goto("/dashboard/users");
  await expect(page.getByRole("button", { name: /Nuevo Colaborador \+ Tarjeta/ })).toBeVisible({ timeout: 20_000 });
}

async function createCollaborator(page: Page, person: { name: string; email: string }) {
  await page.getByRole("button", { name: /Nuevo Colaborador \+ Tarjeta/ }).click();
  await page.getByPlaceholder("Ej. Juan Pérez").fill(person.name);
  await page.getByPlaceholder("juan@empresa.cl").fill(person.email);
  await page.getByRole("button", { name: "Crear colaborador y tarjeta" }).click();
}

/** Texto del aviso de error del modal (recuadro rojo con «⚠️»), registrado como anotación del informe. */
async function modalError(page: Page) {
  const box = page.locator("form div.border-red-500").first();
  await expect(box).toBeVisible({ timeout: 20_000 });
  const text = (await box.innerText()).trim();
  test.info().annotations.push({ type: "mensaje mostrado al usuario", description: text });
  return text;
}

const closeModal = (page: Page) => page.getByRole("button", { name: "Cerrar", exact: true }).click();

test.describe("Empresas: equipo con licencia Equipo 5 (en serie)", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ allowMutations: true });

  test.beforeEach(async ({ page }) => {
    await loginAndWaitForDashboard(page, accounts.equipoOwner);
  });

  test("alta de colaboradores hasta 5/5: cuenta pendiente, tarjeta, solicitud física y auditoría, sin enviar correos", async ({ page }) => {
    await openUsers(page);
    await expect(page.getByText("Identidades activas: 2 de 5")).toBeVisible();

    for (const person of NUEVOS) {
      await createCollaborator(page, person);
      await expect(page.getByText(/Colaborador y tarjeta creados/)).toBeVisible({ timeout: 20_000 });
      // Sin proveedor de correo en E2E: la app crea todo y avisa que no pudo enviar la invitación.
      await expect(page.getByText(/no fue posible enviar la invitación al colaborador/)).toBeVisible();
      await closeModal(page);
    }

    await openUsers(page);
    await expect(page.getByText("Identidades activas: 5 de 5")).toBeVisible();
    for (const person of NUEVOS) await expect(page.getByRole("row", { name: new RegExp(person.email) })).toContainText("Pendiente de activación");

    type CreatedUser = { status: string; isActive: boolean; password: string | null; role: string; audit: string[];
      cards: Array<{ id: string; isActive: boolean; physicalCards: Array<{ status: string }> }>; activationTokens: Array<{ usedAt: Date | null }> };
    const stored: CreatedUser[] = await readOnly(async (db) => Promise.all(NUEVOS.map(async (p) => {
      const u = await db.user.findUniqueOrThrow({
        where: { email: p.email },
        select: { status: true, isActive: true, password: true, role: true,
          cards: { select: { id: true, isActive: true, physicalCards: { select: { status: true } } } },
          activationTokens: { select: { usedAt: true } } },
      });
      const audit = await db.adminAuditLog.findMany({ where: { entityId: { in: u.cards.map((c: { id: string }) => c.id) } }, select: { action: true } });
      return { ...u, audit: audit.map((a: { action: string }) => a.action).sort() };
    })));
    for (const u of stored) {
      expect(u).toMatchObject({ status: "PENDING", isActive: false, password: null, role: "COLLABORATOR" });
      expect(u.cards).toHaveLength(1);
      expect(u.cards[0].isActive).toBe(true);
      expect(u.cards[0].physicalCards.map((p: { status: string }) => p.status)).toEqual(["PENDIENTE_GRABACION"]);
      expect(u.activationTokens).toHaveLength(1);
      expect(u.audit).toEqual(["CARD_NOTIFICATION_WARNING", "COLLABORATOR_CARD_REQUEST_CREATED"]);
    }
    expect((await equipo()).activeCards).toBe(5);
  });

  test("con 5/5, el sexto colaborador queda bloqueado y no se crea nada", async ({ page }) => {
    const before = await equipo();
    await openUsers(page);
    await createCollaborator(page, SEXTO);
    await modalError(page); // hay un aviso de error (su texto se verifica en la prueba BUG-E2E-3)
    const after = await equipo();
    expect(after).toEqual(before);
    expect(await readOnly((db) => db.user.count({ where: { email: SEXTO.email } }))).toBe(0);
  });

  // BUG-E2E-3 (detectado 27-oct-2026): las Server Actions informan problemas con throw new Error("...").
  // En el build de producción React oculta ese texto (resolveErrorProd, error #441) y el usuario ve
  // «Minified React error #441…» en lugar de, por ejemplo, «La empresa alcanzó el máximo de identidades…».
  // El bloqueo en el servidor funciona; lo que falla es la comunicación. test.fail() hasta corregirlo.
  test("BUG-E2E-3: el usuario recibe mensajes comprensibles al superar el cupo o repetir un correo", async ({ page }) => {
    // Verificación del PR de BUG-E2E-3: sin test.fail, debe pasar con la corrección.
    await openUsers(page);
    await createCollaborator(page, SEXTO);
    expect(await modalError(page)).toMatch(/máximo de identidades/);
    await closeModal(page);
    await createCollaborator(page, { name: "Duplicado E2E", email: NUEVOS[0].email });
    expect(await modalError(page)).toContain("ya está registrado");
  });

  test("un correo ya registrado se rechaza", async ({ page }) => {
    await openUsers(page);
    await createCollaborator(page, { name: "Duplicado E2E", email: NUEVOS[0].email });
    await modalError(page);
    expect(await readOnly((db) => db.user.count({ where: { email: NUEVOS[0].email } }))).toBe(1);
  });

  test("suspender a una colaboradora corta su sesión abierta, desactiva su tarjeta y conserva el historial", async ({ page, browser, baseURL }) => {
    // Sesión de la colaboradora abierta en otro navegador (contexto aislado).
    const colabContext = await isolatedContext(browser, baseURL!);
    const colab = await colabContext.newPage();
    await loginAndWaitForDashboard(colab, accounts.equipoColab);
    expect((await colab.request.get("/dashboard", { maxRedirects: 0 })).status()).toBe(200);

    await openUsers(page);
    page.once("dialog", (d) => d.accept());
    await page.getByRole("row", { name: new RegExp(accounts.equipoColab.email) }).getByRole("button", { name: /Suspender/ }).click();
    await expect(page.getByRole("row", { name: new RegExp(accounts.equipoColab.email) })).toContainText("Suspendido", { timeout: 20_000 });

    // La sesión JWT sigue en el navegador de la colaboradora, pero el servidor la rechaza en la siguiente solicitud.
    // Se verifica con la solicitud HTTP (con sus cookies) para no renderizar /login?error=suspended, que en main
    // dispara BUG-E2E-1 (corregido en el PR #27).
    const after = await colab.request.get("/dashboard", { maxRedirects: 0 });
    expect(after.status()).toBeGreaterThanOrEqual(300);
    expect(after.status()).toBeLessThan(400);
    expect(after.headers()["location"]).toContain("/login?error=suspended");
    await colabContext.close();

    type SuspendedUser = { status: string; isActive: boolean; password: string | null; cards: Array<{ isActive: boolean; physicalCards: Array<{ status: string }> }> };
    const db: SuspendedUser = await readOnly((tx) => tx.user.findUniqueOrThrow({
      where: { email: accounts.equipoColab.email },
      select: { status: true, isActive: true, password: true, cards: { select: { isActive: true, physicalCards: { select: { status: true } } } } },
    }));
    expect(db.status).toBe("SUSPENDED");
    expect(db.isActive).toBe(false);
    expect(db.password, "las credenciales no se borran: el historial se conserva").toBeTruthy();
    expect(db.cards.map((c: { isActive: boolean }) => c.isActive)).toEqual([false]);
    expect(db.cards[0].physicalCards.map((p: { status: string }) => p.status)).toEqual(["SUSPENDIDA"]);
    expect(await readOnly((tx) => tx.adminAuditLog.count({ where: { action: "COLLABORATOR_SUSPENDED", metadata: { contains: accounts.equipoColab.email } } }))).toBe(1);

    // Su perfil público deja de estar disponible y no puede volver a iniciar sesión.
    expect((await page.request.get(`/c/${cards.equipoColab.slug}`)).status()).toBe(404);
    const fresh = await isolatedContext(browser, baseURL!);
    const again = await fresh.newPage();
    await login(again, accounts.equipoColab);
    await expect(again.getByText(LOGIN_ERROR)).toBeVisible();
    await fresh.close();
  });

  test("la suspensión libera el cupo: se puede crear un colaborador nuevo hasta volver a 5/5", async ({ page }) => {
    await openUsers(page);
    await expect(page.getByText("Identidades activas: 4 de 5")).toBeVisible();
    await createCollaborator(page, REEMPLAZO);
    await expect(page.getByText(/Colaborador y tarjeta creados/)).toBeVisible({ timeout: 20_000 });
    await closeModal(page);
    await openUsers(page);
    await expect(page.getByText("Identidades activas: 5 de 5")).toBeVisible();
    expect((await equipo()).activeCards).toBe(5);
  });
});

test.describe("Empresas: aislamiento entre empresas (solo lectura)", () => {
  test("cada empresa ve solo a sus integrantes", async ({ page }) => {
    await loginAndWaitForDashboard(page, accounts.owner);
    await page.goto("/dashboard/users");
    await expect(page.getByText(accounts.collaborator.email)).toBeVisible();
    for (const ajeno of [accounts.equipoOwner.email, accounts.equipoColab.email, accounts.personaPro.email, accounts.superadmin.email]) {
      await expect(page.getByText(ajeno)).toHaveCount(0);
    }
  });

  test("la dueña de otra empresa no puede abrir el editor de una tarjeta ajena", async ({ page }) => {
    await loginAndWaitForDashboard(page, accounts.equipoOwner);
    await page.goto(`/dashboard/editor/${cards.empresaOwner.id}`);
    await expect(page.getByText("Acceso Denegado")).toBeVisible();
    await expect(page.getByRole("button", { name: "Guardar Cambios" })).toHaveCount(0);
  });
});
