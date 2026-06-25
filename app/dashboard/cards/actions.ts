// app/dashboard/cards/actions.ts
"use server";

import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { revalidatePath } from "next/cache";

export async function toggleCardActive(cardId: string, isActive: boolean) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("No autorizado");
  }

  const admin = session.user as any;
  const isAdmin = admin.role === "SUPERADMIN" || admin.role === "CLIENT_ADMIN";

  if (!isAdmin) {
    throw new Error("Solo los administradores pueden activar/desactivar tarjetas.");
  }

  // Verificar pertenencia de tarjeta a la empresa
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { id: true, companyId: true },
  });

  if (!card) {
    throw new Error("Tarjeta no encontrada.");
  }

  if (card.companyId !== admin.companyId) {
    throw new Error("No tienes permisos para modificar esta tarjeta.");
  }

  await prisma.card.update({
    where: { id: cardId },
    data: { isActive },
  });

  revalidatePath("/dashboard/cards");
  return { success: true };
}

export async function createVirtualCard(name: string, slug: string, userId: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("No autorizado");
  }

  const admin = session.user as any;
  const isAdmin = admin.role === "SUPERADMIN" || admin.role === "CLIENT_ADMIN";

  if (!isAdmin) {
    throw new Error("Solo los administradores pueden crear tarjetas.");
  }

  // Validar y normalizar el slug
  const normalizedSlug = slug
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .replace(/[^a-z0-9-_]/g, "-") // Reemplazar caracteres especiales por guiones
    .replace(/-+/g, "-") // Evitar múltiples guiones seguidos
    .replace(/^-|-$/g, ""); // Quitar guiones al principio/final

  if (!normalizedSlug) {
    throw new Error("El enlace de la tarjeta (slug) no es válido.");
  }

  const existingCard = await prisma.card.findUnique({
    where: { slug: normalizedSlug },
  });

  if (existingCard) {
    throw new Error(`El enlace "c/${normalizedSlug}" ya está registrado en el sistema. Elige otro enlace.`);
  }

  // Validar que el usuario asignado pertenezca a la misma empresa
  const assignedUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, companyId: true },
  });

  if (!assignedUser || assignedUser.companyId !== admin.companyId) {
    throw new Error("El usuario seleccionado no existe o pertenece a otra empresa.");
  }

  await prisma.card.create({
    data: {
      name: name.trim(),
      slug: normalizedSlug,
      userId,
      companyId: admin.companyId,
      profileName: name.trim(), // Valor por defecto
    },
  });

  revalidatePath("/dashboard/cards");
  return { success: true };
}
