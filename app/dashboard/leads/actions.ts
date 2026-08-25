// app/dashboard/leads/actions.ts
"use server";

import { prisma } from "../../../lib/prisma";
import { getCurrentUserContext } from "../../../lib/permissions";
import { revalidatePath } from "next/cache";

export async function updateLeadCRM(leadId: string, status: string, notes: string | null) {
  const user = await getCurrentUserContext();
  const isAdmin = user.role === "SUPERADMIN" || user.role === "COMPANY_OWNER" || user.role === "COMPANY_ADMIN";

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
      interactions: {
        where: { card: { userId: user.id } },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!lead) {
    throw new Error("Prospecto no encontrado");
  }

  // Validaciones estrictas de permisos
  if (!isAdmin && lead.card.userId !== user.id && lead.interactions.length === 0) {
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
