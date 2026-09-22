// app/dashboard/cards/actions.ts
"use server";

import { prisma } from "../../../lib/prisma";
import { getCurrentUserContext } from "../../../lib/permissions";
import { revalidatePath } from "next/cache";
import { lockCapacity, hasCapability, requireCapability } from "../../../lib/entitlements";
import { canCreateIdentity } from "../../../lib/product-access";

// Deactivating an identity only reduces access, so it never depends on TEAM_MANAGEMENT.
// Reactivating one expands Teams usage: it requires TEAM_MANAGEMENT, a valid user and available capacity.
export async function toggleCardActive(cardId: string, isActive: boolean) {
  const admin = await getCurrentUserContext();
  const isAdmin = admin.role === "SUPERADMIN" || admin.role === "COMPANY_OWNER" || admin.role === "COMPANY_ADMIN";

  if (!isAdmin) {
    throw new Error("Solo los administradores pueden activar/desactivar tarjetas.");
  }

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      companyId: true,
      user: { select: { isActive: true, status: true } },
    },
  });

  if (!card) {
    throw new Error("Tarjeta no encontrada.");
  }

  if (card.companyId !== admin.companyId) {
    throw new Error("No tienes permisos para modificar esta tarjeta.");
  }

  if (isActive) {
    if (!card.user.isActive || card.user.status !== "ACTIVE") {
      throw new Error("No es posible activar una tarjeta perteneciente a un colaborador suspendido o pendiente.");
    }
  }
  await prisma.$transaction(async tx => {
    await lockCapacity(tx, admin.companyId);
    const current = await tx.card.findFirstOrThrow({ where: { id: cardId, companyId: admin.companyId } });
    const canManageTeam = await hasCapability(admin.companyId, "TEAM_MANAGEMENT", tx);
    if (isActive) {
      if (!canManageTeam) throw new Error("Reactivar identidades requiere un plan Teams activo.");
      if (!current.isActive && !(await canCreateIdentity(admin.companyId, tx))) throw new Error("Límite de identidades alcanzado.");
    } else if (current.userId === admin.id && !canManageTeam) {
      // Without Teams the administrator could not reactivate their own identity afterwards.
      throw new Error("No puedes desactivar tu propia identidad mientras tu plan Teams no esté activo, porque no podrías reactivarla.");
    }
    await tx.card.update({ where: { id: cardId }, data: { isActive } });
  });

  revalidatePath("/dashboard/cards");
  return { success: true };
}

export async function createVirtualCard(name: string, slug: string, userId: string) {
  const admin = await getCurrentUserContext();
  await requireCapability(admin.companyId, "TEAM_MANAGEMENT");
  const isAdmin = admin.role === "SUPERADMIN" || admin.role === "COMPANY_OWNER" || admin.role === "COMPANY_ADMIN";

  if (!isAdmin) {
    throw new Error("Solo los administradores pueden crear tarjetas.");
  }

  const normalizedSlug = slug
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!normalizedSlug) {
    throw new Error("El enlace de la tarjeta (slug) no es válido.");
  }
  if (name.trim().length < 2 || name.trim().length > 120 || normalizedSlug.length > 80) {
    throw new Error("El nombre o enlace excede el tamaño permitido.");
  }

  const existingCard = await prisma.card.findUnique({
    where: { slug: normalizedSlug },
  });

  if (existingCard) {
    throw new Error(`El enlace "c/${normalizedSlug}" ya está registrado en el sistema. Elige otro enlace.`);
  }

  const assignedUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, companyId: true, isActive: true, status: true },
  });

  if (!assignedUser || assignedUser.companyId !== admin.companyId) {
    throw new Error("El usuario seleccionado no existe o pertenece a otra empresa.");
  }
  if (!assignedUser.isActive || assignedUser.status !== "ACTIVE") {
    throw new Error("No puedes crear una tarjeta para un colaborador suspendido o pendiente.");
  }

  const canCreate = await canCreateIdentity(admin.companyId);
  if (!canCreate) {
    throw new Error("No es posible crear la tarjeta. Has alcanzado el límite de identidades activas permitidas por tu plan.");
  }

  await prisma.$transaction(async tx => {
    await lockCapacity(tx, admin.companyId);
    await requireCapability(admin.companyId, "TEAM_MANAGEMENT", tx);
    if (!(await canCreateIdentity(admin.companyId, tx))) throw new Error("Límite de identidades alcanzado.");
    // Creating an identity is not itself INTERNAL/PILOT/PURCHASE. It works via the company's active
    // license (empresasOperational) until Superadmin explicitly assigns a permanent profile right.
    await tx.card.create({
      data: {
        name: name.trim(),
        slug: normalizedSlug,
        userId,
        companyId: admin.companyId,
        profileName: name.trim(),
      },
    });
  });
  revalidatePath("/dashboard/cards");
  return { success: true };
}
