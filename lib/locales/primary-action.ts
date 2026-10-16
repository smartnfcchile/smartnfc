// Acción principal SUGERIDA por ubicación (F3). Solo cambia qué acción se destaca en la vista previa:
// todos los puntos abren la misma página de acciones (decisión 16-10-2026). No crea destinos independientes.
import type { Objetivo, ProposalAction, Ubicacion } from "./proposal";

/** Orden de preferencia de objetivos por lugar: qué suele buscar un cliente en ese momento de la visita. */
export const PRIMARY_PREFERENCE: Record<Exclude<Ubicacion, "other">, readonly Objetivo[]> = {
  tables: ["menu", "promo", "reviews", "social", "whatsapp", "contact"],
  counter: ["reviews", "whatsapp", "promo", "social", "menu", "contact"],
  entrance: ["social", "promo", "menu", "contact", "reviews", "whatsapp"],
  waiting: ["reviews", "social", "whatsapp", "promo", "menu", "contact"],
};

/**
 * Índice (en `actions`) de la acción sugerida como principal para el lugar. Las acciones de contacto
 * (ubicación, teléfono) nunca son principales: se muestran en el bloque de contacto de la página.
 * "Otro lugar" respeta el orden en que la persona eligió sus objetivos. -1 si no hay una acción posible.
 */
export function suggestedPrimaryIndex(location: Ubicacion, actions: readonly ProposalAction[]): number {
  const firstNonContact = actions.findIndex(a => a.objective !== "contact");
  if (location === "other" || firstNonContact < 0) return firstNonContact;
  for (const objective of PRIMARY_PREFERENCE[location]) {
    if (objective === "contact") continue;
    const index = actions.findIndex(a => a.objective === objective);
    if (index >= 0) return index;
  }
  return firstNonContact;
}
