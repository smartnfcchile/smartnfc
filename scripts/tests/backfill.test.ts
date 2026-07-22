import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const TEMP_DB_URL = "postgresql://postgres:postgres@localhost:5433/postgres?sslmode=disable";

async function runBackfillTest() {
  console.log("=========================================================================");
  console.log("TEST: BACKFILL Y COMPROBACIÓN HISTÓRICA DE MIGRACIÓN (PRISMA DEPLOY)");
  console.log("=========================================================================");

  // 1. Limpiar base de datos temporal usando PrismaClient
  const prismaTemp = new PrismaClient({
    datasources: {
      db: { url: TEMP_DB_URL }
    }
  });

  await prismaTemp.$executeRawUnsafe("DROP SCHEMA IF EXISTS public CASCADE;");
  await prismaTemp.$executeRawUnsafe("CREATE SCHEMA public;");
  console.log("- Base temporal public reseteada.");

  // 2. Localizar y cargar en memoria la migración init_broadcast
  const migrationsDir = path.join(__dirname, "../../prisma/migrations");
  const folders = fs.readdirSync(migrationsDir);
  const broadcastFolder = folders.find(f => f.includes("init_broadcast"));

  if (!broadcastFolder) {
    throw new Error("No se encontró la carpeta de migración init_broadcast");
  }

  const broadcastPath = path.join(migrationsDir, broadcastFolder);
  const sqlPath = path.join(broadcastPath, "migration.sql");
  const sqlContent = fs.readFileSync(sqlPath, "utf-8");

  // 3. Eliminar temporalmente la carpeta init_broadcast
  fs.rmSync(broadcastPath, { recursive: true, force: true });
  console.log("- Carpeta init_broadcast eliminada temporalmente.");

  try {
    // 4. Aplicar las migraciones base (deploy)
    console.log("- Desplegando esquema baseline (sin init_broadcast)...");
    execSync("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: TEMP_DB_URL },
      stdio: "inherit"
    });

    // 5. Insertar un suscriptor histórico
    await prismaTemp.$executeRawUnsafe("INSERT INTO \"Company\" (id, name, slug, \"updatedAt\") VALUES ('comp_test', 'Company Test', 'comp-test', NOW()) ON CONFLICT DO NOTHING;");
    await prismaTemp.$executeRawUnsafe("INSERT INTO \"LocalCampaign\" (id, \"companyId\", name, slug, \"updatedAt\") VALUES ('camp_test', 'comp_test', 'Campaign Test', 'camp-test', NOW()) ON CONFLICT DO NOTHING;");
    
    const historicalDate = new Date("2026-01-15T12:00:00.000Z").toISOString();
    await prismaTemp.$executeRawUnsafe(
      `INSERT INTO "LocalSubscriber" (id, "campaignId", name, whatsapp, "firstSubscribedAt", "lastInteractionAt", "createdAt", "updatedAt") VALUES ('sub_hist', 'camp_test', 'Ariel Jara', '+56911112222', '${historicalDate}', '${historicalDate}', '${historicalDate}', '${historicalDate}')`
    );
    console.log("- Registro de suscriptor histórico insertado con firstSubscribedAt:", historicalDate);

    // 6. Recrear y escribir la migración init_broadcast
    fs.mkdirSync(broadcastPath, { recursive: true });
    fs.writeFileSync(sqlPath, sqlContent, "utf-8");
    console.log("- Carpeta init_broadcast restaurada.");

    // 7. Aplicar la migración init_broadcast (deploy)
    console.log("- Desplegando migración init_broadcast (aditiva con copy)...");
    execSync("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: TEMP_DB_URL },
      stdio: "inherit"
    });

    // 8. Consultar y verificar el suscriptor
    const res = await prismaTemp.$queryRawUnsafe<any[]>(
      "SELECT \"firstSubscribedAt\", \"lastSubscribedAt\" FROM \"LocalSubscriber\" WHERE id = 'sub_hist'"
    );
    const row = res[0];

    const first = new Date(row.firstSubscribedAt).getTime();
    const last = new Date(row.lastSubscribedAt).getTime();

    console.log("- firstSubscribedAt en base:", row.firstSubscribedAt);
    console.log("- lastSubscribedAt en base:", row.lastSubscribedAt);

    if (first === last) {
      console.log(">>> [PASA] lastSubscribedAt y firstSubscribedAt coinciden exactamente byte a byte!");
    } else {
      throw new Error(`[FALLA] Las fechas no coinciden. Diferencia: ${first - last}ms`);
    }

  } catch (err) {
    console.error("Error ejecutando test de backfill:", err);
    // Intentar restaurar en caso de error
    if (!fs.existsSync(broadcastPath)) {
      fs.mkdirSync(broadcastPath, { recursive: true });
      fs.writeFileSync(sqlPath, sqlContent, "utf-8");
    }
    process.exit(1);
  } finally {
    // Asegurar desconexión
    await prismaTemp.$disconnect();
  }
}

runBackfillTest().catch(console.error);
export {};
