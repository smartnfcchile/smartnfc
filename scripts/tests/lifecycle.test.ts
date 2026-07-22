const path = require("path");

// 1. Mock de next-auth
const mockSession = {
  user: {
    id: "user_admin_lifecycle",
    email: "admin@lifecycle.cl",
    role: "COMPANY_ADMIN",
    companyId: "comp_lifecycle"
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

// 2. Importar dependencias dinámicas
const { PrismaClient } = require("@prisma/client");
const {
  subscribeToCampaignAction,
  createBroadcastExportBatchAction,
  confirmBroadcastExportBatchAction,
  registerSubscriberOptOutAction,
  confirmBroadcastRemovalAction,
  blockSubscriberAction
} = require("../../app/dashboard/local/actions");

const TEMP_DB_URL = "postgresql://postgres:postgres@localhost:5433/postgres?sslmode=disable";

async function runLifecycleTest() {
  console.log("=========================================================================");
  console.log("TEST: INTEGRACIÓN DE CICLO DE VIDA COMPLETO DE SUSCRIPCIÓN");
  console.log("=========================================================================");

  const tempPrisma = new PrismaClient({
    datasources: {
      db: { url: TEMP_DB_URL }
    }
  });

  process.env.DATABASE_URL = TEMP_DB_URL;

  try {
    // 1. Limpieza de datos en base temporal
    await tempPrisma.localEvent.deleteMany();
    await tempPrisma.localBroadcastRemoval.deleteMany();
    await tempPrisma.localBroadcastExportItem.deleteMany();
    await tempPrisma.localBroadcastExportBatch.deleteMany();
    await tempPrisma.localConsentRecord.deleteMany();
    await tempPrisma.localSubscriber.deleteMany();
    await tempPrisma.user.deleteMany();
    await tempPrisma.companyProductLicense.deleteMany();
    await tempPrisma.localCampaign.deleteMany();
    await tempPrisma.company.deleteMany();

    // 2. Setup inicial
    await tempPrisma.company.create({
      data: {
        id: "comp_lifecycle",
        name: "Empresa Lifecycle",
        slug: "empresa-lifecycle",
        maxIdentities: 10,
        licenseStatus: "ACTIVE",
        updatedAt: new Date()
      }
    });

    await tempPrisma.companyProductLicense.create({
      data: {
        companyId: "comp_lifecycle",
        product: "LOCAL",
        planCode: "LOCAL_IMPULSA",
        status: "ACTIVE"
      }
    });

    await tempPrisma.user.create({
      data: {
        id: "user_admin_lifecycle",
        name: "Admin Lifecycle",
        email: "admin@lifecycle.cl",
        role: "COMPANY_ADMIN",
        companyId: "comp_lifecycle",
        isActive: true,
        status: "ACTIVE",
        updatedAt: new Date()
      }
    });

    const campaign = await tempPrisma.localCampaign.create({
      data: {
        id: "camp_lifecycle_1",
        companyId: "comp_lifecycle",
        name: "Campaña Lifecycle",
        slug: "camp-lifecycle-1",
        status: "PUBLISHED",
        consentVersion: 1,
        consentText: "Consentimiento Aceptado",
        whatsappNumber: "+56912345678",
        whatsappMessage: "Hola {nombre}",
        updatedAt: new Date()
      }
    });

    console.log("- Setup completado. Campaña creada.");

    // ---- PASO 1: Registro Inicial ----
    console.log("\n[Paso 1] Registrando suscriptor por primera vez...");
    const subPayload = {
      name: "Juan Perez",
      whatsapp: "987654321",
      consentAccepted: true
    };
    const regResult = await subscribeToCampaignAction("camp-lifecycle-1", subPayload);
    console.log("- Registro result:", JSON.stringify(regResult));

    const sub = await tempPrisma.localSubscriber.findFirst({
      where: { campaignId: "camp_lifecycle_1", whatsapp: "+56987654321" },
      include: { consentRecords: true }
    });

    if (sub && sub.status === "ACTIVE" && sub.lastSubscribedAt) {
      console.log(">>> [PASA] Suscriptor ACTIVE y lastSubscribedAt registrado:", sub.lastSubscribedAt);
      if (sub.consentRecords.length === 1) {
        console.log(">>> [PASA] LocalConsentRecord creado correctamente.");
      } else {
        throw new Error(`[FALLA] Cantidad incorrecta de consentimientos: ${sub.consentRecords.length}`);
      }
    } else {
      throw new Error("[FALLA] Suscriptor no registrado correctamente o estado incorrecto.");
    }

    // ---- PASO 2: Creación de Lote ----
    console.log("\n[Paso 2] Creando lote de exportación...");
    const batchResult = await createBroadcastExportBatchAction("camp_lifecycle_1");
    console.log("- Lote result:", JSON.stringify(batchResult));

    if (batchResult.success && batchResult.batchId) {
      console.log(">>> [PASA] Lote creado con id:", batchResult.batchId);
    } else {
      throw new Error(`[FALLA] No se pudo crear el lote: ${JSON.stringify(batchResult)}`);
    }

    // ---- PASO 3: Confirmación de Lote ----
    console.log("\n[Paso 3] Confirmando lote...");
    const confirmResult = await confirmBroadcastExportBatchAction(batchResult.batchId);
    console.log("- Confirm result:", JSON.stringify(confirmResult));

    const confirmedBatch = await tempPrisma.localBroadcastExportBatch.findUnique({
      where: { id: batchResult.batchId }
    });

    if (confirmedBatch && confirmedBatch.status === "CONFIRMED") {
      console.log(">>> [PASA] Estado de lote confirmado en la base de datos.");
    } else {
      throw new Error("[FALLA] El lote no cambió a estado CONFIRMED.");
    }

    // ---- PASO 4: Solicitud de Baja (Opt-Out) ----
    console.log("\n[Paso 4] Registrando solicitud de baja voluntaria...");
    const optOutResult = await registerSubscriberOptOutAction(sub.id);
    console.log("- Opt-out result:", JSON.stringify(optOutResult));

    const optedOutSub = await tempPrisma.localSubscriber.findUnique({
      where: { id: sub.id }
    });

    const removal = await tempPrisma.localBroadcastRemoval.findFirst({
      where: { subscriberId: sub.id }
    });

    if (optedOutSub && optedOutSub.status === "OPTED_OUT") {
      console.log(">>> [PASA] Suscriptor cambiado a estado OPTED_OUT.");
    } else {
      throw new Error("[FALLA] El suscriptor no cambió a estado OPTED_OUT.");
    }

    if (removal && removal.completedAt === null && removal.reason === "OPTED_OUT") {
      console.log(">>> [PASA] LocalBroadcastRemoval registrado como pendiente (completedAt = null).");
    } else {
      throw new Error("[FALLA] LocalBroadcastRemoval no registrado o completado prematuramente.");
    }

    // ---- PASO 5: Confirmación de Retiro Físico ----
    console.log("\n[Paso 5] Confirmando remoción física de la lista...");
    const confirmRemovalResult = await confirmBroadcastRemovalAction(removal.id);
    console.log("- Confirm removal result:", JSON.stringify(confirmRemovalResult));

    const completedRemoval = await tempPrisma.localBroadcastRemoval.findUnique({
      where: { id: removal.id }
    });

    if (completedRemoval && completedRemoval.completedAt !== null && completedRemoval.completedByUserId === "user_admin_lifecycle") {
      console.log(">>> [PASA] Remoción física marcada como completada por el administrador.");
    } else {
      throw new Error("[FALLA] La remoción física no se completó correctamente.");
    }

    // ---- PASO 6: Reactivación ----
    console.log("\n[Paso 6] Reactivando el suscriptor (nueva suscripción)...");
    // Esperar 1 segundo para verificar cambio en lastSubscribedAt
    await new Promise(r => setTimeout(r, 1000));
    
    const reactPayload = {
      name: "Juan Perez Reactivado",
      whatsapp: "987654321",
      consentAccepted: true
    };
    const reactResult = await subscribeToCampaignAction("camp-lifecycle-1", reactPayload);
    console.log("- Reactivación result:", JSON.stringify(reactResult));

    const reactSub = await tempPrisma.localSubscriber.findUnique({
      where: { id: sub.id },
      include: { consentRecords: { orderBy: { acceptedAt: "desc" } } }
    });

    if (reactSub && reactSub.status === "ACTIVE") {
      console.log(">>> [PASA] Suscriptor reactivado exitosamente a ACTIVE.");
      
      const prevTime = new Date(sub.lastSubscribedAt).getTime();
      const newTime = new Date(reactSub.lastSubscribedAt).getTime();
      
      if (newTime > prevTime) {
        console.log(">>> [PASA] lastSubscribedAt se actualizó correctamente al momento de la reactivación.");
      } else {
        throw new Error("[FALLA] lastSubscribedAt no se actualizó.");
      }

      if (reactSub.consentRecords.length === 2) {
        console.log(">>> [PASA] Nuevo consentimiento registrado para la reactivación histórica.");
      } else {
        throw new Error(`[FALLA] Cantidad incorrecta de consentimientos tras reactivación: ${reactSub.consentRecords.length}`);
      }
    } else {
      throw new Error("[FALLA] Falló la reactivación del suscriptor.");
    }

    // ---- PASO 7: Bloqueo Administrativo ----
    console.log("\n[Paso 7] Bloqueando suscriptor de forma administrativa...");
    const blockResult = await blockSubscriberAction(sub.id);
    console.log("- Block result:", JSON.stringify(blockResult));

    const blockedSub = await tempPrisma.localSubscriber.findUnique({
      where: { id: sub.id }
    });

    if (blockedSub && blockedSub.status === "BLOCKED") {
      console.log(">>> [PASA] Suscriptor cambiado a estado BLOCKED.");
    } else {
      throw new Error("[FALLA] El suscriptor no cambió a estado BLOCKED.");
    }

    // ---- PASO 8: Intento de Reactivación de Bloqueado (Privacidad) ----
    console.log("\n[Paso 8] Intentando reactivar a un suscriptor bloqueado (debe retornar éxito neutral)...");
    const blockedPayload = {
      name: "Juan Perez Bloqueado",
      whatsapp: "987654321",
      consentAccepted: true
    };
    const blockedReactResult = await subscribeToCampaignAction("camp-lifecycle-1", blockedPayload);
    console.log("- Blocked react result:", JSON.stringify(blockedReactResult));

    if (blockedReactResult.success && blockedReactResult.whatsappLink) {
      console.log(">>> [PASA] Retorno neutral exitoso completado sin revelar el bloqueo.");
    } else {
      throw new Error("[FALLA] No se devolvió respuesta neutral exitosa.");
    }

    const afterSub = await tempPrisma.localSubscriber.findUnique({
      where: { id: sub.id }
    });

    if (afterSub && afterSub.status === "BLOCKED") {
      console.log(">>> [PASA] Confirmación final: El suscriptor permanece bloqueado en la base de datos.");
    } else {
      throw new Error(`[FALLA] El suscriptor cambió su estado tras la suscripción neutral: ${afterSub?.status}`);
    }

    console.log("\n=========================================================================");
    console.log(">>> ¡TODAS LAS PRUEBAS DE INTEGRACIÓN DEL CICLO DE VIDA PASARON CON ÉXITO! <<<");
    console.log("=========================================================================");

  } catch (err) {
    console.error("Error en test de ciclo de vida:", err);
    process.exit(1);
  } finally {
    await tempPrisma.$disconnect();
  }
}

runLifecycleTest().catch(console.error);
export {};
