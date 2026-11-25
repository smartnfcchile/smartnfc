if (process.env.VERCEL_ENV === "preview" && ["feature/campaign-landing-stage-1", "feature/campaign-landing-editor-v1"].includes(process.env.VERCEL_GIT_COMMIT_REF ?? "")) {
  await import("./verify-campaign-preview.mjs");
}
import { PrismaClient } from "@prisma/client";

const previewBranch = "feature/soluciones-nfc-v1";
if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_GIT_COMMIT_REF === previewBranch) {
  const connections = {
    DATABASE_URL: "ep-square-king-bflga6pu-pooler.c-5.us-west-2.aws.neon.tech",
    DIRECT_URL: "ep-square-king-bflga6pu.c-5.us-west-2.aws.neon.tech",
  };

  for (const [key, hostname] of Object.entries(connections)) {
    const value = process.env[key];
    const url = URL.parse(value ?? "");
    if (!url || url.protocol !== "postgresql:" || url.hostname !== hostname ||
        url.pathname !== "/smartnfc_laboratorio" ||
        [...url.searchParams.keys()].some((param) => /^(host|hostaddr|service)$/i.test(param))) {
      throw new Error(`SmartNFC Preview: ${key} no apunta al laboratorio autorizado.`);
    }
    const client = new PrismaClient({ datasourceUrl: value });
    try {
      const [result] = await client.$queryRaw`
        SELECT current_database() = 'smartnfc_laboratorio'
          AND EXISTS (SELECT 1 FROM "Company" WHERE id = 'preview-fixture-a')
          AS verified
      `;
      if (!result?.verified) throw new Error("Laboratorio no identificado");
      console.log(`SmartNFC Preview: ${key} verificada en el laboratorio.`);
    } catch {
      throw new Error(`SmartNFC Preview: no se pudo comprobar ${key} en el laboratorio.`);
    } finally {
      await client.$disconnect();
    }
  }
}
