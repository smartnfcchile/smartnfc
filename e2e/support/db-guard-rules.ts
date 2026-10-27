// Reglas puras de la protección de base E2E (sin Prisma ni red: se prueban en scripts/tests).
import { checkE2EDatabaseUrl, E2E_DATABASE_NAME_MARKER } from "./env-guard";

export const E2E_EMAIL_DOMAIN = "smartnfc.test";
export const E2E_SLUG_PREFIX = "e2e-";

export class E2EDatabaseRefused extends Error {
  constructor(reason: string) {
    super(`[e2e-db-guard] Base rechazada: ${reason}. No se ejecutó ninguna escritura.`);
  }
}

/** Barrera 1. Devuelve la URL validada o lanza. Nunca imprime la URL. */
export function requireE2EDatabaseUrl(env: Record<string, string | undefined> = process.env): string {
  const raw = env.E2E_DATABASE_URL;
  const check = checkE2EDatabaseUrl(raw);
  if (!check.ok) throw new E2EDatabaseRefused(check.reason);
  return raw!;
}

export type DatabaseIdentity = { database: string; neonSettings: number };
export type DatabaseContent = { foreignCompanies: number; foreignUsers: number };

/** Barreras 2 y 3, en forma pura (testeable sin base). */
export function evaluateDatabase(identity: DatabaseIdentity, content: DatabaseContent): string[] {
  const problems: string[] = [];
  if (!identity.database.includes(E2E_DATABASE_NAME_MARKER)) problems.push(`la base conectada ('${identity.database}') no incluye '${E2E_DATABASE_NAME_MARKER}'`);
  if (identity.neonSettings > 0) problems.push("el servidor expone parámetros neon.* (no es un PostgreSQL desechable)");
  if (content.foreignCompanies > 0) problems.push(`hay ${content.foreignCompanies} empresa(s) que no son de prueba (slug sin '${E2E_SLUG_PREFIX}')`);
  if (content.foreignUsers > 0) problems.push(`hay ${content.foreignUsers} usuario(s) que no son de prueba (correo fuera de @${E2E_EMAIL_DOMAIN})`);
  return problems;
}

