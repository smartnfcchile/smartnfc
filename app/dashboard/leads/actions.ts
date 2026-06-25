// app/dashboard/leads/actions.ts
"use server";

import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { revalidatePath } from "next/cache";

export async function updateLeadCRM(leadId: string, status: string, notes: string | null) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("No autorizado");
  }

  const user = session.user as any;
  const isAdmin = user.role === "SUPERADMIN" || user.role === "CLIENT_ADMIN";

  // Buscamos el lead y su tarjeta asociada para validar permisos de pertenencia
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      card: {
        select: {
          companyId: true,
          userId: true,
        },
      },
    },
  });

  if (!lead) {
    throw new Error("Prospecto no encontrado");
  }

  // Validaciones estrictas de permisos
  if (!isAdmin && lead.card.userId !== user.id) {
    throw new Error("No tienes permisos para modificar este prospecto.");
  }

  if (isAdmin && lead.card.companyId !== user.companyId) {
    throw new Error("No tienes permisos para modificar prospectos de otra empresa.");
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status,
      notes: notes || null,
    },
  });

  revalidatePath("/dashboard/leads");
}
