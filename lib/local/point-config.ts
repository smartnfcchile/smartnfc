import { z } from "zod";
import { safeDestination } from "./safe-url";
import { SOCIAL_ACTION_TYPES, actionTypeFromUrl, normalizeActionValue, pointActionsSchema } from "./public-actions";
import { objectiveConfigSchema } from "./objective-config";

export const pointObjectives = ["GOOGLE_REVIEW", "WHATSAPP", "SOCIAL", "CLUB", "PROMOTION", "MENU", "SMART_LANDING"] as const;
export const objectiveLabels: Record<typeof pointObjectives[number], string> = {
  GOOGLE_REVIEW: "Reseñas de Google", WHATSAPP: "WhatsApp", SOCIAL: "Redes sociales",
  CLUB: "Club de clientes", PROMOTION: "Promoción", MENU: "Menú o catálogo", SMART_LANDING: "Página con varias acciones"
};
export const mediumLabels = { NFC: "NFC", QR: "QR", NFC_QR: "NFC + QR" };
export const pointPresentationModes = ["DIRECT", "LANDING"] as const;
export const presentationModeLabels: Record<typeof pointPresentationModes[number], string> = {
  DIRECT: "Abrir directamente", LANDING: "Mostrar página del local"
};

// Browser destinations only. No URL is fetched on the server (implementation in safe-url.ts, re-exported for existing imports).
export { safeDestination };
const destination = z.string().trim().max(2048).refine(safeDestination, "Usa una dirección HTTPS pública válida.");
const linkSchema = z.object({ label: z.string().trim().min(1).max(60), url: destination }).strict();
export const smartLinksSchema = z.array(linkSchema).max(6);
export const pointConfigurationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  location: z.string().trim().min(2).max(160),
  objective: z.enum(pointObjectives),
  medium: z.enum(["NFC", "QR", "NFC_QR"]),
  isActive: z.boolean(),
  destinationUrl: z.string().trim().max(2048).optional().default(""),
  smartLinks: smartLinksSchema.default([]),
  presentationMode: z.enum(pointPresentationModes).default("DIRECT"),
  // Action Builder: todas las acciones de SMART_LANDING, o las acciones adicionales de los demás objetivos.
  actions: pointActionsSchema.default([]),
  // Editores por objetivo: texto del botón principal (y contenido de promoción).
  objectiveConfig: objectiveConfigSchema.default({ ctaLabel: "" })
}).strict().superRefine((point, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: "custom", message });
  if (point.objective === "CLUB") {
    if (point.presentationMode !== "DIRECT") issue("El Club usa su propia página: el punto debe abrirse directamente.");
    return;
  }
  if (point.objective === "SMART_LANDING") {
    if (!point.smartLinks.length && !point.actions.some(a => a.enabled)) issue("Agrega al menos una acción activa a la página.");
    return;
  }
  if (!safeDestination(point.destinationUrl)) { issue("Usa una dirección HTTPS pública válida."); return; }
  const url = new URL(point.destinationUrl);
  const host = url.hostname.toLowerCase();
  if (point.objective === "WHATSAPP" && !(host === "wa.me" && /^\/[1-9]\d{7,14}$/.test(url.pathname))) {
    issue("Ingresa un número de WhatsApp válido con código de país, por ejemplo +56 9 1234 5678.");
  }
  // Mismas reglas que el registro de acciones (editor y servidor validan igual). Solo amplía lo aceptado antes.
  if (point.objective === "GOOGLE_REVIEW" && !normalizeActionValue("GOOGLE_REVIEW", point.destinationUrl).ok) issue("Usa el enlace de reseñas proporcionado por Google.");
  if (point.objective === "SOCIAL") {
    const type = actionTypeFromUrl(point.destinationUrl);
    if (!(SOCIAL_ACTION_TYPES as readonly string[]).includes(type)) issue("Usa un perfil de Instagram, Facebook, TikTok, LinkedIn, YouTube, X o Threads.");
  }
});
export type PointConfiguration = z.infer<typeof pointConfigurationSchema>;
export type PointConfigurationInput = z.input<typeof pointConfigurationSchema>;
