import "server-only";
import { redirect } from "next/navigation";
import { hasCapability } from "../entitlements";
import { prisma } from "../prisma";
import { getCurrentUserContext } from "../permissions";

export async function requirePhysicalDesignUser() {
  const user = await getCurrentUserContext();
  // Diseños físicos forma parte del producto de perfiles (Empresas): misma regla que el menú y el inicio.
  if (user.role !== "SUPERADMIN" && !(await hasCapability(user.companyId, "PROFILE"))) throw new Error("No autorizado.");
  return user;
}

// Navegación de páginas: sin acceso se vuelve al inicio en lugar de mostrar una pantalla de error.
export async function requirePhysicalDesignPage() {
  const user = await requirePhysicalDesignUser().catch(() => null);
  if (!user) redirect("/dashboard");
  return user;
}

export function isCompanyAdmin(role: string) {
  return role === "SUPERADMIN" || role === "COMPANY_OWNER" || role === "COMPANY_ADMIN";
}

export async function requireScopedDesign(designId: string) {
  const user = await requirePhysicalDesignUser();
  const design = await prisma.physicalCardDesign.findFirst({
    where: { id: designId, ...(user.role === "SUPERADMIN" ? {} : { companyId: user.companyId }) }, include: { card: { select: { userId: true, slug: true } } },
  });
  if (!design || (!isCompanyAdmin(user.role) && design.card.userId !== user.id)) throw new Error("Diseño no encontrado.");
  return { user, design };
}
