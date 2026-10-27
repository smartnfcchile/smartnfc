// Etapa 5 — NFC: vinculación por Superadmin, /t/[token], vínculos duplicados, desvinculación, persistencia,
// auditoría, permisos y privacidad del token. Datos ficticios (empresa e2e-nfc) en la base desechable.
// No se prueba hardware NFC real: solo la ruta /t/[token] que se graba en el chip.
import { test, expect } from "../support/fixtures";
import type { Page } from "@playwright/test";
import { loginAndWaitForDashboard } from "../support/auth";
import { readOnly } from "../support/db-guard";
import { lazy } from "../support/state";

const accounts = lazy("accounts");
const nfc = lazy("nfc");
const local = lazy("local");

type Card = { id: string; token: string; status: string; localTouchpointId: string | null; cardId: string | null; activatedAt: Date | null };
const cardByToken = (token: string) => readOnly((db) => db.physicalNfcCard.findUniqueOrThrow({
  where: { token }, select: { id: true, token: true, status: true, localTouchpointId: true, cardId: true, activatedAt: true },
})) as Promise<Card>;
const audits = (action: string, entityId: string) => readOnly((db) => db.adminAuditLog.findMany({
  where: { action, entityId }, select: { actorUserId: true, companyId: true, metadata: true },
})) as Promise<Array<{ actorUserId: string | null; companyId: string | null; metadata: string | null }>>;

async function openNfcAdmin(page: Page) {
  await page.goto(`/superadmin/locales/${nfc.companyId}`);
  await expect(page.locator("tr", { hasText: nfc.points.p1.name })).toBeVisible({ timeout: 20_000 });
}
const row = (page: Page, pointName: string) => page.locator("tr", { hasText: pointName });

