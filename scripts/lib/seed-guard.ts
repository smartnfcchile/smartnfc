// Importar como PRIMERA instrucción de cada seed o utilidad local, antes de @prisma/client:
//   import "../scripts/lib/seed-guard";
// Aborta el proceso si la base de datos no es PostgreSQL local. No hay forma de saltarlo.

import path from "node:path";
import { decideSeedTarget, defaultDotenvFiles, resolveDatabaseUrls } from "./db-target";

const repoRoot = path.resolve(__dirname, "..", "..");
const resolved = resolveDatabaseUrls(process.env, defaultDotenvFiles(repoRoot, process.cwd()));
const decision = decideSeedTarget(resolved);

if (!decision.allowed) {
  console.error(`[seed-guard] Ejecución rechazada: ${decision.reason}`);
  console.error("[seed-guard] Nunca Neon, nunca producción. No se realizó ninguna conexión.");
  process.exit(1);
}

// Fija en el proceso exactamente las URLs validadas, para que Prisma no lea otras desde .env.
for (const [key, value] of Object.entries(resolved.values)) process.env[key] = value;
console.log(`[seed-guard] Destino local verificado: ${decision.summary}`);
