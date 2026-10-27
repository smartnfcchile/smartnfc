"use server";
import { revalidatePath } from "next/cache";
import { saveLocation } from "../../../../lib/local/locations";
import { runAction, type ActionResult } from "../../../../lib/action-errors";

// BUG-E2E-3: devuelve { ok, error } en vez de lanzar (en producción React oculta el mensaje de un error lanzado).
// Errores de negocio (p. ej. «Límite de locales alcanzado.») → su mensaje; errores internos → genérico + registro.
export type LocationFormState = ActionResult<{ locationId: string }> | null;
export async function saveLocationAction(_state: LocationFormState, form: FormData): Promise<LocationFormState> {
  return runAction("local.saveLocation", async () => {
    const locationId = await saveLocation({ id: String(form.get("id") || "") || undefined, name: String(form.get("name") || ""), address: String(form.get("address") || "") });
    revalidatePath("/dashboard/local/locales");
    return { locationId };
  });
}

export async function moveCampaignLocationAction(form: FormData) {
  const { moveCampaignLocation } = await import("../../../../lib/local/locations");
  await moveCampaignLocation(String(form.get("campaignId") || ""), String(form.get("locationId") || ""));
  revalidatePath("/dashboard/local/locales");
}

export type LocationIdentityResult = { ok: true; brandUpdatedAt: string | null } | { ok: false; error: string; fieldErrors?: Record<string, string> };
export async function saveLocationIdentityAction(locationId: string, input: unknown, expectedBrandUpdatedAt: string | null): Promise<LocationIdentityResult> {
  const { ZodError } = await import("zod");
  const { saveLocationIdentity } = await import("../../../../lib/local/location-brand");
  try {
    const result = await saveLocationIdentity(locationId, input, expectedBrandUpdatedAt);
    revalidatePath("/dashboard/local/locales");
    revalidatePath("/dashboard/local/locales/" + locationId);
    return { ok: true, brandUpdatedAt: result.brandUpdatedAt };
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of error.issues) { const key = String(issue.path[0] ?? "form"); fieldErrors[key] ??= issue.message; }
      return { ok: false, error: "Revisa los campos marcados.", fieldErrors };
    }
    // Solo se muestran mensajes propios (Error simple); errores de Prisma u otros quedan genéricos.
    const own = error instanceof Error && error.constructor === Error;
    return { ok: false, error: own ? (error as Error).message : "No se pudo guardar la identidad. Inténtalo nuevamente." };
  }
}
