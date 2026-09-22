import { prisma } from "../../../../../lib/prisma";
import { requireLocalPage } from "../../../../../lib/local/access";
import PointForm from "../../../../../components/local/PointForm";
export default async function NewPointPage() {
  const { company } = await requireLocalPage("LOCAL_TOUCHPOINTS");

  const campaigns = await prisma.localCampaign.findMany({ where: { companyId: company.id, status: { not: "ARCHIVED" } }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const locations = await prisma.localLocation.findMany({ where: { companyId: company.id, isActive: true }, select: { id: true, name: true } });
  return <div className="space-y-6"><h1 className="text-3xl font-bold">Crear Punto Inteligente</h1>
    <PointForm campaigns={campaigns} locations={locations}/>
  </div>;
}
