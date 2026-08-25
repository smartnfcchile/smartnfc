import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { UserRole } from "@prisma/client";

export async function getCurrentUserContext() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; companyId?: string } | undefined;
  if (!sessionUser?.id || !sessionUser.companyId) {
    throw new Error("No autorizado");
  }

  // Nunca confiar solamente en el rol/empresa guardados dentro del JWT. Se
  // revalidan contra la base de datos para cortar sesiones de usuarios
  // suspendidos y evitar privilegios obsoletos después de un cambio de rol.
  const user = await prisma.user.findFirst({
    where: {
      id: sessionUser.id,
      companyId: sessionUser.companyId,
      isActive: true,
      status: "ACTIVE",
      company: { isActive: true },
    },
    select: { id: true, email: true, name: true, role: true, companyId: true },
  });

  if (!user) throw new Error("No autorizado");
  return user;
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
