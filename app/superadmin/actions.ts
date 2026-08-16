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

import { ProductPlanCode, ProductLicenseStatus, SmartNfcProduct } from "@prisma/client";

function mapPlanCodeToLegacyPlan(code: ProductPlanCode): PlanType {
  switch (code) {
    case "EMPRESAS_CONECTA": return PlanType.FREE;
    case "EMPRESAS_CRECE": return PlanType.STARTER;
    case "EMPRESAS_ESCALA": return PlanType.PRO;
    case "EMPRESAS_CORPORATIVO": return PlanType.ENTERPRISE;
    default: return PlanType.FREE;
  }
}

function mapLicenseStatusToLegacyStatus(status: ProductLicenseStatus): string {
  switch (status) {
    case "ACTIVE": return "ACTIVE";
    case "SUSPENDED": return "SUSPENDED";
    case "CANCELLED": return "CANCELLED";
    default: return "ACTIVE";
  }
}

// 1. Registrar Empresa y Administrador Pendiente con sus Licencias correspondientes (Fase 5)
export async function createCompanyAction(data: {
  name: string;
  slug: string;
  internalNotes?: string;
  adminName?: string;
  adminEmail?: string;
  empresasLicense?: {
    planCode: ProductPlanCode;
    status: ProductLicenseStatus;
    includedIdentities: number;
    authorizedExtraIdentities: number;
    startsAt?: string;
    expiresAt?: string;
  };
  localLicense?: {
    planCode: ProductPlanCode;
    status: ProductLicenseStatus;
    includedCampaigns: number;
    includedBranches: number;
    includedTouchpoints: number;
    startsAt?: string;
    expiresAt?: string;
  };
}) {
  try {
    const superadmin = await requireSuperAdmin();

    // Normalizar y validar slug
    const normalizedSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!normalizedSlug) {
      return { success: false, error: "El identificador URL (slug) es inválido." };
    }

    const reserved = ["superadmin", "dashboard", "login", "api", "t", "c", "configuracion", "editor", "leads", "metrics", "users", "cards", "qr"];
    if (reserved.includes(normalizedSlug)) {
      return { success: false, error: "El identificador URL (slug) ingresado está reservado por el sistema." };
    }

    const existing = await prisma.company.findUnique({
      where: { slug: normalizedSlug }
    });
    if (existing) {
      return { success: false, error: "El identificador URL (slug) ya está en uso por otra empresa." };
    }

    // Ejecutar creación en BD
    const result = await prisma.$transaction(async (tx) => {
      // Sincronizar legacy
      const legacyPlan = data.empresasLicense ? mapPlanCodeToLegacyPlan(data.empresasLicense.planCode) : PlanType.FREE;
      const legacyMaxId = data.empresasLicense ? Number(data.empresasLicense.includedIdentities) : 0;
      const legacyStatus = data.empresasLicense ? mapLicenseStatusToLegacyStatus(data.empresasLicense.status) : "CANCELLED";

      const company = await tx.company.create({
        data: {
          name: data.name.trim(),
          slug: normalizedSlug,
          plan: legacyPlan,
          maxIdentities: legacyMaxId,
          licenseStatus: legacyStatus,
          internalNotes: data.internalNotes,
          isActive: (data.empresasLicense?.status === "ACTIVE") || (data.localLicense?.status === "ACTIVE"),
        }
      });

      // Crear licencia de Empresas
      if (data.empresasLicense) {
        await tx.companyProductLicense.create({
          data: {
            companyId: company.id,
            product: "EMPRESAS",
            planCode: data.empresasLicense.planCode,
            status: data.empresasLicense.status,
            includedIdentities: Number(data.empresasLicense.includedIdentities),
            authorizedExtraIdentities: Number(data.empresasLicense.authorizedExtraIdentities),
            startsAt: data.empresasLicense.startsAt ? new Date(data.empresasLicense.startsAt) : null,
            expiresAt: data.empresasLicense.expiresAt ? new Date(data.empresasLicense.expiresAt) : null,
            notes: data.internalNotes
          }
        });
      }

      // Crear licencia Local
      if (data.localLicense) {
        await tx.companyProductLicense.create({
          data: {
            companyId: company.id,
            product: "LOCAL",
            planCode: data.localLicense.planCode,
            status: data.localLicense.status,
            includedCampaigns: Number(data.localLicense.includedCampaigns),
            includedBranches: Number(data.localLicense.includedBranches),
            includedTouchpoints: Number(data.localLicense.includedTouchpoints),
            startsAt: data.localLicense.startsAt ? new Date(data.localLicense.startsAt) : null,
            expiresAt: data.localLicense.expiresAt ? new Date(data.localLicense.expiresAt) : null,
            notes: data.internalNotes
          }
        });
      }

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

    let emailWarning = null;

    // Enviar invitación por correo electrónico fuera de la transacción (Requisito 5)
    if (result.adminUser) {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

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
        emailWarning = "La empresa fue creada correctamente, pero no fue posible enviar la invitación por correo. Puedes reenviar la invitación desde el detalle de la empresa.";
      }
    }

    revalidatePath("/superadmin/empresas");
    revalidatePath("/superadmin/locales");
    return {
      success: true,
      companyId: result.company.id,
      companyName: result.company.name,
      emailWarning: emailWarning || null
    };
  } catch (err: any) {
    console.error("Error al registrar empresa:", err);
    return {
      success: false,
      error: err.message || "No pudimos registrar la empresa. No se realizaron cambios. Inténtalo nuevamente o revisa los registros del sistema."
    };
  }
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

  if (user.password) {
    throw new Error("Este usuario ya completó su enrolamiento. Si no recuerda su contraseña, debe usar la recuperación de acceso.");
  }

  // Invalidar tokens previos de activación
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
      metadata: JSON.stringify({ email: user.email, expiresAt: expiresAt.toISOString() })
    }
  });

  revalidatePath("/superadmin/usuarios");
  revalidatePath(`/superadmin/empresas/${user.companyId}`);
  return { success: true };
}

