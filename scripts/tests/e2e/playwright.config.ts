import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["campaign-editor.spec.ts", "campaign-public.spec.ts", "campaign-operations.spec.ts"],
  workers: 1,
  retries: 0,
  timeout: 120000,
  expect: { timeout: 12000 },
  outputDir: "../../../playwright-results",
  reporter: [["line"], ["html", { outputFolder: resolve("playwright-report"), open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    browserName: "chromium",
    actionTimeout: 12000,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1",
    cwd: process.cwd(),
    url: "http://127.0.0.1:3000/login",
    timeout: 60000,
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "ignore",
  },
});
