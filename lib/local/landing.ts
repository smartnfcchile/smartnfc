// Carga de la landing pública /l/[code]. SOLO LECTURA: nunca crea LocalVisit ni eventos.
// La visita se registra una sola vez en la entrada (/t, /q, /p); aquí solo se valida `v`
// para adjuntarlo a los enlaces de acción y así atribuir el clic a esa misma visita.
import { resolveLocalBrand, type ResolvedLocalBrand } from "./brand";
import { publicPoint } from "./point-resolver";
import { smartLinksSchema } from "./point-config";
import { findLocalVisit, visitIdValid } from "./tracking";
import { buildContactActions, buildPointActions, type PublicAction } from "./public-actions";

type CampaignBrandInput = {
  businessName: string | null; logoUrl: string | null; heroImageUrl: string | null; primaryColor: string; secondaryColor: string;
  address: string | null; localLocation: Parameters<typeof resolveLocalBrand>[0]["location"];
};
/** Identidad pública de los puntos de una campaña: Local → Campaña → Empresa (resolveLocalBrand). */
export function campaignPublicBrand(campaign: CampaignBrandInput, companyName: string): ResolvedLocalBrand {
  return resolveLocalBrand({
    location: campaign.localLocation,
    campaign: { businessName: campaign.businessName, logoUrl: campaign.logoUrl, heroImageUrl: campaign.heroImageUrl,
      primaryColor: campaign.primaryColor, secondaryColor: campaign.secondaryColor, address: campaign.address },
    company: { name: companyName },
  });
}

export type PointLanding =
  | { status: "ok"; brand: ResolvedLocalBrand; actions: PublicAction[]; visitAttributed: boolean }
  | { status: "inactive" }
  | { status: "direct" };

export async function loadPointLanding(code: string, rawVisitId?: string | null): Promise<PointLanding> {
  const point = await publicPoint(code);
  if (!point) return { status: "inactive" };
  if (point.objective === "CLUB" || point.presentationMode !== "LANDING") return { status: "direct" };

  let visitId: string | null = null;
  if (rawVisitId && visitIdValid(rawVisitId)) {
    const visit = await findLocalVisit(rawVisitId, point.campaignId);
    if (visit && visit.touchpointId === point.id) visitId = visit.id;
  }
  // Solo datos de presentación pública: identidad resuelta + acciones. Sin nombres internos
  // (point.name, point.location, campaign.name, location.name) ni datos de la empresa más allá del nombre.
  const brand = campaignPublicBrand(point.campaign, point.campaign.company.name);
  const actions = [
    ...buildPointActions({ code: point.code, objective: point.objective, destinationUrl: point.destinationUrl,
      smartLinks: smartLinksSchema.parse(point.smartLinks), configurationVersion: point.configurationVersion }, { interactive: true, visitId }),
    ...buildContactActions(brand, { interactive: true }),
  ];
  return { status: "ok", brand, actions, visitAttributed: !!visitId };
}
