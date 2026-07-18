import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes("--apply");
  const isDryRun = args.includes("--dry-run") || !isApply;

  console.log("=== HERRAMIENTA ADMINISTRATIVA: CORRECCIÓN DE LICENCIA SARCÁRNICO ===");
  console.log(`Modo de ejecución: ${isApply ? "--apply (REAL)" : "--dry-run (SIMULACIÓN)"}`);

  // 1. Obtener la campaña local por slug
  const campaign = await prisma.localCampaign.findUnique({
    where: { slug: "sarcarnico" }
  });

  if (!campaign) {
    throw new Error("Campaña con slug 'sarcarnico' no encontrada en la base de datos.");
  }

  const companyId = campaign.companyId;
  const anonCompanyId = companyId.substring(0, 6) + "..." + companyId.substring(companyId.length - 4);
  console.log(`Campaña 'sarcarnico' resuelta. ID Empresa Asociada: ${anonCompanyId}`);

  // 2. Obtener la licencia Local de la empresa
  const license = await prisma.companyProductLicense.findUnique({
    where: {
      companyId_product: {
        companyId,
        product: "LOCAL"
      }
    }
  });

  if (!license) {
    throw new Error("No se encontró una licencia Local para la empresa asociada a la campaña.");
  }

  console.log("Licencia Local actual:");
  console.log(`  ID Licencia: ${license.id.substring(0, 10)}...`);
  console.log(`  Plan Actual: ${license.planCode}`);
  console.log(`  Estado Actual: ${license.status}`);
  console.log(`  Campañas Incluidas: ${license.includedCampaigns}`);
  console.log(`  Touchpoints Incluidos: ${license.includedTouchpoints}`);

  // 3. Comprobar si ya está en el estado correcto (Idempotencia)
  const alreadyCorrect =
    license.planCode === "LOCAL_PERSONALIZADO" &&
    license.status === "ACTIVE" &&
    license.includedCampaigns === 1 &&
    license.includedBranches === 1 &&
    license.includedTouchpoints === 3;

  if (alreadyCorrect) {
    console.log("La licencia ya se encuentra configurada correctamente (LOCAL_PERSONALIZADO, 1 campaña, 3 touchpoints). No se requieren cambios.");
    return;
  }

  if (isDryRun) {
    console.log("[DRY-RUN] Cambios a aplicar en base de datos:");
    console.log("  - Modificar planCode: LOCAL_FUNDADOR -> LOCAL_PERSONALIZADO");
    console.log("  - Establecer status: ACTIVE");
    console.log("  - Establecer includedCampaigns: 1");
    console.log("  - Establecer includedBranches: 1");
    console.log("  - Establecer includedTouchpoints: 3");
    console.log("  - Crear registro en AdminAuditLog para registrar el ajuste.");
    console.log("[DRY-RUN] Simulación completa. Ejecuta con --apply para confirmar los cambios.");
    return;
  }

  // 4. Ejecución en modo --apply mediante transacción
  console.log("Aplicando cambios en la base de datos...");
  
  // Buscar un usuario superadmin para la auditoría
  const superadmin = await prisma.user.findFirst({
    where: { role: "SUPERADMIN" }
  });
  const actorUserId = superadmin ? superadmin.id : "system";

  await prisma.$transaction(async (tx) => {
    // Actualizar licencia
    await tx.companyProductLicense.update({
      where: { id: license.id },
      data: {
        planCode: "LOCAL_PERSONALIZADO",
        status: "ACTIVE",
        includedCampaigns: 1,
        includedBranches: 1,
        includedTouchpoints: 3,
        notes: "Corrección administrativa: Reasignación de demo interna a plan Personalizado sin ocupar cupo de Cliente Fundador."
      }
    });

    // Registrar auditoría
    await tx.adminAuditLog.create({
      data: {
        actorUserId,
        action: "LICENSE_ADMIN_CORRECT",
        entityType: "COMPANY_PRODUCT_LICENSE",
        entityId: license.id,
        companyId,
        metadata: JSON.stringify({
          previousPlan: license.planCode,
          newPlan: "LOCAL_PERSONALIZADO",
          reason: "Corrección de demo Sarcárnico para no consumir cupo de Cliente Fundador comercial."
        })
      }
    });
  });

  console.log("✓ ÉXITO: La licencia ha sido corregida y registrada en la auditoría con éxito.");
}

main()
  .catch((err) => {
    console.error("❌ ERROR DURANTE LA EJECUCIÓN:", err.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
