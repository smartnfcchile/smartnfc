"use server";

import { prisma } from "../../lib/prisma";
import { requireSuperAdmin } from "../../lib/permissions";
import { UserRole, PlanType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function createCompanyAction(data: {
  name: string;
  slug: string;
  plan: PlanType;
  maxIdentities: number;
  licenseStatus: string;
  internalNotes?: string;
  adminName?: string;
  adminEmail?: string;
  adminPassword?: string;
}) {
  const superadmin = await requireSuperAdmin();

  // 1. Normalizar y validar slug
  const normalizedSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!normalizedSlug) {
    throw new Error("El identificador URL (slug) es inválido.");
  }

  // Rutas reservadas
  const reserved = ["superadmin", "dashboard", "login", "api", "t", "c", "configuracion", "editor", "leads", "metrics", "users", "cards", "qr"];
  if (reserved.includes(normalizedSlug)) {
    throw new Error("El identificador URL (slug) ingresado está reservado por el sistema.");
  }

  // Validar unicidad
  const existing = await prisma.company.findUnique({
    where: { slug: normalizedSlug }
  });
  if (existing) {
    throw new Error("El identificador URL (slug) ya está en uso por otra empresa.");
  }

  // 2. Ejecutar transacción
  const result = await prisma.$transaction(async (tx) => {
    // Crear empresa
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

    // Registrar auditoría
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

    // Crear administrador si corresponde (Alternativa B)
    let adminUser = null;
    if (data.adminEmail && data.adminName && data.adminPassword) {
      const emailNorm = data.adminEmail.trim().toLowerCase();
      const existingUser = await tx.user.findUnique({
        where: { email: emailNorm }
      });
      if (existingUser) {
        throw new Error("El correo electrónico del administrador ya está registrado.");
      }

      const hash = await bcrypt.hash(data.adminPassword, 10);
      adminUser = await tx.user.create({
        data: {
          name: data.adminName.trim(),
          email: emailNorm,
          password: hash,
          role: UserRole.COMPANY_OWNER,
          companyId: company.id,
          isActive: true
        }
      });

      // Registrar auditoría del administrador
      await tx.adminAuditLog.create({
        data: {
          actorUserId: superadmin.id,
          action: "USER_CREATE_ADMIN",
          entityType: "USER",
          entityId: adminUser.id,
          companyId: company.id,
          metadata: JSON.stringify({ email: adminUser.email, role: adminUser.role })
        }
      });
    }

    return { company, adminUser };
  });

  revalidatePath("/superadmin/empresas");
  return result;
}

export async function updateCompanyAction(companyId: string, data: {
  name: string;
  plan: PlanType;
  maxIdentities: number;
  licenseStatus: string;
  internalNotes?: string;
  isActive: boolean;
}) {
  const superadmin = await requireSuperAdmin();

  // Validar empresa
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

  // Registrar auditoría
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
      isActive: true
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

  // Prevenir despromover al superadmin actual o asignar superadmin libremente
  if (data.role === UserRole.SUPERADMIN && targetUser.role !== UserRole.SUPERADMIN) {
    throw new Error("No es posible asignar el rol SUPERADMIN desde este formulario.");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: data.isActive,
      role: data.role,
      companyId: data.companyId
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
