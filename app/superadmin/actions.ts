"use server";

import { prisma } from "../../lib/prisma";
import { requireSuperAdmin } from "../../lib/permissions";
import { UserRole, PlanType } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import React from "react";
import { revalidatePath } from "next/cache";
import { sendEmail } from "../../lib/email/send-email";
import UserInvitationEmail from "../../emails/UserInvitationEmail";
import CompanyCreatedEmail from "../../emails/CompanyCreatedEmail";
import PasswordResetEmail from "../../emails/PasswordResetEmail";

// 1. Registrar Empresa y Administrador Pendiente (Requisito 5)
export async function createCompanyAction(data: {
  name: string;
  slug: string;
  plan: PlanType;
  maxIdentities: number;
  licenseStatus: string;
  internalNotes?: string;
  adminName?: string;
  adminEmail?: string;
}) {
  const superadmin = await requireSuperAdmin();

  // Normalizar y validar slug
  const normalizedSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!normalizedSlug) {
    throw new Error("El identificador URL (slug) es inválido.");
  }

  const reserved = ["superadmin", "dashboard", "login", "api", "t", "c", "configuracion", "editor", "leads", "metrics", "users", "cards", "qr"];
  if (reserved.includes(normalizedSlug)) {
    throw new Error("El identificador URL (slug) ingresado está reservado por el sistema.");
  }

  const existing = await prisma.company.findUnique({
    where: { slug: normalizedSlug }
  });
  if (existing) {
    throw new Error("El identificador URL (slug) ya está en uso por otra empresa.");
  }

  // Ejecutar creación en BD
  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: data.name.trim(),
        slug: normalizedSlug,
        plan: data.plan,
        maxIdentities: Number(data.maxIdentities),
        licenseStatus: data.licenseStatus,
        internalNotes: data.internalNotes,
        isActive: data.licenseStatus === "ACTIVE" || data.licenseStatus === "TRIAL",
      }
    });

    await tx.adminAuditLog.create({
      data: {
        actorUserId: superadmin.id,
        action: "COMPANY_CREATE",
        entityType: "COMPANY",
        entityId: company.id,
        companyId: company.id,
        metadata: JSON.stringify({ name: company.name, slug: company.slug })
      }
    });

    let adminUser = null;
    if (data.adminEmail && data.adminName) {
      const emailNorm = data.adminEmail.trim().toLowerCase();
      const existingUser = await tx.user.findUnique({
        where: { email: emailNorm }
      });
      if (existingUser) {
        throw new Error("El correo electrónico del administrador ya está registrado.");
      }

      // Crear usuario en estado PENDING y con isActive = false (Requisito 4)
      adminUser = await tx.user.create({
        data: {
          name: data.adminName.trim(),
          email: emailNorm,
          role: UserRole.COMPANY_OWNER,
          companyId: company.id,
          isActive: false,
          status: "PENDING"
        }
      });

      await tx.adminAuditLog.create({
        data: {
          actorUserId: superadmin.id,
          action: "USER_INVITATION_CREATED",
          entityType: "USER",
          entityId: adminUser.id,
          companyId: company.id,
          metadata: JSON.stringify({ email: adminUser.email, role: adminUser.role })
        }
      });
    }

    return { company, adminUser };
  });

  // Enviar invitación por correo electrónico fuera de la transacción (Requisito 5)
  if (result.adminUser) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await prisma.userActivationToken.create({
      data: {
        userId: result.adminUser.id,
        tokenHash,
        expiresAt,
      }
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const activationUrl = `${appUrl}/activar-cuenta?token=${token}`;

    const emailRes = await sendEmail({
      to: result.adminUser.email,
      subject: "Activa tu cuenta de Smart NFC",
      react: React.createElement(UserInvitationEmail, {
        name: result.adminUser.name || "Administrador",
        companyName: result.company.name,
        role: result.adminUser.role,
        activationUrl,
      }),
    });

    if (!emailRes.success) {
      await prisma.adminAuditLog.create({
        data: {
          actorUserId: superadmin.id,
          action: "EMAIL_SEND_FAILED",
          entityType: "USER",
          entityId: result.adminUser.id,
          companyId: result.company.id,
          metadata: JSON.stringify({ email: result.adminUser.email, error: emailRes.error })
        }
      });
      // Devolver error amigable en UI pero la empresa queda creada
      throw new Error(`Empresa creada, pero falló el envío del correo de invitación: ${emailRes.error}`);
    }
  }

  revalidatePath("/superadmin/empresas");
  return result;
}

