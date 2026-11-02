import { spawnSync } from "node:child_process";
const url = new URL(process.env.DATABASE_URL || "https://invalid.invalid");
if (process.env.VERCEL_ENV !== "preview" || process.env.VERCEL_GIT_COMMIT_REF !== "feat/point-georeferencing" ||
    url.pathname !== "/geolocation_preview" || !url.hostname.endsWith(".neon.tech")) {
  throw new Error("Refusing preview migration: expected isolated geolocation_preview database and preview branch.");
}
for (const args of [["node_modules/prisma/build/index.js", "migrate", "deploy"], ["node_modules/next/dist/bin/next", "build"]]) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
}
