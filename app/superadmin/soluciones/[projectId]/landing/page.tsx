import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../../../lib/prisma";
import { requireSuperAdmin } from "../../../../../lib/permissions";
import { validateCampaignContent } from "../../../../../lib/soluciones/campaign-content";
import LandingEditor from "./LandingEditor";

export default async function CampaignLandingPage({ params }: { params: Promise<{ projectId: string }> }) {
  await requireSuperAdmin();
  const { projectId } = await params;
  const project = await prisma.solutionProject.findFirst({
    where: { id: projectId, mode: "CAMPAIGN", company: { isActive: true } },
    select: {
      id: true, companyId: true, name: true,
      campaignLanding: { select: { draft: true, revision: true } },
      campaignSites: { select: { id: true, name: true }, orderBy: { name: "asc" } },
    },
  });
  if (!project) notFound();
  const initial = validateCampaignContent(project.campaignLanding?.draft ?? {
    schemaVersion: 1, design: { name: project.name, color: "#1d4ed8", font: "system", style: "clean" }, blocks: [], variants: [],
  });
  return <main className="space-y-5">
    <header className="space-y-2">
      <Link href={`/superadmin/soluciones/${projectId}`} className="text-sm font-medium text-blue-700 dark:text-blue-300">← {project.name}</Link>
      <Link href={`/superadmin/soluciones/${projectId}/publicacion`} className="block text-sm font-semibold text-blue-700 underline dark:text-blue-300">Publicación y puntos</Link>
      <h1 className="text-3xl font-bold tracking-tight">Landing de Campañas</h1>
    </header>
    <LandingEditor scope={{ projectId, companyId: project.companyId }} sites={project.campaignSites}
      initial={initial} initialRevision={project.campaignLanding?.revision ?? 0} />
  </main>;
}