// 2. Reenviar Invitación de un Usuario (Requisito 5)
export async function resendInvitationAction(userId: string) {
  const superadmin = await requireSuperAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true }
  });

  if (!user) {
    throw new Error("Usuario no encontrado.");
  }

  if (user.status !== "PENDING") {
    throw new Error("El usuario ya se encuentra activo.");
  }

  // Invalidar tokens previos de activación
  await prisma.userActivationToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { expiresAt: new Date() }
  });

  // Generar nuevo token
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await prisma.userActivationToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt
    }
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const activationUrl = `${appUrl}/activar-cuenta?token=${token}`;

  const emailRes = await sendEmail({
    to: user.email,
    subject: "Activa tu cuenta de Smart NFC",
    react: React.createElement(UserInvitationEmail, {
      name: user.name || "Administrador",
      companyName: user.company.name,
      role: user.role,
      activationUrl,
    }),
  });

  if (!emailRes.success) {
    await prisma.adminAuditLog.create({
      data: {
        actorUserId: superadmin.id,
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
      actorUserId: superadmin.id,
      action: "USER_INVITATION_RESENT",
      entityType: "USER",
      entityId: user.id,
      companyId: user.companyId,
      metadata: JSON.stringify({ email: user.email })
    }
  });

  return { success: true };
}

// 3. Modificar Empresa (Requisito 6)
export async function updateCompanyAction(companyId: string, data: {
  name: string;
  plan: PlanType;
  maxIdentities: number;
  licenseStatus: string;
  internalNotes?: string;
  isActive: boolean;
}) {
  const superadmin = await requireSuperAdmin();

  const company = await prisma.company.findUnique({
    where: { id: companyId }
  });
  if (!company) {
    throw new Error("Empresa no encontrada.");
  }

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: {
      name: data.name.trim(),
      plan: data.plan,
      maxIdentities: Number(data.maxIdentities),
      licenseStatus: data.licenseStatus,
      internalNotes: data.internalNotes,
      isActive: data.isActive,
    }
  });

  await prisma.adminAuditLog.create({
    data: {
      actorUserId: superadmin.id,
      action: "COMPANY_UPDATE",
      entityType: "COMPANY",
      entityId: company.id,
      companyId: company.id,
      metadata: JSON.stringify({
        isActiveBefore: company.isActive,
        isActiveAfter: data.isActive,
        licenseBefore: company.licenseStatus,
        licenseAfter: data.licenseStatus
      })
    }
  });

  revalidatePath("/superadmin/empresas");
  revalidatePath(`/superadmin/empresas/${companyId}`);
  return updated;
}

// 4. Registrar Integrante Administrativo Adicional
export async function createAdminUserAction(data: {
  companyId: string;
  name: string;
  email: string;
  passwordPlain: string;
}) {
  const superadmin = await requireSuperAdmin();

  const emailNorm = data.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email: emailNorm }
  });
  if (existingUser) {
    throw new Error("El correo electrónico ya está registrado.");
  }

  const hash = await bcrypt.hash(data.passwordPlain, 10);
  const newUser = await prisma.user.create({
    data: {
      name: data.name.trim(),
      email: emailNorm,
      password: hash,
      role: UserRole.COMPANY_OWNER,
      companyId: data.companyId,
      isActive: true,
      status: "ACTIVE"
    }
  });

  await prisma.adminAuditLog.create({
    data: {
      actorUserId: superadmin.id,
      action: "USER_CREATE_ADMIN",
      entityType: "USER",
      entityId: newUser.id,
      companyId: data.companyId,
      metadata: JSON.stringify({ email: newUser.email, role: newUser.role })
    }
  });

  revalidatePath(`/superadmin/empresas/${data.companyId}`);
  revalidatePath("/superadmin/usuarios");
  return newUser;
}

// 5. Modificar Rol y Estado de Usuario (Requisito 7)
export async function updateUserRoleAndStatusAction(userId: string, data: {
  isActive: boolean;
  role: UserRole;
  companyId: string;
}) {
  const superadmin = await requireSuperAdmin();

  const targetUser = await prisma.user.findUnique({
    where: { id: userId }
  });
  if (!targetUser) {
    throw new Error("Usuario no encontrado.");
  }

  if (data.role === UserRole.SUPERADMIN && targetUser.role !== UserRole.SUPERADMIN) {
    throw new Error("No es posible asignar el rol SUPERADMIN desde este formulario.");
  }

  const newStatus = !data.isActive ? "SUSPENDED" : "ACTIVE";

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: data.isActive,
      role: data.role,
      companyId: data.companyId,
      status: newStatus
    }
  });

  await prisma.adminAuditLog.create({
    data: {
      actorUserId: superadmin.id,
      action: "USER_ROLE_STATUS_UPDATE",
      entityType: "USER",
      entityId: updated.id,
      companyId: updated.companyId,
      metadata: JSON.stringify({
        before: { role: targetUser.role, isActive: targetUser.isActive, companyId: targetUser.companyId },
        after: { role: updated.role, isActive: updated.isActive, companyId: updated.companyId }
      })
    }
  });

  revalidatePath("/superadmin/usuarios");
  revalidatePath(`/superadmin/empresas/${data.companyId}`);
  return updated;
}

