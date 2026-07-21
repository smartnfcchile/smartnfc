import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes("--apply");
  const isDryRun = !isApply || args.includes("--dry-run");

  const companyIdArg = args.find(a => a.startsWith("--company-id="))?.split("=")[1];
  const companySlugArg = args.find(a => a.startsWith("--company-slug="))?.split("=")[1];
  const countArg = parseInt(args.find(a => a.startsWith("--count="))?.split("=")[1] || "1", 10);
  const batchCodeArg = args.find(a => a.startsWith("--batch="))?.split("=")[1] || "CLI_IMPORT";

  console.log("==================================================");
  console.log("SMART NFC CHILE - IMPORTADOR DE TARJETAS FÍSICAS");
  console.log(`MODO: ${isDryRun ? "DRY-RUN (Simulación de solo lectura)" : "APPLY (Ejecución Real en Base de Datos)"}`);
  console.log("==================================================");

  if (!companyIdArg && !companySlugArg) {
    console.error("Error: Debe especificar --company-id=<id> o --company-slug=<slug>.");
    process.exit(1);
  }

  let company;
  if (companyIdArg) {
    company = await prisma.company.findUnique({ where: { id: companyIdArg } });
  } else if (companySlugArg) {
    company = await prisma.company.findUnique({ where: { slug: companySlugArg } });
  }

  if (!company) {
    console.error("Error: Empresa no encontrada en la base de datos.");
    process.exit(1);
  }

  console.log(`Empresa Destino: ${company.name} (ID: ${company.id.substring(0, 8)}...)`);
  console.log(`Cantidad a Crear: ${countArg}`);
  console.log(`Código de Lote: ${batchCodeArg}`);

  const crypto = await import("crypto");
  const tokensToCreate: string[] = [];

  for (let i = 0; i < countArg; i++) {
    tokensToCreate.push(crypto.randomBytes(8).toString("hex"));
  }

  console.log(`\nTokens autogenerados (${tokensToCreate.length}):`);
  tokensToCreate.forEach((t, idx) => console.log(` [${idx + 1}] Token: ${t} -> Target: /t/${t}`));

  if (isDryRun) {
    console.log("\n[DRY-RUN] Simulación exitosa. Ningún cambio fue aplicado a la base de datos.");
    console.log("Para aplicar realmente los cambios, ejecuta el comando añadiendo la bandera --apply:");
    console.log(`npx tsx scripts/maintenance/import-physical-nfc-cards.ts ${companyIdArg ? `--company-id=${companyIdArg}` : `--company-slug=${companySlugArg}`} --count=${countArg} --batch=${batchCodeArg} --apply`);
    return;
  }

  // Ejecución real transaccional
  await prisma.$transaction(async (tx) => {
    for (const token of tokensToCreate) {
      const card = await tx.physicalNfcCard.create({
        data: {
          token,
          companyId: company.id,
          status: "ENTREGADA",
          batchCode: batchCodeArg,
          deliveredAt: new Date()
        }
      });

      await tx.adminAuditLog.create({
        data: {
          actorUserId: "SYSTEM_CLI_MAINTENANCE",
          action: "PHYSICAL_CARD_CLI_IMPORT",
          entityType: "PHYSICAL_CARD",
          entityId: card.id,
          companyId: company.id,
          metadata: JSON.stringify({
            token,
            batchCode: batchCodeArg,
            companyId: company.id
          })
        }
      });
    }
  });

  console.log(`\n✅ ¡APPLY COMPLETADO! Se crearon ${tokensToCreate.length} tarjetas físicas en base de datos.`);
}

main()
  .catch(err => {
    console.error("Fallo durante la ejecución del script:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
