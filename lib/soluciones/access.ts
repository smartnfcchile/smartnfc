import { requireSuperAdmin } from "../permissions";
import { prisma } from "../prisma";

/**
 * Private V1 management is restricted to SmartNFC superadministration.
 * Customer access should be enabled only after SOLUCIONES entitlements
 * and tenant-level project role management have been implemented.
 */
export async function requireSolutionsOperator(companyId: string) {
  const actor = await requireSuperAdmin();
  const company = await prisma.company.findFirst({
    where: { id: companyId, isActive: true },
    select: { id: true, name: true }
  });
  if (!company) throw new Error("Organización no disponible");
  return { actor, company };
}
export async function listSolutionProjects(companyId: string) {
  await requireSolutionsOperator(companyId);
  return prisma.solutionProject.findMany({
    where: { companyId },
    select: {
      id: true, name: true, mode: true, status: true, createdAt: true,
      _count: { select: { records: true, tags: true, batches: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
}