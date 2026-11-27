import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "uv-geo.spec.ts",
  outputDir: "../../../playwright-evidence",
  projects: [{ name: "chromium", use: { browserName: "chromium" } }, { name: "webkit", use: { browserName: "webkit" } }],
  use: { baseURL: "http://127.0.0.1:3338" },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3338",
    url: "http://127.0.0.1:3338/s/geo-fixture",
    timeout: 60000,
  },
});
