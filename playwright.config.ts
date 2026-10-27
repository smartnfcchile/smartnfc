import { defineConfig, devices } from "@playwright/test";
import { checkE2EAppUrl, E2E_DEFAULT_PORT } from "./e2e/support/env-guard";

// Configuración E2E de SmartNFC (Fases A y B). Ver docs/e2e.md.
// El servidor lo levanta SIEMPRE e2e/support/server.ts, que valida el entorno antes de arrancar.

const port = Number(process.env.E2E_PORT?.trim() || E2E_DEFAULT_PORT);
const baseURL = `http://127.0.0.1:${port}`;

const baseCheck = checkE2EAppUrl(baseURL, "baseURL");
if (!baseCheck.ok) throw new Error(`[e2e-guard] ${baseCheck.reason}`);

const serverMode = process.env.E2E_SERVER_MODE === "dev" ? "--dev" : "--start";
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  outputDir: "./test-results",
  // Valida la base desechable (db-guard.ts) y carga los datos ficticios antes de cualquier prueba.
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0,
  workers: isCI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ...(isCI ? [["github"] as const] : []),
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    serviceWorkers: "block",
    locale: "es-CL",
    timezoneId: "America/Santiago",
  },
  projects: [
    // Escritorio: navegación pública + pruebas funcionales (las que escriben en la base desechable).
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    // Mismo viewport que la QA manual del Bloque 2 (390×844).
    // Móvil: solo navegación pública, para no duplicar escrituras sobre las mismas cuentas ficticias.
    {
      name: "mobile-chromium",
      testMatch: "public/**/*.spec.ts",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
    },
  ],
  webServer: {
    command: `npx tsx e2e/support/server.ts ${serverMode}`,
    url: `${baseURL}/`,
    // Nunca reutilizar un servidor ya corriendo: podría ser un `next dev` conectado a producción.
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
