import { expect, type Page } from "@playwright/test";
import type { Account } from "./seed";

/** Inicia sesión por la pantalla real de /login. */
export async function login(page: Page, account: Pick<Account, "email" | "password">) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(account.email);
  await page.locator('input[type="password"]').fill(account.password);
  await page.getByRole("button", { name: "Entrar al Sistema" }).click();
}

export async function loginAndWaitForDashboard(page: Page, account: Pick<Account, "email" | "password">) {
  await login(page, account);
  await expect(page).toHaveURL(/\/dashboard(\/|\?|$)/, { timeout: 20_000 });
}

export const LOGIN_ERROR = "Credenciales incorrectas. Revisa tu correo y contraseña.";
