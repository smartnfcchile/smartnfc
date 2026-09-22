"use server";
import { revalidatePath } from "next/cache";
import { saveLocation } from "../../../../lib/local/locations";
export async function saveLocationAction(form: FormData) {
  await saveLocation({ id: String(form.get("id") || "") || undefined, name: String(form.get("name") || ""), address: String(form.get("address") || "") });
  revalidatePath("/dashboard/local/locales");
}

export async function moveCampaignLocationAction(form: FormData) {
  const { moveCampaignLocation } = await import("../../../../lib/local/locations");
  await moveCampaignLocation(String(form.get("campaignId") || ""), String(form.get("locationId") || ""));
  revalidatePath("/dashboard/local/locales");
}
