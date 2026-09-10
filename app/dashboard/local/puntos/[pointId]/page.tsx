import { notFound } from "next/navigation";
import { prisma } from "../../../../../lib/prisma";
import { requireLocalAdmin } from "../../../../../lib/local/access";
import { smartLinksSchema } from "../../../../../lib/local/point-config";
import PointForm from "../../../../../components/local/PointForm";
export default async function EditPointPage({ params }: { params: Promise<{ pointId: string }> }) {
  const { company } = await requireLocalAdmin();
  const point = await prisma.localTouchpoint.findFirst({ where: { id: (await params).pointId, campaign: { companyId: company.id, status: { not: "ARCHIVED" } } }, include: { campaign: { select: { id: true, name: true } } } });
  if (!point) notFound();
  return <div className="space-y-6"><h1 className="text-3xl font-bold">Editar Punto Inteligente</h1>
    <PointForm key={point.id} campaigns={[point.campaign]} point={{ id: point.id, name: point.name, location: point.location || "", objective: point.objective,
      medium: point.medium, isActive: point.isActive, campaignId: point.campaignId, configurationVersion: point.configurationVersion,
      destinationUrl: point.destinationUrl || "", smartLinks: smartLinksSchema.parse(point.smartLinks) }}/>
  </div>;
}
