import { prisma } from "../../../../../lib/prisma";
import { requireLocalPage } from "../../../../../lib/local/access";
import { resolveLocalBrand } from "../../../../../lib/local/brand";
import { campaignPublicBrand } from "../../../../../lib/local/landing";
import PointForm from "../../../../../components/local/PointForm";
export default async function NewPointPage() {
  const { company } = await requireLocalPage("LOCAL_TOUCHPOINTS");

  const campaigns = await prisma.localCampaign.findMany({ where: { companyId: company.id, status: { not: "ARCHIVED" } }, include: { localLocation: true }, orderBy: { name: "asc" } });
  const locations = await prisma.localLocation.findMany({ where: { companyId: company.id, isActive: true } });
  return <div className="space-y-6"><h1 className="text-3xl font-bold">Crear Punto Inteligente</h1>
    <PointForm campaigns={campaigns.map(c => ({ id: c.id, name: c.name }))} locations={locations.map(l => ({ id: l.id, name: l.name }))}
      brandByCampaign={Object.fromEntries(campaigns.map(c => [c.id, campaignPublicBrand(c, company.name)]))}
      brandByLocation={Object.fromEntries(locations.map(l => [l.id, resolveLocalBrand({ location: l, company })]))}
      companyBrand={resolveLocalBrand({ company })}/>
  </div>;
}
