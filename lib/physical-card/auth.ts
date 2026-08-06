import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import { prisma } from "../prisma";

export async function requirePhysicalDesignUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autorizado.");
  const identity = session.user as { id?: string; companyId?: string; role?: string };
  if (!identity.id || !identity.companyId || !identity.role) throw new Error("Sesión inválida.");
  const user = await prisma.user.findFirst({
    where: { id: identity.id, companyId: identity.companyId, isActive: true, company: { isActive: true } },
    select: { id: true, companyId: true, role: true },
  });
  if (!user) throw new Error("No autorizado.");
  return user;
}

export function isCompanyAdmin(role: string) {
  return role === "SUPERADMIN" || role === "COMPANY_OWNER" || role === "COMPANY_ADMIN";
}

export async function requireScopedDesign(designId: string) {
  const user = await requirePhysicalDesignUser();
  const design = await prisma.physicalCardDesign.findFirst({
    where: { id: designId, companyId: user.companyId }, include: { card: { select: { userId: true, slug: true } } },
  });
  if (!design || (!isCompanyAdmin(user.role) && design.card.userId !== user.id)) throw new Error("Diseño no encontrado.");
  return { user, design };
}
