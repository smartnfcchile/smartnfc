"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "../../../lib/prisma";
import { isCompanyAdmin, requirePhysicalDesignUser, requireScopedDesign } from "../../../lib/physical-card/auth";
import type { CardSideDesign } from "../../../lib/physical-card/templates";

const json = (value: CardSideDesign) => value as unknown as Prisma.InputJsonValue;
const clean = (value: unknown, max = 120) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function createPhysicalDesignAction(input: { cardId: string; templateId: string; name: string }) {
  const user = await requirePhysicalDesignUser();
  const [card, template] = await Promise.all([
    prisma.card.findFirst({ where: { id: input.cardId, companyId: user.companyId, ...(isCompanyAdmin(user.role) ? {} : { userId: user.id }) } }),
    prisma.cardDesignTemplate.findFirst({ where: { id: input.templateId, isActive: true } }),
  ]);
  if (!card || !template) throw new Error("La tarjeta o plantilla no está disponible.");
  const hydrate = (source: Prisma.JsonValue) => ({
    ...(source as unknown as CardSideDesign), name: card.profileName || card.name, position: card.role || "",
    company: card.companyName || "", phone: card.phone || "", email: card.email || "", website: "",
    instagram: card.instagram || "", address: card.location || "", logoUrl: card.logoUrl || "", photoUrl: card.avatarUrl || "",
  });
  const design = await prisma.physicalCardDesign.create({ data: {
    companyId: user.companyId, cardId: card.id, createdById: user.id, templateId: template.id,
    name: clean(input.name) || `${card.name} · ${template.name}`, category: template.category,
    frontDesign: json(hydrate(template.frontSchema)), backDesign: json(hydrate(template.backSchema)),
    productionConfig: { method: "ADHESIVE_LABEL", printSides: "DOUBLE", finish: "MATTE" },
  }});
  revalidatePath("/dashboard/physical-designs");
  return { id: design.id };
}

export async function savePhysicalDesignAction(input: { id: string; name: string; front: CardSideDesign; back: CardSideDesign; expectedVersion: number }) {
  const { design } = await requireScopedDesign(input.id);
  if (design.version !== input.expectedVersion) throw new Error("Este diseño cambió en otra sesión. Recarga antes de continuar.");
  const updated = await prisma.physicalCardDesign.updateMany({
    where: { id: design.id, companyId: design.companyId, version: input.expectedVersion },
    data: { name: clean(input.name), frontDesign: json(input.front), backDesign: json(input.back), version: { increment: 1 }, status: design.status === "APPROVED" ? "DRAFT" : design.status },
  });
  if (updated.count !== 1) throw new Error("No fue posible guardar por un conflicto de versión.");
  revalidatePath(`/dashboard/physical-designs/${design.id}`);
  return { version: input.expectedVersion + 1, savedAt: new Date().toISOString() };
}

export async function duplicatePhysicalDesignAction(id: string) {
  const { user, design } = await requireScopedDesign(id);
  const copy = await prisma.physicalCardDesign.create({ data: {
    companyId: design.companyId, cardId: design.cardId, createdById: user.id, templateId: design.templateId,
    name: `${design.name} (copia)`, category: design.category, orientation: design.orientation, widthMm: design.widthMm,
    heightMm: design.heightMm, bleedMm: design.bleedMm, safeMarginMm: design.safeMarginMm,
    frontDesign: design.frontDesign as Prisma.InputJsonValue, backDesign: design.backDesign as Prisma.InputJsonValue,
    productionConfig: design.productionConfig as Prisma.InputJsonValue,
  }});
  revalidatePath("/dashboard/physical-designs");
  return { id: copy.id };
}

export async function archivePhysicalDesignAction(id: string) {
  const { design } = await requireScopedDesign(id);
  await prisma.physicalCardDesign.updateMany({ where: { id, companyId: design.companyId }, data: { status: "ARCHIVED" } });
  revalidatePath("/dashboard/physical-designs");
}

export async function requestPrintOrderAction(input: { designId: string; quantity: number; productionMethod: string; printSides: string; finish: string; notes: string }) {
  const { user, design } = await requireScopedDesign(input.designId);
  const quantity = Math.max(1, Math.min(10000, Math.round(input.quantity)));
  const order = await prisma.physicalCardOrder.create({ data: {
    companyId: user.companyId, designId: design.id, requestedById: user.id, quantity,
    productionMethod: clean(input.productionMethod, 40), printSides: clean(input.printSides, 20),
    finish: clean(input.finish, 20), notes: clean(input.notes, 1000) || null,
  }});
  revalidatePath("/dashboard/physical-designs/orders");
  return { id: order.id };
}

export async function updateOrderStatusAction(orderId: string, status: string) {
  const user = await requirePhysicalDesignUser();
  if (!isCompanyAdmin(user.role)) throw new Error("Solo un administrador puede actualizar pedidos.");
  const allowed = ["REQUESTED", "IN_REVIEW", "QUOTED", "APPROVED", "IN_PRODUCTION", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
  if (!allowed.includes(status as typeof allowed[number])) throw new Error("Estado inválido.");
  await prisma.physicalCardOrder.updateMany({ where: { id: orderId, companyId: user.companyId }, data: { status: status as typeof allowed[number], approvedAt: status === "APPROVED" ? new Date() : undefined } });
  revalidatePath("/dashboard/physical-designs/orders");
}