// 3. Modificar Empresa (Requisito 6)
export async function updateCompanyAction(companyId: string, data: {
  name: string;
  internalNotes?: string;
  isActive: boolean;
  empresasLicense?: {
    planCode: ProductPlanCode;
    status: ProductLicenseStatus;
    includedIdentities: number;
    authorizedExtraIdentities: number;
    startsAt?: string;
    expiresAt?: string;
  };
  localLicense?: {
    planCode: ProductPlanCode;
    status: ProductLicenseStatus;
    includedCampaigns: number;
    includedBranches: number;
    includedTouchpoints: number;
    startsAt?: string;
    expiresAt?: string;
  };
}) {
  try {
    const superadmin = await requireSuperAdmin();

    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });
    if (!company) {
      return { success: false, error: "Empresa no encontrada." };
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Sincronizar legacy si se provee Empresas, de lo contrario desactivada/cero si es local-only
      const legacyPlan = data.empresasLicense ? mapPlanCodeToLegacyPlan(data.empresasLicense.planCode) : company.plan;
      const legacyMaxId = data.empresasLicense ? Number(data.empresasLicense.includedIdentities) : 0;
      const legacyStatus = data.empresasLicense ? mapLicenseStatusToLegacyStatus(data.empresasLicense.status) : "CANCELLED";

      // 1. Actualizar empresa
      const comp = await tx.company.update({
        where: { id: companyId },
        data: {
          name: data.name.trim(),
          plan: legacyPlan,
          maxIdentities: legacyMaxId,
          licenseStatus: legacyStatus,
          internalNotes: data.internalNotes,
          isActive: data.isActive,
        }
      });

      // 2. Upsert licencia de Empresas
      if (data.empresasLicense) {
        await tx.companyProductLicense.upsert({
          where: {
            companyId_product: {
              companyId,
              product: "EMPRESAS"
            }
          },
          update: {
            planCode: data.empresasLicense.planCode,
            status: data.empresasLicense.status,
            includedIdentities: Number(data.empresasLicense.includedIdentities),
            authorizedExtraIdentities: Number(data.empresasLicense.authorizedExtraIdentities),
            startsAt: data.empresasLicense.startsAt ? new Date(data.empresasLicense.startsAt) : null,
            expiresAt: data.empresasLicense.expiresAt ? new Date(data.empresasLicense.expiresAt) : null,
            notes: data.internalNotes
          },
          create: {
            companyId,
            product: "EMPRESAS",
            planCode: data.empresasLicense.planCode,
            status: data.empresasLicense.status,
            includedIdentities: Number(data.empresasLicense.includedIdentities),
            authorizedExtraIdentities: Number(data.empresasLicense.authorizedExtraIdentities),
            startsAt: data.empresasLicense.startsAt ? new Date(data.empresasLicense.startsAt) : null,
            expiresAt: data.empresasLicense.expiresAt ? new Date(data.empresasLicense.expiresAt) : null,
            notes: data.internalNotes
          }
        });
      }

      // 3. Upsert licencia Local
      if (data.localLicense) {
        await tx.companyProductLicense.upsert({
          where: {
            companyId_product: {
              companyId,
              product: "LOCAL"
            }
          },
          update: {
            planCode: data.localLicense.planCode,
            status: data.localLicense.status,
            includedCampaigns: Number(data.localLicense.includedCampaigns),
            includedBranches: Number(data.localLicense.includedBranches),
            includedTouchpoints: Number(data.localLicense.includedTouchpoints),
            startsAt: data.localLicense.startsAt ? new Date(data.localLicense.startsAt) : null,
            expiresAt: data.localLicense.expiresAt ? new Date(data.localLicense.expiresAt) : null,
            notes: data.internalNotes
          },
          create: {
            companyId,
            product: "LOCAL",
            planCode: data.localLicense.planCode,
            status: data.localLicense.status,
            includedCampaigns: Number(data.localLicense.includedCampaigns),
            includedBranches: Number(data.localLicense.includedBranches),
            includedTouchpoints: Number(data.localLicense.includedTouchpoints),
            startsAt: data.localLicense.startsAt ? new Date(data.localLicense.startsAt) : null,
            expiresAt: data.localLicense.expiresAt ? new Date(data.localLicense.expiresAt) : null,
            notes: data.internalNotes
          }
        });
      }

      await tx.adminAuditLog.create({
        data: {
          actorUserId: superadmin.id,
          action: "COMPANY_UPDATE",
          entityType: "COMPANY",
          entityId: company.id,
          companyId: company.id,
          metadata: JSON.stringify({
            isActiveBefore: company.isActive,
            isActiveAfter: data.isActive,
            licenseBefore: company.licenseStatus
          })
        }
      });

      return comp;
    });

    revalidatePath("/superadmin/empresas");
    revalidatePath(`/superadmin/empresas/${companyId}`);
    return {
      success: true,
      companyId: updated.id,
      companyName: updated.name
    };
  } catch (err: any) {
    console.error("Error al actualizar empresa:", err);
    return {
      success: false,
      error: err.message || "Error al actualizar la organización."
    };
  }
}

