// Acceso diferido a los datos del seed: Playwright recolecta los archivos de prueba antes del globalSetup.
import { loadSeedState, type SeedState } from "./seed";

export const seed = () => loadSeedState();

export function lazy<K extends keyof SeedState>(key: K): SeedState[K] {
  return new Proxy({} as SeedState[K] & object, {
    get: (_target, prop) => (loadSeedState()[key] as Record<string | symbol, unknown>)[prop],
  }) as SeedState[K];
}
