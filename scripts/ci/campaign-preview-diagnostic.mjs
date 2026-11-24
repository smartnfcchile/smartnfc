const branch = "feature/campaign-landing-stage-1";
const db = "smartnfc_laboratorio";
const hosts = {
  DATABASE_URL: "ep-square-king-bflga6pu-pooler.c-5.us-west-2.aws.neon.tech",
  DIRECT_URL: "ep-square-king-bflga6pu.c-5.us-west-2.aws.neon.tech",
};

async function diagnose() {
  if (process.env.VERCEL_ENV !== "preview" || process.env.VERCEL_GIT_COMMIT_REF !== branch) {
    console.log("LAB_DIAGNOSTIC scope-rejected");
    return false;
  }
  const urls = Object.entries(hosts).map(([key, host]) => {
    const url = URL.parse(process.env[key] ?? "");
    const allowed = url && url.protocol === "postgresql:" && url.hostname === host &&
      (!url.port || url.port === "5432") && url.pathname === "/" + db &&
      url.username && url.password && !url.hash &&
      url.searchParams.getAll("sslmode").length === 1 && url.searchParams.get("sslmode") === "require" &&
      [...url.searchParams.keys()].every(p => p === "sslmode" || p === "channel_binding");
    if (!allowed) console.log(`LAB_DIAGNOSTIC ${key} destination-rejected`);
    return [key, allowed ? url : null];
  });
  if (urls.some(([, url]) => !url)) {
    for (const [key, url] of urls) if (url) console.log(`LAB_DIAGNOSTIC ${key} not-attempted`);
    return false;
  }
  const { PrismaClient } = await import("@prisma/client");
  let passed = true;
  for (const [key, url] of urls) {
    let client;
    try {
      url.searchParams.set("connect_timeout", "8");
      client = new PrismaClient({ datasourceUrl: url.href, log: [] });
      const verified = await client.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const [row] = await tx.$queryRaw`
          SELECT current_database() = 'smartnfc_laboratorio'
            AND current_setting('transaction_read_only') = 'on'
            AND EXISTS (SELECT 1 FROM "Company" WHERE id = 'preview-fixture-a')
            AND to_regclass('public."CampaignLanding"') IS NOT NULL AS verified
        `;
        return row?.verified === true;
      }, { maxWait: 11000, timeout: 12000 });
      console.log(`LAB_DIAGNOSTIC ${key} ${verified ? "authenticated-lab" : "identity-rejected"}`);
      passed &&= verified;
    } catch {
      passed = false;
      console.log(`LAB_DIAGNOSTIC ${key} connection-failed`);
    } finally {
      if (client) await client.$disconnect().catch(() => {});
    }
  }
  return passed;
}

try {
  const timer = setTimeout(() => {
    console.log("LAB_DIAGNOSTIC timeout");
    process.exit(18);
  }, 45000);
  const passed = await diagnose();
  clearTimeout(timer);
  console.log(passed ? "LAB_DIAGNOSTIC complete-intentional-stop" : "LAB_DIAGNOSTIC failed-stop");
  process.exit(passed ? 17 : 18);
} catch {
  console.log("LAB_DIAGNOSTIC initialization-failed");
  process.exit(18);
}