// 4. Registrar Integrante Administrativo Adicional
export async function createAdminUserAction(data: {
  companyId: string;
  name: string;
  email: string;
  passwordPlain: string;
}) {
  try {
    const superadmin = await requireSuperAdmin();

    const emailNorm = data.email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email: emailNorm }
    });
    if (existingUser) {
      return { success: false, error: "El correo electrónico ya está registrado." };
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
    return {
      success: true,
      userId: newUser.id,
      email: newUser.email
    };
  } catch (err: any) {
    console.error("Error al registrar administrador:", err);
    return {
      success: false,
      error: err.message || "Error al registrar al administrador."
    };
  }
}

// 5. Modificar Rol y Estado de Usuario (Requisito 7)
export async function updateUserRoleAndStatusAction(userId: string, data: {
  isActive: boolean;
  role: UserRole;
  companyId: string;
}) {
  try {
    const superadmin = await requireSuperAdmin();

    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!targetUser) {
      return { success: false, error: "Usuario no encontrado." };
    }

    if (data.role === UserRole.SUPERADMIN && targetUser.role !== UserRole.SUPERADMIN) {
      return { success: false, error: "No es posible asignar el rol SUPERADMIN desde este formulario." };
    }

    const enrollmentPending = !targetUser.password;
    const effectiveIsActive = data.isActive && !enrollmentPending;
    const newStatus = !data.isActive ? "SUSPENDED" : enrollmentPending ? "PENDING" : "ACTIVE";

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: effectiveIsActive,
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
    return {
      success: true,
      userId: updated.id,
      email: updated.email,
      enrollmentPending
    };
  } catch (err: any) {
    console.error("Error al modificar usuario:", err);
    return {
      success: false,
      error: err.message || "Error al modificar el usuario."
    };
  }
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

