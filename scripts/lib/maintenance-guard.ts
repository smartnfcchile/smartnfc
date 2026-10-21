// Importar como PRIMERA instrucción de cada script de mantenimiento, antes de @prisma/client:
//   import "../lib/maintenance-guard";
// Siempre muestra el destino (sin credenciales). Dry-run permitido en cualquier destino.
// --apply sobre un servidor remoto exige --confirm-host=<host exacto> y nunca se permite en CI.

import path from "node:path";
import { decideMaintenanceTarget, defaultDotenvFiles, resolveDatabaseUrls } from "./db-target";

const repoRoot = path.resolve(__dirname, "..", "..");
const resolved = resolveDatabaseUrls(process.env, defaultDotenvFiles(repoRoot, process.cwd()));
const decision = decideMaintenanceTarget(resolved, process.argv.slice(2), process.env);

if (!decision.allowed) {
  console.error(`[maintenance-guard] Ejecución rechazada: ${decision.reason}`);
  console.error("[maintenance-guard] No se realizó ninguna conexión ni cambio.");
  process.exit(1);
}

for (const [key, value] of Object.entries(resolved.values)) process.env[key] = value;
console.log(`[maintenance-guard] Destino: ${decision.summary}`);
