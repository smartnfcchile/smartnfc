// Configuración estructurada del objetivo de un Punto Inteligente (LocalTouchpoint.objectiveConfig).
// Módulo puro. El destino principal sigue en destinationUrl (DIRECT y versiones anteriores lo leen tal cual);
// aquí vive lo que el destino no expresa: el texto del botón principal y, en promociones, su contenido.
import { z } from "zod";

export const OBJECTIVE_CTA_MAX = 60;
export const objectiveConfigSchema = z.object({
  ctaLabel: z.string().trim().max(OBJECTIVE_CTA_MAX, `Texto del botón: máximo ${OBJECTIVE_CTA_MAX} caracteres.`).default(""),
}).strict();
export type ObjectiveConfig = z.output<typeof objectiveConfigSchema>;
export const EMPTY_OBJECTIVE_CONFIG: ObjectiveConfig = { ctaLabel: "" };

/** Lectura tolerante desde la base: si el contenido no valida se usa la configuración vacía (el punto sigue funcionando). */
export function readObjectiveConfig(value: unknown): ObjectiveConfig {
  const parsed = objectiveConfigSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : EMPTY_OBJECTIVE_CONFIG;
}
