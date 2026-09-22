// H-4: idempotent, read-mostly reconciliation for LocalCampaign rows left without a locationId by
// pre-Block-2 code creating a campaign during the window between applying the
// 20260917010000_commercial_catalog_entitlements migration and deploying the code that depends on it
// (see docs/BLOCK_2_DEPLOYMENT_RUNBOOK.md, scenario D).
//
// Scope is deliberately narrow and MUST stay that way:
//   - reads/writes ONLY LocalCampaign (locationId) and LocalLocation (the technical, per-company
//     "legacy-initial" / LEGACY_TECHNICAL row already used by the migration's own backfill);
//   - never touches Card, CardProfileRight, CompanyProductLicense, CompanyCapabilityOverride,
//     CompanyLimitOverride, Company.isActive, or PhysicalNfcCard;
//   - never assigns, infers or changes any INTERNAL/PILOT/PURCHASE profile right — that stays an
//     explicit, auditable Superadmin decision (assignCardProfileRightAction), always.
//
// The --apply branch runs the EXACT same two statements as the migration's own backfill
// (prisma/migrations/20260917010000_commercial_catalog_entitlements/migration.sql), just re-scoped
// to run again, safely, any number of times: ON CONFLICT DO NOTHING for the technical LocalLocation,
// and WHERE "locationId" IS NULL for the LocalCampaign update. Re-running after everything is already
// reconciled finds zero orphans and writes nothing.
//
// Dry-run is the default. Nothing is written unless --apply is passed explicitly.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function redactedTarget(): string {
  const raw = process.env.DATABASE_URL || "";
  try {
    const u = new URL(raw);
    return `${u.hostname}${u.port ? ":" + u.port : ""}${u.pathname}`;
  } catch {
    return "(DATABASE_URL no configurado o no es una URL válida)";
  }
}

type Orphan = { id: string; name: string; slug: string; companyId: string; company: { name: string } };

async function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes("--apply");

  console.log("==================================================");
  console.log("SMART NFC CHILE - RECONCILIACIÓN LocalCampaign SIN LOCAL (H-4)");
  console.log(`MODO: ${isApply ? "APPLY (escribe en la base de datos)" : "DRY-RUN (solo lectura, comportamiento por defecto)"}`);
  console.log(`Destino (DATABASE_URL, sin credenciales): ${redactedTarget()}`);
  console.log("Revisa el destino antes de continuar. Este script nunca debe apuntar a Neon/producción sin autorización explícita del despliegue real.");
  console.log("==================================================");

  // 1. Read-only diagnosis: every campaign left without a location, whichever company it belongs to.
  const orphans: Orphan[] = await prisma.localCampaign.findMany({
    where: { locationId: null },
    select: { id: true, name: true, slug: true, companyId: true, company: { select: { name: true } } },
    orderBy: [{ companyId: "asc" }, { createdAt: "asc" }],
  });

  if (orphans.length === 0) {
    console.log("\nNo se encontraron campañas huérfanas (locationId IS NULL). No hay nada que hacer.");
    return;
  }

  const byCompany = new Map<string, Orphan[]>();
  for (const o of orphans) {
    if (!byCompany.has(o.companyId)) byCompany.set(o.companyId, []);
    byCompany.get(o.companyId)!.push(o);
  }

  console.log(`\nCampañas huérfanas encontradas: ${orphans.length}`);
  console.log(`Empresas afectadas: ${byCompany.size}\n`);

  for (const [companyId, campaigns] of byCompany) {
    const existing = await prisma.localLocation.findUnique({
      where: { companyId_key: { companyId, key: "legacy-initial" } },
      select: { id: true },
    });
    console.log(`- ${campaigns[0].company.name} (${companyId})`);
    console.log(`  Local técnico legacy-initial: ${existing ? `ya existe, sería reutilizado (${existing.id})` : "no existe, sería creado (LEGACY_TECHNICAL)"}`);
    console.log(`  Campañas que recibirían ese local (${campaigns.length}):`);
    for (const c of campaigns) console.log(`    · ${c.name} (${c.slug}, ${c.id})`);
  }

  if (!isApply) {
    console.log(`\n[DRY-RUN] Ningún cambio fue escrito. ${orphans.length} campaña(s) en ${byCompany.size} empresa(s) serían actualizadas.`);
    console.log("Para aplicar, ejecuta con --apply (npm run sweep:local-location -- --apply).");
    return;
  }

  // 2. Apply: the exact same statements the migration's own backfill uses, scoped to what is still
  // NULL right now. Both are naturally idempotent (ON CONFLICT DO NOTHING / WHERE locationId IS NULL),
  // and running them together in one transaction keeps LocalLocation creation and the LocalCampaign
  // assignment atomic, matching how the migration itself applied them.
  const auditEntries = [...byCompany.entries()].map(([companyId, campaigns]) => ({ companyId, campaignIds: campaigns.map(c => c.id) }));

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO "LocalLocation" ("id", "companyId", "key", "origin", "createdAt", "updatedAt")
      SELECT 'legacy_location_' || "companyId", "companyId", 'legacy-initial', 'LEGACY_TECHNICAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM "LocalCampaign" WHERE "locationId" IS NULL GROUP BY "companyId"
      ON CONFLICT ("companyId", "key") DO NOTHING
    `;
    await tx.$executeRaw`
      UPDATE "LocalCampaign" c SET "locationId" = l."id"
      FROM "LocalLocation" l WHERE l."companyId" = c."companyId" AND l."key" = 'legacy-initial' AND c."locationId" IS NULL
    `;

    for (const entry of auditEntries) {
      const location = await tx.localLocation.findUniqueOrThrow({ where: { companyId_key: { companyId: entry.companyId, key: "legacy-initial" } } });
      await tx.adminAuditLog.create({
        data: {
          actorUserId: "SYSTEM_CLI_MAINTENANCE",
          action: "LOCAL_LOCATION_ORPHAN_RECONCILED",
          entityType: "LOCAL_LOCATION",
          entityId: location.id,
          companyId: entry.companyId,
          metadata: JSON.stringify({ campaignIds: entry.campaignIds, key: "legacy-initial", origin: "LEGACY_TECHNICAL" }),
        },
      });
    }
  });

  const remaining = await prisma.localCampaign.count({ where: { locationId: null } });
  console.log(`\n✅ APPLY COMPLETADO. ${orphans.length} campaña(s) en ${byCompany.size} empresa(s) quedaron reconciliadas.`);
  console.log(`Campañas huérfanas restantes: ${remaining} (debe ser 0).`);
}

main()
  .catch((err) => {
    console.error("Fallo durante la reconciliación:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
