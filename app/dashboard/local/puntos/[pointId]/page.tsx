import { notFound } from "next/navigation";
import { prisma } from "../../../../../lib/prisma";
import { requireLocalPage } from "../../../../../lib/local/access";
import { smartLinksSchema } from "../../../../../lib/local/point-config";
import { campaignPublicBrand } from "../../../../../lib/local/brand";
import { readStoredActions } from "../../../../../lib/local/public-actions";
import PointForm from "../../../../../components/local/PointForm";
export default async function EditPointPage({ params }: { params: Promise<{ pointId: string }> }) {
  const { company } = await requireLocalPage("LOCAL_TOUCHPOINTS");

  const point = await prisma.localTouchpoint.findFirst({ where: { id: (await params).pointId, campaign: { companyId: company.id, status: { not: "ARCHIVED" } } }, include: { campaign: { include: { localLocation: true } } } });
  if (!point) notFound();
  return <div className="space-y-6"><h1 className="text-3xl font-bold">Editar Punto Inteligente</h1>
    <PointForm key={point.id} campaigns={[{ id: point.campaign.id, name: point.campaign.name }]}
      brandByCampaign={{ [point.campaign.id]: campaignPublicBrand(point.campaign, company.name) }}
      point={{ id: point.id, name: point.name, location: point.location || "", objective: point.objective,
      medium: point.medium, isActive: point.isActive, campaignId: point.campaignId, configurationVersion: point.configurationVersion,
      destinationUrl: point.destinationUrl || "", smartLinks: smartLinksSchema.parse(point.smartLinks), presentationMode: point.presentationMode, actions: readStoredActions(point.actions) }}/>
  </div>;
}
