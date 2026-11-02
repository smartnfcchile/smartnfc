import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "scripts/e2e", testMatch: "geolocation.spec.ts", workers: 1, timeout: 60000,
  use: { baseURL: "http://localhost:3000", screenshot: "only-on-failure" },
  projects: [{name:"desktop",use:{viewport:{width:1280,height:900}}},{name:"mobile",use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}] });
