"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "../../../../../lib/permissions";
import { approveCampaignDraft, assignCampaignTagSite, publishCampaignVersion, rollbackCampaignVersion, unpublishCampaignVersion } from "../../../../../lib/soluciones/campaign-landing";
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
      case "site": {
        const site = form.get("site");
        if (typeof id !== "string" || !id || typeof site !== "string") return { message: "Selecciona el punto y la sede.", error: true };
        await assignCampaignTagSite({ ...scope, tagId: id, siteId: site || null, expectedProjectRevision: revision });
        break;
      }
      default: return { message: "Operación desconocida.", error: true };
    }
  } catch {
    return { message: "No se pudo aplicar la operación. Recarga y revisa la versión, el estado del punto y que el vencimiento UTC sea futuro.", error: true };
  }
  revalidatePath(`/superadmin/soluciones/${scope.projectId}/publicacion`);
  return { message: "Operación registrada." };
}
