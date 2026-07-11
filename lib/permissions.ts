import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { UserRole } from "@prisma/client";

export async function getCurrentUserContext() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("No autorizado");
  }
  return session.user as {
    id: string;
    email: string;
    name?: string;
    role: UserRole;
    companyId: string;
  };
}

export async function requireCompanyAdmin() {
  const user = await getCurrentUserContext();
  const isAdmin =
    user.role === "SUPERADMIN" ||
    user.role === "COMPANY_OWNER" ||
    user.role === "COMPANY_ADMIN";
  if (!isAdmin) {
    throw new Error("Permisos insuficientes. Se requiere rol de administrador.");
  }
  return user;
}

export async function requireSuperAdmin() {
  const user = await getCurrentUserContext();
  if (user.role !== "SUPERADMIN") {
    throw new Error("Permisos insuficientes. Se requiere rol de SuperAdmin.");
  }
  return user;
}

export async function assertCardBelongsToCompany(cardId: string, companyId: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { companyId: true, userId: true },
  });
  if (!card) {
    throw new Error("Tarjeta no encontrada.");
  }
  if (card.companyId !== companyId) {
    throw new Error("Acceso denegado a esta tarjeta (diferente empresa).");
  }
  return card;
}
