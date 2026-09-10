import { z } from "zod";

export const pointObjectives = ["GOOGLE_REVIEW", "WHATSAPP", "SOCIAL", "CLUB", "PROMOTION", "MENU", "SMART_LANDING"] as const;
export const objectiveLabels: Record<typeof pointObjectives[number], string> = {
  GOOGLE_REVIEW: "Reseñas de Google", WHATSAPP: "WhatsApp", SOCIAL: "Redes sociales",
  CLUB: "Club de clientes", PROMOTION: "Promoción", MENU: "Menú o catálogo", SMART_LANDING: "Página con varias acciones"
};
export const mediumLabels = { NFC: "NFC", QR: "QR", NFC_QR: "NFC + QR" };

// Browser destinations only. No URL is fetched on the server.
export function safeDestination(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password &&
      (!url.port || url.port === "443") && host.includes(".") &&
      !host.startsWith("[") && !/^[\d.]+$/.test(host) &&
      !/(^|\.)(localhost|local|internal|test)$/.test(host) && !/[\u0000-\u0020\\]/.test(value);
  } catch { return false; }
}
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
  smartLinks: smartLinksSchema.default([])
}).strict().superRefine((point, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: "custom", message });
  if (point.objective === "CLUB") return;
  if (point.objective === "SMART_LANDING") {
    if (!point.smartLinks.length) issue("Agrega al menos una acción a la página.");
    return;
  }
  if (!safeDestination(point.destinationUrl)) { issue("Usa una dirección HTTPS pública válida."); return; }
  const url = new URL(point.destinationUrl);
  const host = url.hostname.toLowerCase();
  if (point.objective === "WHATSAPP" && !(host === "wa.me" && /^\/[1-9]\d{7,14}$/.test(url.pathname))) {
    issue("Usa un enlace https://wa.me/ seguido del número con código de país, sin + ni espacios.");
  }
  const google = ["g.page", "maps.app.goo.gl", "google.com", "www.google.com", "search.google.com", "maps.google.com", "google.cl", "www.google.cl"];
  if (point.objective === "GOOGLE_REVIEW" && !google.includes(host)) issue("Usa el enlace de reseñas proporcionado por Google.");
  const social = ["instagram.com", "facebook.com", "tiktok.com", "linkedin.com", "youtube.com", "youtu.be", "x.com", "twitter.com", "threads.net", "threads.com"];
  if (point.objective === "SOCIAL" && !social.some(domain => host === domain || host === "www." + domain)) {
    issue("Usa un perfil de Instagram, Facebook, TikTok, LinkedIn, YouTube, X o Threads.");
  }
});
export type PointConfiguration = z.infer<typeof pointConfigurationSchema>;
