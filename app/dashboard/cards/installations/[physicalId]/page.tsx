import { notFound, redirect } from "next/navigation";
import { requireCompanyAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import InstallationEditor from "@/components/geolocation/InstallationEditor";
export default async function PhysicalInstallationPage({ params }: { params: Promise<{ physicalId: string }> }) {
  const actor = await requireCompanyAdmin();
  const physical = await prisma.physicalNfcCard.findFirst({ where: { id: (await params).physicalId, companyId: actor.companyId }, select: { id: true, localTouchpointId: true } });
  if (!physical) notFound();
  if (physical.localTouchpointId) redirect(`/dashboard/local/puntos/${physical.localTouchpointId}`);
  return <div className="space-y-5"><h1 className="text-3xl font-bold">Instalación del soporte NFC</h1><InstallationEditor kind="physical" pointId={physical.id}/></div>;
}