// 10. Obtener cantidad de licencias LOCAL_FUNDADOR activas (Fase 5.1)
export async function getActiveLocalFounderLicensesCountAction(): Promise<number> {
  const admin = await requireSuperAdmin();
  const count = await prisma.companyProductLicense.count({
    where: {
      product: "LOCAL",
      planCode: "LOCAL_FUNDADOR",
      status: "ACTIVE"
    }
  });
  return count;
}

// 11. Registrar Tarjeta Física NFC (Fase 5.2 - Inventario Superadmin)
export async function registerPhysicalCardSuperadminAction(data: {
  token?: string;
  companyId: string;
  status?: "PENDIENTE_GRABACION" | "GRABADA" | "ENVIADA" | "ENTREGADA" | "ACTIVA" | "SUSPENDIDA";
  batchCode?: string;
}) {
  try {
    const superadmin = await requireSuperAdmin();

    if (!data.companyId) {
      return { success: false, error: "Debe seleccionar una empresa para asociar la tarjeta." };
    }

    const companyExists = await prisma.company.findUnique({
      where: { id: data.companyId }
    });
    if (!companyExists) {
      return { success: false, error: "La empresa seleccionada no existe." };
    }

    // Generar o sanitizar token único e opaco
    const rawToken = data.token ? data.token.trim().toLowerCase() : "";
    const finalToken = rawToken || crypto.randomBytes(8).toString("hex");

    if (!/^[a-zA-Z0-9_-]+$/.test(finalToken)) {
      return { success: false, error: "El token debe contener solo caracteres alfanuméricos válidos." };
    }

    // Validar token único
    const existingToken = await prisma.physicalNfcCard.findUnique({
      where: { token: finalToken }
    });
    if (existingToken) {
      return { success: false, error: "El token ingresado ya existe en la base de datos." };
    }

    const cardStatus = data.status || "ENTREGADA";

    const newCard = await prisma.physicalNfcCard.create({
      data: {
        token: finalToken,
        companyId: data.companyId,
        status: cardStatus as any,
        batchCode: data.batchCode ? data.batchCode.trim() : null,
        deliveredAt: cardStatus === "ENTREGADA" || cardStatus === "ACTIVA" ? new Date() : null,
        activatedAt: cardStatus === "ACTIVA" ? new Date() : null
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        actorUserId: superadmin.id,
        action: "PHYSICAL_CARD_REGISTERED",
        entityType: "PHYSICAL_CARD",
        entityId: newCard.id,
        companyId: data.companyId,
        metadata: JSON.stringify({
          token: finalToken,
          status: cardStatus,
          companyId: data.companyId
        })
      }
    });

    revalidatePath("/superadmin/tarjetas");
    revalidatePath(`/superadmin/empresas/${data.companyId}`);
    return {
      success: true,
      cardId: newCard.id,
      token: newCard.token
    };
  } catch (err: any) {
    console.error("Error al registrar tarjeta física:", err);
    return {
      success: false,
      error: err.message || "Error interno al registrar la tarjeta física."
    };
  }
}