// 6. Validar Token de Activación en el Servidor (Requisito 6)
export async function validateActivationTokenAction(token: string) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const activationToken = await prisma.userActivationToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: { company: true }
      }
    }
  });

  if (!activationToken) {
    throw new Error("El token de activación no es válido.");
  }

  if (activationToken.usedAt) {
    throw new Error("Este enlace de activación ya fue utilizado.");
  }

  if (activationToken.expiresAt < new Date()) {
    throw new Error("Este enlace de activación ha expirado.");
  }

  return {
    userId: activationToken.userId,
    userName: activationToken.user.name,
    companyName: activationToken.user.company.name,
  };
}

// 7. Completar la Activación de Cuenta (Requisito 6)
export async function activateUserAccountAction(token: string, passwordPlain: string) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const activationToken = await prisma.userActivationToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: { company: true }
      }
    }
  });

  if (!activationToken || activationToken.usedAt || activationToken.expiresAt < new Date()) {
    throw new Error("Enlace inválido o expirado.");
  }

  // Cifrar la contraseña
  const hash = await bcrypt.hash(passwordPlain, 10);

  // Ejecutar actualización
  await prisma.$transaction(async (tx) => {
    // Activar usuario
    await tx.user.update({
      where: { id: activationToken.userId },
      data: {
        password: hash,
        status: "ACTIVE",
        isActive: true,
      }
    });

    // Quemar token
    await tx.userActivationToken.update({
      where: { id: activationToken.id },
      data: { usedAt: new Date() }
    });

    // Registrar auditoría de activación
    await tx.adminAuditLog.create({
      data: {
        actorUserId: activationToken.userId,
        action: "USER_ACTIVATED",
        entityType: "USER",
        entityId: activationToken.userId,
        companyId: activationToken.user.companyId,
        metadata: JSON.stringify({ email: activationToken.user.email })
      }
    });
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  await sendEmail({
    to: activationToken.user.email,
    subject: "Tu empresa ya está configurada en Smart NFC",
    react: React.createElement(CompanyCreatedEmail, {
      companyName: activationToken.user.company.name,
      maxIdentities: activationToken.user.company.maxIdentities,
      adminName: activationToken.user.name || "Administrador",
      loginUrl: `${appUrl}/login`,
    }),
  }).catch((err: unknown) => {
    console.error("Error al enviar correo de bienvenida:", err);
  });

  return { success: true };
}

// 8. Solicitar Recuperación de Contraseña (Requisito 7)
export async function requestPasswordResetAction(email: string) {
  const emailNorm = email.trim().toLowerCase();
  
  const user = await prisma.user.findUnique({
    where: { email: emailNorm },
    include: { company: true }
  });

  // Respuesta pública genérica para evitar enumeración de usuarios (Requisito 7)
  const genericResponse = { success: true, message: "Si el correo está registrado, recibirás un enlace de restablecimiento pronto." };

  if (!user || user.status === "SUSPENDED" || !user.isActive) {
    return genericResponse;
  }

  // Invalidar tokens previos
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { expiresAt: new Date() }
  });

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 60); // 60 minutos de expiración

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt
    }
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/restablecer-contrasena?token=${token}`;

  const emailRes = await sendEmail({
    to: user.email,
    subject: "Restablece tu contraseña de Smart NFC",
    react: React.createElement(PasswordResetEmail, {
      name: user.name || "Usuario",
      resetUrl,
    })
  });

  if (!emailRes.success) {
    await prisma.adminAuditLog.create({
      data: {
        actorUserId: user.id,
        action: "EMAIL_SEND_FAILED",
        entityType: "USER",
        entityId: user.id,
        companyId: user.companyId,
        metadata: JSON.stringify({ email: user.email, action: "PASSWORD_RESET", error: emailRes.error })
      }
    });
    return genericResponse;
  }

  await prisma.adminAuditLog.create({
    data: {
      actorUserId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      entityType: "USER",
      entityId: user.id,
      companyId: user.companyId,
      metadata: JSON.stringify({ email: user.email })
    }
  });

  return genericResponse;
}

// 9. Completar el Restablecimiento de Contraseña (Requisito 7)
export async function completePasswordResetAction(token: string, passwordPlain: string) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: true
    }
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new Error("El enlace es inválido o ha expirado.");
  }

  const hash = await bcrypt.hash(passwordPlain, 10);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetToken.userId },
      data: { password: hash }
    });

    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() }
    });

    await tx.adminAuditLog.create({
      data: {
        actorUserId: resetToken.userId,
        action: "PASSWORD_RESET_COMPLETED",
        entityType: "USER",
        entityId: resetToken.userId,
        companyId: resetToken.user.companyId,
        metadata: JSON.stringify({ email: resetToken.user.email })
      }
    });
  });

  return { success: true };
}
