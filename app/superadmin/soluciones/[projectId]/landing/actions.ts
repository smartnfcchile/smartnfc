"use server";

import { requireSuperAdmin } from "../../../../../lib/permissions";
import { CampaignDraftConflict, createCampaignSite, saveCampaignDraft } from "../../../../../lib/soluciones/campaign-landing";
import { validateCampaignContent } from "../../../../../lib/soluciones/campaign-content";

type Scope = { companyId: string; projectId: string };

export async function saveLanding(scope: Scope, revision: number, input: unknown) {
  await requireSuperAdmin();
  let content;
  try {
    content = validateCampaignContent(input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Borrador inválido.", conflict: false } as const;
  }
  try {
    const saved = await saveCampaignDraft({ ...scope, revision, content });
    return { revision: saved.revision } as const;
  } catch (error) {
    if (error instanceof CampaignDraftConflict) {
      return { error: "Otra sesión guardó una versión más reciente. Copia tus cambios antes de recargar.", conflict: true } as const;
    }
    return { error: "No se pudo guardar. Comprueba que las sedes pertenezcan a la campaña.", conflict: false } as const;
  }
}

export async function addLandingSite(scope: Scope, name: string) {
  await requireSuperAdmin();
  try {
    const site = await createCampaignSite({ ...scope, name });
    return { site: { id: site.id, name: site.name } } as const;
  } catch {
    return { error: "No se pudo crear la sede. Comprueba el nombre o si ya existe." } as const;
  }
}