// 12. Reasignar Empresa de Tarjeta Física (Fase 5.2 - Inventario Superadmin)
export async function assignPhysicalCardSuperadminAction(data: {
  cardPhysicalId: string;
  targetCompanyId: string;
}) {
  try {
    const superadmin = await requireSuperAdmin();

    const physicalCard = await prisma.physicalNfcCard.findUnique({
      where: { id: data.cardPhysicalId }
    });
    if (!physicalCard) {
      return { success: false, error: "Tarjeta física no encontrada." };
    }

    // Regla de seguridad: Si la tarjeta está vinculada a un destino B2B o Local, no puede reasignarse directamente
    if (physicalCard.cardId || physicalCard.localTouchpointId) {
      return {
        success: false,
        error: "La tarjeta física se encuentra actualmente vinculada a un destino (B2B o Local). Primero debe desvincular el destino de forma explícita antes de cambiar de empresa."
      };
    }

    const targetCompany = await prisma.company.findUnique({
      where: { id: data.targetCompanyId }
    });
    if (!targetCompany) {
      return { success: false, error: "La empresa destino no existe." };
    }

    const updated = await prisma.physicalNfcCard.update({
      where: { id: data.cardPhysicalId },
      data: {
        companyId: data.targetCompanyId
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        actorUserId: superadmin.id,
        action: "PHYSICAL_CARD_REASSIGNED_COMPANY",
        entityType: "PHYSICAL_CARD",
        entityId: updated.id,
        companyId: data.targetCompanyId,
        metadata: JSON.stringify({
          cardPhysicalId: updated.id,
          previousCompanyId: physicalCard.companyId,
          newCompanyId: data.targetCompanyId
        })
      }
    });

    revalidatePath("/superadmin/tarjetas");
    revalidatePath(`/superadmin/empresas/${physicalCard.companyId}`);
    revalidatePath(`/superadmin/empresas/${data.targetCompanyId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al reasignar tarjeta física:", err);
    return {
      success: false,
      error: err.message || "Error interno al reasignar tarjeta física."
    };
  }
}

// 13. Desvincular Destino de Tarjeta Física desde Superadmin (Fase 5.2)
export async function disassociatePhysicalCardSuperadminAction(cardPhysicalId: string) {
  try {
    const superadmin = await requireSuperAdmin();

    const physicalCard = await prisma.physicalNfcCard.findUnique({
      where: { id: cardPhysicalId }
    });
    if (!physicalCard) {
      return { success: false, error: "Tarjeta física no encontrada." };
    }

    if (!physicalCard.cardId && !physicalCard.localTouchpointId) {
      return { success: false, error: "La tarjeta física no tiene un destino vinculado." };
    }

    const previousCardId = physicalCard.cardId;
    const previousTouchpointId = physicalCard.localTouchpointId;

    const updated = await prisma.physicalNfcCard.update({
      where: { id: cardPhysicalId },
      data: {
        cardId: null,
        localTouchpointId: null
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        actorUserId: superadmin.id,
        action: "PHYSICAL_CARD_DESASSOCIATED_DESTINATION",
        entityType: "PHYSICAL_CARD",
        entityId: updated.id,
        companyId: physicalCard.companyId,
        metadata: JSON.stringify({
          cardPhysicalId: updated.id,
          previousCardId,
          previousTouchpointId
        })
      }
    });

    revalidatePath("/superadmin/tarjetas");
    revalidatePath(`/superadmin/empresas/${physicalCard.companyId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al desvincular destino de tarjeta física:", err);
    return {
      success: false,
      error: err.message || "Error interno al desvincular destino."
    };
  }
}
