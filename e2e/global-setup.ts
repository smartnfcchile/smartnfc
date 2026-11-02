// Se ejecuta una vez antes de las pruebas: valida la base desechable y carga los datos ficticios.
import { disconnectE2EDatabase } from "./support/db-guard";
import { seedE2E } from "./support/seed";

export default async function globalSetup() {
  try {
    const state = await seedE2E();
    console.log(`[e2e-seed] Datos ficticios listos (${Object.keys(state.accounts).length} cuentas @smartnfc.test).`);
  } finally {
    await disconnectE2EDatabase();
  }
}
