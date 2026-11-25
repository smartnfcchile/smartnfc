"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "../../../../../lib/permissions";
import { approveCampaignDraft, assignCampaignTagSite, publishCampaignVersion, rollbackCampaignVersion, transferCampaignTag, unpublishCampaignVersion } from "../../../../../lib/soluciones/campaign-landing";
import { publicationExpiry } from "../../../../../lib/soluciones/publication-expiry";

export async function operateCampaign(scope: { projectId: string; companyId: string }, _previous: { message: string; error?: boolean }, form: FormData) {
  await requireSuperAdmin();
  const action = form.get("operation");
  const revisionText = form.get("revision");
  if (typeof revisionText !== "string" || !/^\d{1,10}$/.test(revisionText)) return { message: "Recarga la campaña antes de continuar.", error: true };
  const revision = Number(revisionText);
  const id = form.get("target");
  if (form.get("confirmed") !== "yes") return { message: "Confirma la operación.", error: true };
  try {
    switch (action) {
      case "approve": await approveCampaignDraft({ ...scope, revision }); break;
      case "unpublish": await unpublishCampaignVersion({ ...scope, revision }); break;
      case "publish":
      case "restore": {
        if (typeof id !== "string" || !id) return { message: "Selecciona una versión.", error: true };
        const expiry = publicationExpiry(form.get("expiry"));
        const input = { ...scope, revision, versionId: id, expiresAt: expiry };
        await (action === "publish" ? publishCampaignVersion(input) : rollbackCampaignVersion(input));
        break;
      }
      case "transfer": {
        const point = form.get("point");
        const site = form.get("site");
        const match = typeof point === "string" && /^([a-zA-Z0-9_-]{1,128}):([a-zA-Z0-9_-]{1,128}):(\d{1,10})$/.exec(point);
        if (!match || typeof site !== "string") return { message: "Selecciona el punto y la sede.", error: true };
        const sourceId = await transferCampaignTag({
          ...scope, tagId: match[1], sourceId: match[2], sourceRevision: Number(match[3]), revision, siteId: site || null,
        });
        revalidatePath(`/superadmin/soluciones/${sourceId}`);
        revalidatePath(`/superadmin/soluciones/${sourceId}/publicacion`);
        revalidatePath(`/superadmin/soluciones/${scope.projectId}`);
        break;
      }
      case "site": {
        const site = form.get("site");
        if (typeof id !== "string" || !id || typeof site !== "string") return { message: "Selecciona el punto y la sede.", error: true };
        await assignCampaignTagSite({ ...scope, tagId: id, siteId: site || null, expectedProjectRevision: revision });
        break;
      }
      default: return { message: "Operación desconocida.", error: true };
    }
  } catch {
    return { message: "No se pudo aplicar la operación. Recarga y revisa el estado, la asignación y los datos ingresados.", error: true };
  }
  revalidatePath(`/superadmin/soluciones/${scope.projectId}/publicacion`);
  return { message: "Operación registrada." };
}
