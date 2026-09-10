import { prisma } from "../../../../../lib/prisma";
import { requireLocalAdmin } from "../../../../../lib/local/access";
import PointForm from "../../../../../components/local/PointForm";
export default async function NewPointPage() {
  const { company } = await requireLocalAdmin();
  const campaigns = await prisma.localCampaign.findMany({ where: { companyId: company.id, status: { not: "ARCHIVED" } }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return <div className="space-y-6"><h1 className="text-3xl font-bold">Crear Punto Inteligente</h1>
    <PointForm campaigns={campaigns}/>
  </div>;
}
