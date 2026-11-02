// Protección de la base de datos E2E (Fase B). La usan el seed y las consultas de verificación de las pruebas.
//
// Tres barreras independientes; cualquier duda detiene todo:
//   1. URL (sin conectarse): solo PostgreSQL en loopback, nombre con "e2e_disposable", sin parámetros que
//      redirijan el host (checkE2EDatabaseUrl de env-guard.ts).
//   2. Identidad (ya conectado): current_database() con "e2e_disposable" y ningún parámetro "neon.*" en
//      pg_settings (Neon los expone; un PostgreSQL desechable no).
//   3. Contenido: la base debe estar vacía o contener SOLO datos E2E (empresas con slug "e2e-" y usuarios
//      @smartnfc.test). Si aparece un solo dato ajeno, se asume que no es una base desechable y se aborta.
//
// Las pruebas leen la base solo mediante readOnly(), que abre una transacción READ ONLY en PostgreSQL.

import { PrismaClient, type Prisma } from "@prisma/client";

export { E2E_EMAIL_DOMAIN, E2E_SLUG_PREFIX, E2EDatabaseRefused, requireE2EDatabaseUrl, evaluateDatabase } from "./db-guard-rules";
import { E2EDatabaseRefused, E2E_EMAIL_DOMAIN, E2E_SLUG_PREFIX, evaluateDatabase, requireE2EDatabaseUrl, type DatabaseContent } from "./db-guard-rules";

let client: PrismaClient | null = null;

/** Cliente conectado SOLO tras pasar las tres barreras. */
export async function connectE2EDatabase(): Promise<PrismaClient> {
  if (client) return client;
  const url = requireE2EDatabaseUrl();
  const prisma = new PrismaClient({ datasources: { db: { url } }, log: ["error"] });
  try {
    const [identity] = await prisma.$queryRaw<Array<{ database: string; neon_settings: bigint }>>`
      SELECT current_database() AS database,
             (SELECT count(*) FROM pg_settings WHERE name LIKE 'neon.%') AS neon_settings`;
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name IN ('Company', 'User')`;
    let content: DatabaseContent = { foreignCompanies: 0, foreignUsers: 0 };
    if (tables.length === 2) {
      const [row] = await prisma.$queryRaw<Array<{ companies: bigint; users: bigint }>>`
        SELECT (SELECT count(*) FROM "Company" WHERE slug IS NULL OR slug NOT LIKE ${E2E_SLUG_PREFIX + "%"}) AS companies,
               (SELECT count(*) FROM "User" WHERE email NOT LIKE ${"%@" + E2E_EMAIL_DOMAIN}) AS users`;
      content = { foreignCompanies: Number(row.companies), foreignUsers: Number(row.users) };
    } else {
      throw new E2EDatabaseRefused("faltan las tablas de SmartNFC; ejecuta primero npm run e2e:prepare");
    }
    const problems = evaluateDatabase({ database: identity.database, neonSettings: Number(identity.neon_settings) }, content);
    if (problems.length) throw new E2EDatabaseRefused(problems.join("; "));
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }
  client = prisma;
  return prisma;
}

/** Vacía todas las tablas de la aplicación (no el historial de migraciones). Solo tras connectE2EDatabase(). */
export async function truncateE2EDatabase(prisma: PrismaClient) {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'`;
  if (!tables.length) return;
  const list = tables.map((t: { tablename: string }) => `"${t.tablename.replace(/"/g, '""')}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

/** Consulta de verificación para las pruebas: PostgreSQL rechaza cualquier escritura dentro de esta transacción. */
export async function readOnly<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  const prisma = await connectE2EDatabase();
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    return fn(tx);
  });
}

export async function disconnectE2EDatabase() {
  if (client) await client.$disconnect();
  client = null;
}

/**
 * Ajuste de fixture para simular el paso del tiempo o una renovación (p. ej. que una licencia venza).
 * Solo actúa sobre empresas de prueba (slug "e2e-") y tras las mismas tres barreras del seed. No se usa para
 * verificar resultados: las pruebas siguen leyendo con readOnly().
 */
export async function fixtureSetProductLicense(companySlug: string, product: "LOCAL" | "EMPRESAS", data: { status: "ACTIVE" | "EXPIRED" | "SUSPENDED"; expiresAt: Date | null }) {
  if (!companySlug.startsWith(E2E_SLUG_PREFIX)) throw new E2EDatabaseRefused(`la empresa '${companySlug}' no es de prueba`);
  const prisma = await connectE2EDatabase();
  const company = await prisma.company.findUniqueOrThrow({ where: { slug: companySlug }, select: { id: true } });
  const updated = await prisma.companyProductLicense.updateMany({ where: { companyId: company.id, product }, data });
  if (updated.count !== 1) throw new Error(`[e2e] se esperaba exactamente una licencia ${product} en ${companySlug}`);
}
