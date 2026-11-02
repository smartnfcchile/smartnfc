// Etapa 1 — Autenticación y roles. Solo cuentas ficticias @smartnfc.test sobre PostgreSQL desechable.
import { createHash } from "node:crypto";
import { test, expect } from "../support/fixtures";
import { login, loginAndWaitForDashboard, LOGIN_ERROR } from "../support/auth";
import { readOnly } from "../support/db-guard";
import { loadSeedState, strongPassword } from "../support/seed";

// Carga diferida: Playwright recolecta los archivos antes de ejecutar el globalSetup (seed).
const state = () => loadSeedState();
const accounts = new Proxy({} as ReturnType<typeof loadSeedState>["accounts"], { get: (_t, k) => state().accounts[k as keyof ReturnType<typeof loadSeedState>["accounts"]] });
const tokens = new Proxy({} as ReturnType<typeof loadSeedState>["tokens"], { get: (_t, k) => state().tokens[k as keyof ReturnType<typeof loadSeedState>["tokens"]] });
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

test.describe("Inicio de sesión", () => {
  test("credenciales válidas llevan al panel y la sesión sobrevive a una recarga", async ({ page }) => {
    await loginAndWaitForDashboard(page, accounts.owner);
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Cerrar Sesión").first()).toBeVisible();
  });

  test("el correo se normaliza (mayúsculas y espacios)", async ({ page }) => {
    await loginAndWaitForDashboard(page, { email: `  ${accounts.collaborator.email.toUpperCase()}  `, password: accounts.collaborator.password });
  });

  for (const [caso, credenciales] of [
    ["contraseña incorrecta", () => ({ email: accounts.owner.email, password: "Incorrecta-123!x" })],
    ["correo inexistente", () => ({ email: "no-existe@smartnfc.test", password: "Cualquiera-123!x" })],
    ["usuario suspendido", () => accounts.suspended],
    ["empresa inactiva", () => accounts.inactiveCompany],
    ["cuenta pendiente sin contraseña", () => ({ email: accounts.pending.email, password: "Cualquiera-123!x" })],
  ] as const) {
    test(`rechaza el acceso: ${caso}`, async ({ page }) => {
      await login(page, credenciales());
      await expect(page.getByText(LOGIN_ERROR)).toBeVisible();
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test("cerrar sesión invalida el acceso al panel", async ({ page }) => {
    await loginAndWaitForDashboard(page, accounts.owner);
    await page.getByRole("button", { name: /Cerrar Sesión/ }).first().click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Acceso por rol y URL directa", () => {
  test("sin sesión, /dashboard y /superadmin terminan en /login", async ({ page }) => {
    for (const path of ["/dashboard", "/dashboard/users", "/superadmin"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/login/);
    }
  });

  test("Superadmin accede a la consola de administración", async ({ page }) => {
    await loginAndWaitForDashboard(page, accounts.superadmin);
    await page.goto("/superadmin");
    await expect(page).toHaveURL(/\/superadmin/);
    await expect(page.getByText("Panel Superadministración")).toBeVisible();
  });

  test("Dueña de empresa: gestiona usuarios pero no entra a /superadmin", async ({ page }) => {
    await loginAndWaitForDashboard(page, accounts.owner);
    await page.goto("/dashboard/users");
    await expect(page).toHaveURL(/\/dashboard\/users/);
    await expect(page.getByText(accounts.collaborator.email)).toBeVisible();
    await page.goto("/superadmin");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("Colaborador: no entra a usuarios ni a /superadmin", async ({ page }) => {
    await loginAndWaitForDashboard(page, accounts.collaborator);
    for (const path of ["/dashboard/users", "/superadmin"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/dashboard$/);
    }
  });
});

test.describe("Activación de cuenta (sin correos: el enlace lo crea el seed)", () => {
  test.use({ allowMutations: true });

  test("activar con un enlace válido guarda la contraseña y el enlace no se puede reutilizar", async ({ page }) => {
    const password = strongPassword();
    await page.goto(`/activar-cuenta?token=${tokens.activation}`);
    await page.locator("#new-password").fill(password);
    await page.locator("#confirm-password").fill(password);
    await page.getByRole("button", { name: "Activar mi Cuenta" }).click();
    await expect(page).toHaveURL(/\/login\?activated=true/, { timeout: 20_000 });

    const stored: { status: string; isActive: boolean; password: string | null; activationTokens: Array<{ usedAt: Date | null; tokenHash: string }> } = await readOnly((db) => db.user.findUniqueOrThrow({
      where: { email: accounts.pending.email },
      select: { status: true, isActive: true, password: true, activationTokens: { select: { usedAt: true, tokenHash: true } } },
    }));
    expect(stored.status).toBe("ACTIVE");
    expect(stored.isActive).toBe(true);
    expect(stored.password).toBeTruthy();
    expect(stored.activationTokens.find((t) => t.tokenHash === sha256(tokens.activation))?.usedAt).toBeTruthy();

    await loginAndWaitForDashboard(page, { email: accounts.pending.email, password });

    await page.context().clearCookies();
    await page.goto(`/activar-cuenta?token=${tokens.activation}`);
    await expect(page.getByText("Token Inválido o Expirado")).toBeVisible();
    await expect(page.getByText("Este enlace de activación ya fue utilizado.")).toBeVisible();
  });

  test("un enlace vencido o ausente no permite activar", async ({ page }) => {
    await page.goto(`/activar-cuenta?token=${tokens.activationExpired}`);
    await expect(page.getByText("Este enlace de activación ha expirado.")).toBeVisible();
    await page.goto("/activar-cuenta");
    await expect(page.getByText("Enlace Inválido")).toBeVisible();
    await page.goto("/activar-cuenta?token=token-inventado-que-no-existe");
    await expect(page.getByText("Token Inválido o Expirado")).toBeVisible();
  });
});

test.describe("Restablecimiento de contraseña (sin correos)", () => {
  test.use({ allowMutations: true });

  test("con un enlace válido cambia la contraseña: la anterior deja de servir", async ({ page }) => {
    const password = strongPassword();
    await page.goto(`/restablecer-contrasena?token=${tokens.reset}`);
    const fields = page.locator('input[type="password"]');
    await fields.nth(0).fill(password);
    await fields.nth(1).fill(password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/login\?reset=true/, { timeout: 20_000 });

    const usedAt: { usedAt: Date | null } = await readOnly((db) => db.passwordResetToken.findUniqueOrThrow({ where: { tokenHash: sha256(tokens.reset) }, select: { usedAt: true } }));
    expect(usedAt.usedAt).toBeTruthy();

    await login(page, accounts.resetComplete);
    await expect(page.getByText(LOGIN_ERROR)).toBeVisible();
    await loginAndWaitForDashboard(page, { email: accounts.resetComplete.email, password });
  });

  test("solicitar un enlace crea el token, no envía correo real y responde de forma genérica", async ({ page }) => {
    await page.goto("/olvide-mi-contrasena");
    await page.locator('input[type="email"]').fill(accounts.resetRequest.email);
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText("Si el correo está registrado, recibirás un enlace de restablecimiento pronto.")).toBeVisible();

    const result = await readOnly(async (db) => {
      const u = await db.user.findUniqueOrThrow({ where: { email: accounts.resetRequest.email }, select: { id: true } });
      return {
        tokens: await db.passwordResetToken.count({ where: { userId: u.id, usedAt: null } }),
        sendFailed: await db.adminAuditLog.count({ where: { entityId: u.id, action: "EMAIL_SEND_FAILED" } }),
        sent: await db.adminAuditLog.count({ where: { entityId: u.id, action: "PASSWORD_RESET_REQUESTED" } }),
      };
    });
    expect(result.tokens).toBe(1);
    // El entorno E2E no tiene proveedor de correo: el envío se registra como fallido y nunca como enviado.
    expect(result.sendFailed).toBe(1);
    expect(result.sent).toBe(0);
  });

  test("un correo inexistente recibe la misma respuesta y no crea tokens", async ({ page }) => {
    await page.goto("/olvide-mi-contrasena");
    await page.locator('input[type="email"]').fill("nadie@smartnfc.test");
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText("Si el correo está registrado, recibirás un enlace de restablecimiento pronto.")).toBeVisible();
    // Otras pruebas pueden crear tokens en paralelo para SUS cuentas; aquí se verifica que ninguno es de este correo.
    const forUnknown = await readOnly((db) => db.passwordResetToken.count({ where: { user: { email: "nadie@smartnfc.test" } } }));
    expect(forUnknown).toBe(0);
  });
});

// BUG-E2E-1 (detectado 27-oct-2026 por esta batería): tras activar o restablecer, el formulario navega con
// router.push("/login?activated=true" | "?reset=true"), pero app/login/page.tsx lee window.location.search
// dentro de useState ANTES de que Next.js actualice la URL, así que el mensaje de éxito no aparece.
// Con carga directa de la URL el mensaje se ve, pero React lanza el error de hidratación #418 (el servidor
// renderiza sin mensaje y el navegador con mensaje). Misma causa. test.fail(): estas pruebas pasan mientras
// el error exista y fallarán cuando se corrija, como aviso para quitar la marca.
const ACTIVATED_MSG = "¡Cuenta activada con éxito! Ya puedes iniciar sesión.";
const RESET_MSG = "¡Contraseña restablecida con éxito! Ya puedes iniciar sesión.";

test.describe("Mensajes de éxito en /login", () => {
  test("BUG-E2E-1: con carga directa de la URL, /login muestra los mensajes sin errores de React", async ({ page }) => {
    test.fail(true, "BUG-E2E-1: error de hidratación React #418 al cargar /login?activated=true");
    await page.goto("/login?activated=true");
    await expect(page.getByText(ACTIVATED_MSG)).toBeVisible();
    await page.goto("/login?reset=true");
    await expect(page.getByText(RESET_MSG)).toBeVisible();
  });

  test.describe("BUG-E2E-1: no aparecen tras la redirección del formulario", () => {
    test.use({ allowMutations: true });

    test("activación → /login muestra el mensaje de éxito", async ({ page }) => {
      test.fail(true, "BUG-E2E-1: el mensaje de activación no aparece tras router.push");
      const password = strongPassword();
      await page.goto(`/activar-cuenta?token=${tokens.activationMessage}`);
      await page.locator("#new-password").fill(password);
      await page.locator("#confirm-password").fill(password);
      await page.getByRole("button", { name: "Activar mi Cuenta" }).click();
      await expect(page).toHaveURL(/\/login\?activated=true/, { timeout: 20_000 });
      await expect(page.getByText(ACTIVATED_MSG)).toBeVisible({ timeout: 5_000 });
    });

    test("restablecimiento → /login muestra el mensaje de éxito", async ({ page }) => {
      test.fail(true, "BUG-E2E-1: el mensaje de restablecimiento no aparece tras router.push");
      const password = strongPassword();
      await page.goto(`/restablecer-contrasena?token=${tokens.resetMessage}`);
      const fields = page.locator('input[type="password"]');
      await fields.nth(0).fill(password);
      await fields.nth(1).fill(password);
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL(/\/login\?reset=true/, { timeout: 20_000 });
      await expect(page.getByText(RESET_MSG)).toBeVisible({ timeout: 5_000 });
    });
  });
});
