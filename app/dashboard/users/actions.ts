// app/dashboard/users/actions.ts
"use server";

import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import React from "react";
import { sendEmail } from "../../../lib/email/send-email";
import UserInvitationEmail from "../../../emails/UserInvitationEmail";

export async function createVendorUser(
  name: string,
  email: string
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("No autorizado");
  }

  const admin = session.user as { id: string; role: string; companyId: string };
  const isAdmin = admin.role === "SUPERADMIN" || admin.role === "COMPANY_OWNER" || admin.role === "COMPANY_ADMIN";

  if (!isAdmin) {
    throw new Error("Solo los administradores pueden crear vendedores.");
  }

  // 1. Validar que el correo no esté registrado
  const emailNorm = email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email: emailNorm },
  });

  if (existingUser) {
    throw new Error("Este correo electrónico ya está registrado en la plataforma.");
  }

  // 2. Crear usuario en estado PENDING y con isActive = false (Requisito 1)
  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      email: emailNorm,
      role: "COLLABORATOR", // Requisito 7: Solo vendedores
      companyId: admin.companyId, // Requisito 6: Solo dentro de su empresa
      isActive: false,
      status: "PENDING"
    },
    include: { company: true }
  });

  // Registrar auditoría de invitación (Requisito 9)
  await prisma.adminAuditLog.create({
    data: {
      actorUserId: admin.id,
      action: "USER_INVITATION_CREATED",
      entityType: "USER",
      entityId: newUser.id,
      companyId: admin.companyId,
      metadata: JSON.stringify({ email: newUser.email, role: newUser.role })
    }
  });

  // 3. Generar token de activación (Requisito 2)
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);

  await prisma.userActivationToken.create({
    data: {
      userId: newUser.id,
      tokenHash,
      expiresAt,
    }
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const activationUrl = `${appUrl}/activar-cuenta?token=${token}`;

  // 4. Envío de Correo mediante Resend (Requisito 3)
  const emailRes = await sendEmail({
    to: newUser.email,
    subject: "Activa tu cuenta de Smart NFC",
    react: React.createElement(UserInvitationEmail, {
      name: newUser.name || "Vendedor",
      companyName: newUser.company.name,
      role: newUser.role,
      activationUrl,
    }),
  });

  let emailWarning = null;
  if (!emailRes.success) {
    await prisma.adminAuditLog.create({
      data: {
        actorUserId: admin.id,
        action: "EMAIL_SEND_FAILED",
        entityType: "USER",
        entityId: newUser.id,
        companyId: admin.companyId,
        metadata: JSON.stringify({ email: newUser.email, error: emailRes.error })
      }
    });
    // Requisito 8: No revertir, devolver warning amigable
    emailWarning = "El vendedor fue registrado correctamente, pero no fue posible enviar el correo de activación de cuenta. Puedes reenviar el enlace utilizando el botón correspondiente.";
  }

  revalidatePath("/dashboard/users");
  return { success: true, emailWarning };
}

// 5. Reenviar invitación desde el Dashboard (Requisito 5)
export async function resendInvitationFromDashboardAction(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("No autorizado");
  }

  const admin = session.user as { id: string; role: string; companyId: string };
  const isAdmin = admin.role === "SUPERADMIN" || admin.role === "COMPANY_OWNER" || admin.role === "COMPANY_ADMIN";

  if (!isAdmin) {
    throw new Error("Solo los administradores pueden reenviar invitaciones.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true }
  });

  if (!user) {
    throw new Error("Usuario no encontrado.");
  }

  // Validar aislamiento multiempresa (Requisito 6)
  if (user.companyId !== admin.companyId) {
    throw new Error("No autorizado. El usuario pertenece a otra empresa.");
  }

  if (user.password) {
    throw new Error("El usuario ya completó su enrolamiento. Debe usar la recuperación de contraseña.");
  }

  // Invalidar tokens anteriores
  // Generar nuevo token
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);

  await prisma.$transaction(async (tx) => {
    await tx.userActivationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { expiresAt: new Date() }
    });
    await tx.userActivationToken.create({
      data: { userId: user.id, tokenHash, expiresAt }
    });
    await tx.user.update({
      where: { id: user.id },
      data: { status: "PENDING", isActive: false }
    });
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const activationUrl = `${appUrl}/activar-cuenta?token=${token}`;

  const emailRes = await sendEmail({
    to: user.email,
    subject: "Activa tu cuenta de Smart NFC",
    react: React.createElement(UserInvitationEmail, {
      name: user.name || "Vendedor",
      companyName: user.company.name,
      role: user.role,
      activationUrl,
    }),
  });

  if (!emailRes.success) {
    await prisma.adminAuditLog.create({
      data: {
        actorUserId: admin.id,
        action: "EMAIL_SEND_FAILED",
        entityType: "USER",
        entityId: user.id,
        companyId: user.companyId,
        metadata: JSON.stringify({ email: user.email, error: emailRes.error })
      }
    });
    throw new Error(`Fallo en el reenvío de correo: ${emailRes.error}`);
  }

  await prisma.adminAuditLog.create({
    data: {
      actorUserId: admin.id,
      action: "USER_INVITATION_RESENT",
      entityType: "USER",
      entityId: user.id,
      companyId: user.companyId,
      metadata: JSON.stringify({ email: user.email })
    }
  });

  return { success: true };
}

export async function deleteVendorUser(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("No autorizado");
  }

  const admin = session.user as { id: string; role: string; companyId: string };
  const isAdmin = admin.role === "SUPERADMIN" || admin.role === "COMPANY_OWNER" || admin.role === "COMPANY_ADMIN";

  if (!isAdmin) {
    throw new Error("Solo los administradores pueden eliminar vendedores.");
  }

  // 1. Validar que el usuario a eliminar pertenezca a la misma empresa (Requisito 6)
  const userToDelete = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, companyId: true },
  });

  if (!userToDelete) {
    throw new Error("Usuario no encontrado.");
  }

  if (userToDelete.companyId !== admin.companyId) {
    throw new Error("No tienes permisos sobre usuarios de otra empresa.");
  }

  // 2. Eliminar tarjetas y luego el usuario
  await prisma.card.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/dashboard/users");
  return { success: true };
}
