import { validateCampaignContent } from "./campaign-content";
import { campaignDestination } from "./destination";
import { isPublicationExpired } from "./publication-expiry";

type Landing = {
  destination: "REDIRECT" | "LANDING";
  expiresAt: Date | null;
  publishedVersion: { content: unknown } | null;
};

export function campaignPublication(landing: Landing | null, now?: number) {
  if (landing?.destination !== "LANDING") return { state: "external" } as const;
  if (!landing.publishedVersion) return { state: "unpublished" } as const;
  if (isPublicationExpired(landing.expiresAt, now)) return { state: "expired" } as const;
  try {
    return { state: "published", content: validateCampaignContent(landing.publishedVersion.content) } as const;
  } catch {
    return { state: "invalid" } as const;
  }
}

export function campaignSettingsDestination(input: {
  landing: Landing | null; active: boolean; requested: string; previous: string | null;
}) {
  const { state } = campaignPublication(input.landing);
  if (state === "external") {
    if (!input.active && !input.requested) return null;
    try { return campaignDestination(input.requested); }
    catch { throw new Error("Ingresa una dirección web HTTPS válida para usar un sitio externo."); }
  }
  if (input.active && state !== "published") {
    throw new Error(state === "expired"
      ? "La landing venció. Restaura una versión con una nueva vigencia antes de activar."
      : "Publica una versión válida de la landing antes de activar el proyecto.");
  }
  return input.previous;
}
