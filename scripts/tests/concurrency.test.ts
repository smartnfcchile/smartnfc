const path = require("path");
// 1. Mock de next-auth antes de realizar cualquier importación
const mockSession = {
  user: {
    id: "user_admin_concurrent",
    email: "admin@concurrent.cl",
    role: "COMPANY_ADMIN",
    companyId: "comp_concurrent"
  }
};

const nextAuthPath = require.resolve("next-auth");
const mockNextAuth = {
  getServerSession: async () => mockSession
};

require.cache[nextAuthPath] = {
  id: nextAuthPath,
  filename: nextAuthPath,
  loaded: true,
  exports: mockNextAuth
} as any;

try {
  const nextAuthDir = path.dirname(require.resolve("next-auth"));
  const nextAuthNextIndex = path.join(nextAuthDir, "next/index.js");
  require.cache[nextAuthNextIndex] = {
    id: nextAuthNextIndex,
    filename: nextAuthNextIndex,
    loaded: true,
    exports: mockNextAuth
  } as any;
} catch {}

// 2. Importar dependencias de forma dinámica para evitar hoisting de ESM
const { PrismaClient } = require("@prisma/client");
const { createBroadcastExportBatchAction } = require("../../app/dashboard/local/actions");

const TEMP_DB_URL = "postgresql://postgres:postgres@localhost:5433/postgres?sslmode=disable";

async function runConcurrencyTest() {
  console.log("=========================================================================");
  console.log("TEST: CONCURRENCIA REAL DE LOTES DE EXPORTACIÓN (ACTIVE_SCOPE_KEY)");
  console.log("=========================================================================");

  // Configurar cliente de Prisma apuntando a la base temporal
  const tempPrisma = new PrismaClient({
    datasources: {
      db: { url: TEMP_DB_URL }
    }
  });

  // Reemplazar la instancia global de prisma en el contexto del script para que las Server Actions utilicen la base temporal
  // Nota: Dado que Next.js Server Actions importan lib/prisma, podemos inyectar la base temporal cambiando la variable de entorno
  process.env.DATABASE_URL = TEMP_DB_URL;

  try {
    // 1. Limpiar base
    await tempPrisma.localBroadcastExportItem.deleteMany();
    await tempPrisma.localBroadcastExportBatch.deleteMany();
    await tempPrisma.localConsentRecord.deleteMany();
    await tempPrisma.localSubscriber.deleteMany();
    await tempPrisma.user.deleteMany();
    await tempPrisma.companyProductLicense.deleteMany();
    await tempPrisma.localCampaign.deleteMany();
    await tempPrisma.company.deleteMany();

    console.log("- Limpieza de datos en base temporal realizada.");

    // 2. Insertar registros iniciales requeridos para la simulación
    await tempPrisma.company.create({
      data: {
        id: "comp_concurrent",
        name: "Empresa Concurrente",
        slug: "empresa-concurrent",
        maxIdentities: 10,
        licenseStatus: "ACTIVE"
      }
    });

    await tempPrisma.companyProductLicense.create({
      data: {
        companyId: "comp_concurrent",
        product: "LOCAL",
        planCode: "LOCAL_IMPULSA",
        status: "ACTIVE"
      }
    });

    await tempPrisma.user.create({
      data: {
        id: "user_admin_concurrent",
        name: "Admin Concurrente",
        email: "admin@concurrent.cl",
        role: "COMPANY_ADMIN",
        companyId: "comp_concurrent",
        isActive: true,
        status: "ACTIVE"
      }
    });

    await tempPrisma.localCampaign.create({
      data: {
        id: "camp_concurrent_1",
        companyId: "comp_concurrent",
        name: "Campaña Concurrente 1",
        slug: "camp-concurrent-1",
        status: "PUBLISHED",
        consentVersion: 1,
        consentText: "Consentimiento de Prueba"
      }
    });

    // Crear 5 suscriptores activos con consentimientos
    for (let i = 1; i <= 5; i++) {
      await tempPrisma.localSubscriber.create({
        data: {
          id: `sub_c_${i}`,
          campaignId: "camp_concurrent_1",
          name: `Suscriptor Concurrente ${i}`,
          whatsapp: `+5699999000${i}`,
          status: "ACTIVE",
          consentRecords: {
            create: {
              campaignId: "camp_concurrent_1",
              consentVersion: 1,
              consentText: "Consentimiento de Prueba"
            }
          }
        }
      });
    }

    console.log("- Datos iniciales creados. 5 suscriptores pendientes de exportación.");



    // 3. Ejecutar dos creaciones concurrentes simultáneas utilizando Promise.all
    console.log("- Iniciando 2 solicitudes concurrentes paralelas para crear lote...");
    const [res1, res2] = await Promise.all([
      createBroadcastExportBatchAction("camp_concurrent_1"),
      createBroadcastExportBatchAction("camp_concurrent_1")
    ]);

    console.log("- Resultado Petición 1:", JSON.stringify(res1));
    console.log("- Resultado Petición 2:", JSON.stringify(res2));

    // Validaciones
    if (res1.success && res2.success) {
      if (res1.batchId === res2.batchId) {
        console.log(">>> [PASA] Ambas peticiones devolvieron el mismo batchId. Detección y retorno seguro del lote existente exitosa.");
      } else {
        throw new Error(`[FALLA] Se crearon dos lotes distintos: ${res1.batchId} y ${res2.batchId}`);
      }
    } else {
      throw new Error(`[FALLA] Una o ambas peticiones fallaron. Res1: ${JSON.stringify(res1)}, Res2: ${JSON.stringify(res2)}`);
    }

    // Verificar en la base de datos que exista exactamente UN solo lote con estado EXPORTED
    const batchCount = await tempPrisma.localBroadcastExportBatch.count({
      where: {
        companyId: "comp_concurrent",
        status: "EXPORTED"
      }
    });

    console.log("- Lotes EXPORTED activos en base de datos:", batchCount);
    if (batchCount === 1) {
      console.log(">>> [PASA] Garantía real de concurrencia verificada en base de datos: Existe exactamente 1 lote activo.");
    } else {
      throw new Error(`[FALLA] Cantidad incorrecta de lotes en base de datos: ${batchCount}`);
    }

  } catch (err) {
    console.error("Error en test de concurrencia:", err);
    process.exit(1);
  } finally {
    await tempPrisma.$disconnect();
  }
}

runConcurrencyTest().catch(console.error);
export {};
