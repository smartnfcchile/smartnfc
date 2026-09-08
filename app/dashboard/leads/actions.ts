// app/dashboard/leads/actions.ts
"use server";

import { prisma } from "../../../lib/prisma";
import { getCurrentUserContext } from "../../../lib/permissions";
import { revalidatePath } from "next/cache";

const ALLOWED_LEAD_STATUSES = new Set(["NUEVO", "CONTACTADO", "NEGOCIACION", "GANADO", "PERDIDO"]);
const MAX_NOTES_LENGTH = 5000;

export async function updateLeadCRM(leadId: string, status: string, notes: string | null) {
  const user = await getCurrentUserContext();
  const isAdmin = user.role === "SUPERADMIN" || user.role === "COMPANY_OWNER" || user.role === "COMPANY_ADMIN";
  const nextStatus = status.trim().toUpperCase();
  const nextNotes = notes?.trim() || null;

  if (!ALLOWED_LEAD_STATUSES.has(nextStatus)) {
    throw new Error("Estado CRM no válido.");
  }
  if (nextNotes && nextNotes.length > MAX_NOTES_LENGTH) {
    throw new Error("Las notas de seguimiento son demasiado extensas.");
  }

  // El prospecto es un activo comercial de la empresa. La tarjeta determina qué colaborador
  // puede trabajarlo, pero nunca transfiere la propiedad del dato fuera de la empresa.
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
    throw new Error("Prospecto no encontrado.");
  }

  // Toda modificación debe permanecer dentro de la empresa del usuario, también para colaboradores.
  if (lead.companyId !== user.companyId || lead.card.companyId !== user.companyId) {
    throw new Error("No tienes permisos para modificar prospectos de otra empresa.");
  }

  // Los colaboradores sólo pueden trabajar prospectos vinculados a sus tarjetas o a una interacción
  // realizada desde una de sus tarjetas. No existe acción de eliminación para este rol.
  if (!isAdmin && lead.card.userId !== user.id && lead.interactions.length === 0) {
    throw new Error("No tienes permisos para modificar este prospecto.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: {
        status: nextStatus,
        notes: nextNotes,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        actorUserId: user.id,
        action: "LEAD_CRM_UPDATED",
        entityType: "LEAD",
        entityId: lead.id,
        companyId: lead.companyId,
        metadata: JSON.stringify({
          previousStatus: lead.status,
          nextStatus,
          notesChanged: (lead.notes || null) !== nextNotes,
          cardId: lead.cardId,
          cardOwnerUserId: lead.card.userId,
        }),
      },
    });
  });

  revalidatePath("/dashboard/leads");
  return { success: true };
}
