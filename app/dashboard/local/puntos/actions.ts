"use server";
import { ZodError } from "zod";
import { revalidatePath } from "next/cache";
import { saveLocalPoint } from "../../../../lib/local/point-management";
export type PointFormState = { error?: string; success?: string; pointId?: string };
export async function savePointAction(_state: PointFormState, form: FormData): Promise<PointFormState> {
  try {
    const smartLinks = Array.from({ length: 6 }, (_, index) => ({
      label: String(form.get(`label${index}`) || ""), url: String(form.get(`url${index}`) || "")
    })).filter(link => link.label || link.url);
    const pointId = await saveLocalPoint({
      name: String(form.get("name") || ""), location: String(form.get("location") || ""),
      objective: String(form.get("objective") || ""), medium: String(form.get("medium") || ""),
      isActive: form.get("isActive") === "on", destinationUrl: String(form.get("destinationUrl") || ""), smartLinks
    }, String(form.get("pointId") || "") || undefined, Number(form.get("version")), String(form.get("campaignId") || ""), String(form.get("campaignName") || ""));
    revalidatePath("/dashboard/local/puntos");
    revalidatePath("/dashboard/local/puntos/" + pointId);
    return { success: "Punto guardado. El código físico se conserva.", pointId };
  } catch (error) {
    return { error: error instanceof ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "No se pudo guardar el punto." };
  }
}