/** Abre «Vincular NFC» en el punto y revisa el token. Devuelve el diálogo. */
async function reviewLink(page: Page, pointName: string, token: string) {
  await row(page, pointName).getByRole("button", { name: "Vincular NFC" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("https://…/t/token o token").fill(token);
  await dialog.getByRole("button", { name: "Revisar vinculación" }).click();
  return dialog;
}

async function openToken(page: Page, token: string) {
  const res = await page.request.get(`/t/${token}`, { maxRedirects: 0 });
  return { status: res.status(), location: res.headers()["location"] ?? "", body: await res.text() };
}

test.describe("NFC: vinculación por Superadmin (en serie)", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ allowMutations: true });

  test.beforeEach(async ({ page }) => {
    await loginAndWaitForDashboard(page, accounts.superadmin);
    await openNfcAdmin(page);
  });

  test("vincular un NFC entregado a un punto (con la URL grabada en el chip): se guarda y se audita sin el token completo", async ({ page }) => {
    const dialog = await reviewLink(page, nfc.points.p1.name, `https://www.smartnfc.cl/t/${nfc.tokens.entregada}`);
    await expect(dialog.getByText("NFC Ficticio E2E").first()).toBeVisible();
    await dialog.getByRole("button", { name: "Confirmar vinculación" }).click();
    await expect(page.getByRole("status").filter({ hasText: /vincul/i }).first()).toBeVisible({ timeout: 20_000 });

    const card = await cardByToken(nfc.tokens.entregada);
    expect(card.localTouchpointId).toBe(nfc.points.p1.id);
    const log = await audits("LOCAL_NFC_LINKED", card.id);
    expect(log).toHaveLength(1);
    expect(log[0].companyId).toBe(nfc.companyId);
    expect(log[0].metadata).toContain(nfc.points.p1.code);
    expect(log[0].metadata, "la auditoría guarda solo una pista del token").not.toContain(nfc.tokens.entregada);

    await page.reload();
    await expect(row(page, nfc.points.p1.name).getByRole("button", { name: "Desvincular NFC" })).toBeVisible();
  });

  test("/t/[token]: lleva al destino del punto, activa la tarjeta en el primer toque y registra la visita NFC", async ({ page }) => {
    const res = await openToken(page, nfc.tokens.entregada);
    expect([302, 303, 307, 308]).toContain(res.status);
    expect(res.location).toBe(nfc.points.p1.destination);
    const card = await cardByToken(nfc.tokens.entregada);
    expect(card.status).toBe("ACTIVA");
    expect(card.activatedAt).toBeTruthy();
    await expect.poll(() => readOnly((db) => db.localVisit.count({ where: { touchpointId: nfc.points.p1.id, source: "NFC" } }))).toBeGreaterThanOrEqual(1);
  });

  test("vínculos inválidos se rechazan con mensaje y no cambian nada", async ({ page }) => {
    const casos: Array<[string, string, RegExp]> = [
      [nfc.points.p1.name, nfc.tokens.activa, /ya tiene un NFC vinculado/],
      [nfc.points.p2.name, nfc.tokens.entregada, /ya está vinculado a otro Punto Inteligente/],
      [nfc.points.p2.name, nfc.tokens.ajena, /registrado para otra empresa/],
      [nfc.points.p2.name, nfc.tokens.identidad, /registrado para otra empresa|identidad digital/],
      [nfc.points.qrOnly.name, nfc.tokens.activa, /solo para QR/],
      [nfc.points.p2.name, "e2e-token-inexistente", /No existe un NFC registrado/],
    ];
    for (const [pointName, token, mensaje] of casos) {
      const dialog = await reviewLink(page, pointName, token);
      await expect(dialog.getByRole("alert"), `${pointName} ← ${token}`).toHaveText(mensaje);
      await dialog.getByRole("button", { name: "Cancelar" }).click();
    }
    expect((await cardByToken(nfc.tokens.activa)).localTouchpointId).toBeNull();
    expect((await cardByToken(nfc.tokens.ajena)).localTouchpointId).toBeNull();
    expect((await cardByToken(nfc.tokens.entregada)).localTouchpointId).toBe(nfc.points.p1.id);
    expect(await readOnly((db) => db.physicalNfcCard.count({ where: { localTouchpointId: nfc.points.p2.id } }))).toBe(0);
  });

  test("desvincular: la tarjeta queda libre en el inventario, se audita y el punto sigue funcionando por QR", async ({ page }) => {
    const before = await cardByToken(nfc.tokens.entregada);
    await row(page, nfc.points.p1.name).getByRole("button", { name: "Desvincular NFC" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Desvincular NFC" }).click();
    await expect(page.getByRole("status").filter({ hasText: /desvincul/i }).first()).toBeVisible({ timeout: 20_000 });

    const after = await cardByToken(nfc.tokens.entregada);
    expect(after.localTouchpointId).toBeNull();
    expect(after.status, "el estado de la tarjeta no cambia").toBe(before.status);
    expect(await audits("LOCAL_NFC_UNLINKED", after.id)).toHaveLength(1);
    expect(await readOnly((db) => db.localTouchpoint.count({ where: { id: nfc.points.p1.id, isActive: true } }))).toBe(1);

    const t = await openToken(page, nfc.tokens.entregada);
    expect(t.status).toBe(400);
    expect(t.location).toBe("");
    const p = await page.request.get(`/p/${nfc.points.p1.code}`, { maxRedirects: 0 });
    expect(p.headers()["location"]).toBe(nfc.points.p1.destination);
  });

  test("la tarjeta liberada se puede vincular a otro punto de la misma empresa", async ({ page }) => {
    const dialog = await reviewLink(page, nfc.points.p2.name, nfc.tokens.entregada);
    await dialog.getByRole("button", { name: "Confirmar vinculación" }).click();
    await expect(page.getByRole("status").filter({ hasText: /vincul/i }).first()).toBeVisible({ timeout: 20_000 });
    expect((await cardByToken(nfc.tokens.entregada)).localTouchpointId).toBe(nfc.points.p2.id);
    expect((await openToken(page, nfc.tokens.entregada)).location).toBe(nfc.points.p2.destination);
  });
});

test.describe("NFC: permisos y privacidad del token", () => {
  test("una dueña de Local no accede a la consola NFC de Superadmin", async ({ page }) => {
    await loginAndWaitForDashboard(page, accounts.localA);
    await page.goto(`/superadmin/locales/${nfc.companyId}`);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("button", { name: "Vincular NFC" })).toHaveCount(0);
    await expect(page.getByText(nfc.points.p1.name)).toHaveCount(0);
  });

  test.describe("respuestas públicas de /t/[token]", () => {
    // /t/[token] activa la tarjeta o registra visitas (escrituras del propio flujo público).
    test.use({ allowMutations: true });

    test("token inexistente: 404 genérico, sin datos", async ({ page }) => {
      const res = await openToken(page, "e2e-token-que-no-existe");
      expect(res.status).toBe(404);
      expect(res.body).toContain("Tarjeta No Encontrada");
      expect(res.body).not.toMatch(/e2e-|NFC Ficticio|wa\.me/);
    });

    test("tarjeta suspendida: 403 sin destino ni datos de la empresa", async ({ page }) => {
      const res = await openToken(page, nfc.tokens.suspendida);
      expect(res.status).toBe(403);
      expect(res.location).toBe("");
      expect(res.body).not.toMatch(/NFC Ficticio|Tienda NFC|wa\.me|e2e-nfc-p/);
    });

    test("un token no cruza empresas: una tarjeta ligada al punto de otra empresa no abre ese destino", async ({ page }) => {
      const res = await openToken(page, nfc.tokens.cruzada);
      expect(res.status).toBe(403);
      expect(res.location).toBe("");
      expect(res.body).not.toContain(local.b.destination);
      expect(res.body).not.toMatch(/Café B|Local B|wa\.me/);
      expect(await readOnly((db) => db.localVisit.count({ where: { touchpointId: local.b.pointId, source: "NFC" } }))).toBe(0);
    });

    test("tarjeta de identidad (Empresas): solo redirige al perfil público, sin datos internos", async ({ page }) => {
      const res = await openToken(page, nfc.tokens.identidad);
      expect(res.status).toBe(302);
      expect(new URL(res.location).pathname).toBe(`/c/${nfc.personaSlug}`);
      expect(res.location).not.toMatch(/token|company|card_|cuid/i);
    });

    test("tarjeta sin destino: 400 sin datos", async ({ page }) => {
      const res = await openToken(page, nfc.tokens.activa);
      expect(res.status).toBe(400);
      expect(res.body).toBe("Esta tarjeta física no tiene un destino asignado.");
    });
  });
});
