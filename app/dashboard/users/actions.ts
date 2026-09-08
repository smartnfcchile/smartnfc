"use server";

import { prisma } from "../../../lib/prisma";
import { getCurrentUserContext } from "../../../lib/permissions";
import { canCreateIdentity } from "../../../lib/product-access";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import React from "react";
import { sendEmail } from "../../../lib/email/send-email";
import UserInvitationEmail from "../../../emails/UserInvitationEmail";
import CardProductionRequestEmail from "../../../emails/CardProductionRequestEmail";

function normalizeSlug(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

async function uniqueCardSlug(companyName: string, personName: string) {
  const base = normalizeSlug(`${companyName}-${personName}`).slice(0, 72) || "perfil-smartnfc";
  let candidate = base;
  let suffix = 2;
  while (await prisma.card.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`.slice(0, 80);
    suffix += 1;
  }
  return candidate;
}

async function sendActivationEmail(user: { id: string; name: string | null; email: string; role: string; company: { name: string } }, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const activationUrl = `${appUrl}/activar-cuenta?token=${token}`;
  return sendEmail({
    to: user.email,
    subject: "Activa tu cuenta de Smart NFC",
    react: React.createElement(UserInvitationEmail, {
      name: user.name || "Colaborador",
      companyName: user.company.name,
      role: user.role,
      activationUrl,
    }),
  });
}

export async function createCollaboratorWithCard(name: string, email: string) {
  const admin = await getCurrentUserContext();
  const isAdmin = admin.role === "SUPERADMIN" || admin.role === "COMPANY_OWNER" || admin.role === "COMPANY_ADMIN";
  if (!isAdmin) throw new Error("Solo los administradores pueden crear colaboradores.");

  const personName = name.trim();
  const emailNorm = email.trim().toLowerCase();
  if (personName.length < 2) throw new Error("Ingresa el nombre completo del colaborador.");
  if (!emailNorm) throw new Error("Ingresa un correo electrónico válido.");

  const existingUser = await prisma.user.findUnique({ where: { email: emailNorm }, select: { id: true } });
  if (existingUser) throw new Error("Este correo electrónico ya está registrado en la plataforma.");

  const company = await prisma.company.findUnique({ where: { id: admin.companyId }, select: { id: true, name: true } });
  if (!company) throw new Error("Empresa no encontrada.");

  const hasIdentityCapacity = await canCreateIdentity(company.id);
  if (!hasIdentityCapacity) {
    throw new Error("La empresa alcanzó el máximo de identidades permitido por su plan SmartNFC Empresas. Solicita una ampliación antes de crear otra tarjeta.");
  }

  const slug = await uniqueCardSlug(company.name, personName);
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const physicalToken = crypto.randomBytes(8).toString("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);

  const result = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { name: personName, email: emailNorm, role: "COLLABORATOR", companyId: company.id, isActive: false, status: "PENDING" },
      include: { company: true },
    });

    await tx.userActivationToken.create({ data: { userId: newUser.id, tokenHash, expiresAt } });

    const card = await tx.card.create({
      data: {
        name: `Perfil digital de ${personName}`,
        slug,
        profileName: personName,
        companyName: company.name,
        userId: newUser.id,
        companyId: company.id,
      },
    });

    const physicalCard = await tx.physicalNfcCard.create({
      data: { token: physicalToken, companyId: company.id, cardId: card.id, status: "PENDIENTE_GRABACION" },
    });

    await tx.adminAuditLog.create({
      data: {
        actorUserId: admin.id,
        action: "COLLABORATOR_CARD_REQUEST_CREATED",
        entityType: "CARD",
        entityId: card.id,
        companyId: company.id,
        metadata: JSON.stringify({ userId: newUser.id, email: newUser.email, slug, physicalCardId: physicalCard.id }),
      },
    });

    return { newUser, card, physicalCard };
  });

  const activationEmail = await sendActivationEmail(result.newUser, token);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const productionEmail = process.env.SMARTNFC_PRODUCTION_EMAIL || "contacto@smartnfc.cl";
  const productionNotice = await sendEmail({
    to: productionEmail,
    subject: `Nueva tarjeta corporativa solicitada — ${company.name} — ${personName}`,
    react: React.createElement(CardProductionRequestEmail, {
      companyName: company.name,
      collaboratorName: personName,
      collaboratorEmail: emailNorm,
      slug,
      requestedByName: admin.name || "Administrador",
      requestedByEmail: admin.email,
      cardId: result.card.id,
      physicalCardId: result.physicalCard.id,
      createdAt: new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" }),
      adminUrl: `${appUrl}/superadmin`,
    }),
  });

  const warnings: string[] = [];
  if (!activationEmail.success) warnings.push("La cuenta y tarjeta fueron creadas, pero no fue posible enviar la invitación al colaborador.");
  if (!productionNotice.success) warnings.push(`La tarjeta fue creada, pero no fue posible avisar a ${productionEmail}.`);

  if (warnings.length) {
    await prisma.adminAuditLog.create({
      data: {
        actorUserId: admin.id,
        action: "CARD_NOTIFICATION_WARNING",
        entityType: "CARD",
        entityId: result.card.id,
        companyId: company.id,
        metadata: JSON.stringify({ warnings }),
      },
    });
  }

  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/cards");
  return { success: true, userId: result.newUser.id, cardId: result.card.id, slug, emailWarning: warnings.join(" ") || null };
}

// Compatibilidad temporal con componentes antiguos.
export async function createVendorUser(name: string, email: string) {
  return createCollaboratorWithCard(name, email);
}

export async function resendInvitationFromDashboardAction(userId: string) {
  const admin = await getCurrentUserContext();
  const isAdmin = admin.role === "SUPERADMIN" || admin.role === "COMPANY_OWNER" || admin.role === "COMPANY_ADMIN";
  if (!isAdmin) throw new Error("Solo los administradores pueden reenviar invitaciones.");

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { company: true } });
  if (!user) throw new Error("Usuario no encontrado.");
  if (user.companyId !== admin.companyId) throw new Error("No autorizado. El usuario pertenece a otra empresa.");
  if (user.status === "SUSPENDED") throw new Error("El colaborador está suspendido y ya no puede recibir invitaciones desde esta cuenta.");
  if (user.password) throw new Error("El usuario ya completó su enrolamiento. Debe usar la recuperación de contraseña.");

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);

  await prisma.$transaction(async (tx) => {
    await tx.userActivationToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { expiresAt: new Date() } });
    await tx.userActivationToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
    await tx.user.update({ where: { id: user.id }, data: { status: "PENDING", isActive: false } });
  });

  const emailRes = await sendActivationEmail(user, token);
  if (!emailRes.success) throw new Error(`Fallo en el reenvío de correo: ${emailRes.error}`);

  await prisma.adminAuditLog.create({
    data: { actorUserId: admin.id, action: "USER_INVITATION_RESENT", entityType: "USER", entityId: user.id, companyId: user.companyId, metadata: JSON.stringify({ email: user.email }) },
  });
  return { success: true };
}

export async function suspendCollaboratorUser(userId: string) {
  const admin = await getCurrentUserContext();
  const isAdmin = admin.role === "SUPERADMIN" || admin.role === "COMPANY_OWNER" || admin.role === "COMPANY_ADMIN";
  if (!isAdmin) throw new Error("Solo los administradores pueden suspender colaboradores.");
  if (userId === admin.id) throw new Error("No puedes suspender tu propia cuenta desde esta sección.");

  const userToSuspend = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, companyId: true, role: true, status: true, email: true },
  });
  if (!userToSuspend) throw new Error("Usuario no encontrado.");
  if (userToSuspend.companyId !== admin.companyId) throw new Error("No tienes permisos sobre usuarios de otra empresa.");
  if (userToSuspend.role !== "COLLABORATOR") {
    throw new Error("Los roles administrativos deben gestionarse desde la administración de la empresa, no desde la suspensión de colaboradores.");
  }
  if (userToSuspend.status === "SUSPENDED") return { success: true };

  const cards = await prisma.card.findMany({ where: { userId }, select: { id: true } });
  const cardIds = cards.map(card => card.id);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { status: "SUSPENDED", isActive: false },
    });

    await tx.userActivationToken.updateMany({
      where: { userId, usedAt: null },
      data: { expiresAt: new Date() },
    });

    if (cardIds.length) {
      await tx.card.updateMany({
        where: { id: { in: cardIds } },
        data: { isActive: false },
      });
      await tx.physicalNfcCard.updateMany({
        where: { cardId: { in: cardIds } },
        data: { status: "SUSPENDIDA" },
      });
    }

    await tx.adminAuditLog.create({
      data: {
        actorUserId: admin.id,
        action: "COLLABORATOR_SUSPENDED",
        entityType: "USER",
        entityId: userId,
        companyId: userToSuspend.companyId,
        metadata: JSON.stringify({
          email: userToSuspend.email,
          cardIds,
          preservedHistory: true,
        }),
      },
    });
  });

  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/cards");
  revalidatePath("/dashboard/leads");
  return { success: true };
}

// Compatibilidad temporal: ya no elimina datos históricos; suspende al colaborador.
export async function deleteVendorUser(userId: string) {
  return suspendCollaboratorUser(userId);
}
