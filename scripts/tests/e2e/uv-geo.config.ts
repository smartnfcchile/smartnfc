import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "uv-geo.spec.ts",
  outputDir: "../../../playwright-evidence",
  projects: [{ name: "chromium", use: { browserName: "chromium" } }, { name: "webkit", use: { browserName: "webkit" } }],
  use: { baseURL: "https://127.0.0.1:3338", ignoreHTTPSErrors: true },
  webServer: {
    command: "node scripts/tests/e2e/uv-geo-https.mjs",
    env: { NODE_ENV: "production" },
    ignoreHTTPSErrors: true,
    url: "https://127.0.0.1:3338/s/geo-fixture",
    timeout: 60000,
  },
});
