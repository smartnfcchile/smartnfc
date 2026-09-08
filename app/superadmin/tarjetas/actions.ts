"use server";

import crypto from "crypto";
import React from "react";
import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "../../../lib/prisma";
import { requireSuperAdmin } from "../../../lib/permissions";
import { canCreateIdentity } from "../../../lib/product-access";
import { sendEmail } from "../../../lib/email/send-email";
import UserInvitationEmail from "../../../emails/UserInvitationEmail";

type NfcStatus = "PENDIENTE_GRABACION" | "GRABADA" | "ENVIADA" | "ENTREGADA" | "ACTIVA" | "SUSPENDIDA";
type NewOwnerRole = "COMPANY_ADMIN" | "COLLABORATOR";

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function resolveUniqueSlug(requestedSlug: string) {
  const normalized = normalizeSlug(requestedSlug).slice(0, 80);
  if (!normalized) throw new Error("El enlace personalizado no es válido.");

  let candidate = normalized;
  let suffix = 2;
  while (await prisma.card.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    const suffixText = `-${suffix}`;
    candidate = `${normalized.slice(0, Math.max(1, 80 - suffixText.length))}${suffixText}`;
    suffix += 1;
  }
  return candidate;
}

export async function createCorporateCardSuperadminAction(data: {
  companyId: string;
  cardName: string;
  slug: string;
  ownerId?: string;
  newOwnerName?: string;
  newOwnerEmail?: string;
  newOwnerRole?: NewOwnerRole;
  token?: string;
  status?: NfcStatus;
  batchCode?: string;
}) {
  try {
    const superadmin = await requireSuperAdmin();

    const company = await prisma.company.findUnique({
      where: { id: data.companyId },
      select: { id: true, name: true },
    });
    if (!company) return { success: false, error: "La empresa seleccionada no existe." };

    if (!(await canCreateIdentity(company.id))) {
      return { success: false, error: "La empresa alcanzó el límite de perfiles activos de su licencia." };
    }

    const cardName = data.cardName.trim();
    if (cardName.length < 2 || cardName.length > 120) {
      return { success: false, error: "El nombre de la tarjeta debe tener entre 2 y 120 caracteres." };
    }

    if (!data.ownerId && (!data.newOwnerName?.trim() || !data.newOwnerEmail?.trim())) {
      return { success: false, error: "Selecciona una persona existente o completa los datos de la nueva persona." };
    }

    let owner = data.ownerId
      ? await prisma.user.findUnique({ where: { id: data.ownerId } })
      : null;

    if (owner && owner.companyId !== company.id) {
      return { success: false, error: "La persona seleccionada no pertenece a esta empresa." };
    }

    const newOwnerEmail = data.newOwnerEmail?.trim().toLowerCase();
    const newOwnerRole: NewOwnerRole = data.newOwnerRole === "COMPANY_ADMIN" ? "COMPANY_ADMIN" : "COLLABORATOR";

    if (!owner && newOwnerEmail) {
      const duplicateEmail = await prisma.user.findUnique({
        where: { email: newOwnerEmail },
        select: { id: true },
      });
      if (duplicateEmail) return { success: false, error: "El correo de la nueva persona ya está registrado." };
    }

    const slug = await resolveUniqueSlug(data.slug);
    const rawToken = data.token?.trim().toLowerCase() || "";
    const finalToken = rawToken || crypto.randomBytes(8).toString("hex");
    if (!/^[a-zA-Z0-9_-]+$/.test(finalToken)) {
      return { success: false, error: "El código del chip contiene caracteres no válidos." };
    }
    const existingToken = await prisma.physicalNfcCard.findUnique({
      where: { token: finalToken },
      select: { id: true },
    });
    if (existingToken) return { success: false, error: "El código del chip ya está registrado." };

    const activationToken = owner ? null : crypto.randomBytes(32).toString("hex");
    const activationTokenHash = activationToken
      ? crypto.createHash("sha256").update(activationToken).digest("hex")
      : null;
    const status: NfcStatus = data.status || "PENDIENTE_GRABACION";

    const result = await prisma.$transaction(async (tx) => {
      if (!owner) {
        owner = await tx.user.create({
          data: {
            name: data.newOwnerName!.trim(),
            email: newOwnerEmail!,
            role: newOwnerRole === "COMPANY_ADMIN" ? UserRole.COMPANY_ADMIN : UserRole.COLLABORATOR,
            companyId: company.id,
            isActive: false,
            status: "PENDING",
          },
        });

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);
        await tx.userActivationToken.create({
          data: { userId: owner.id, tokenHash: activationTokenHash!, expiresAt },
        });
      }

      const digitalCard = await tx.card.create({
        data: {
          name: cardName,
          slug,
          profileName: owner.name || cardName,
          companyName: company.name,
          userId: owner.id,
          companyId: company.id,
        },
      });

      const physicalCard = await tx.physicalNfcCard.create({
        data: {
          token: finalToken,
          companyId: company.id,
          cardId: digitalCard.id,
          status,
          batchCode: data.batchCode?.trim() || null,
          deliveredAt: status === "ENTREGADA" || status === "ACTIVA" ? new Date() : null,
          activatedAt: status === "ACTIVA" ? new Date() : null,
        },
      });

      await tx.adminAuditLog.create({
        data: {
          actorUserId: superadmin.id,
          action: "CORPORATE_CARD_CREATED",
          entityType: "PHYSICAL_CARD",
          entityId: physicalCard.id,
          companyId: company.id,
          metadata: JSON.stringify({
            physicalCardId: physicalCard.id,
            digitalCardId: digitalCard.id,
            ownerId: owner.id,
            ownerRole: owner.role,
            slug,
            invitedOwner: Boolean(activationToken),
          }),
        },
      });

      return { physicalCard, digitalCard, owner };
    });

    let emailWarning: string | null = null;
    if (activationToken) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const emailRes = await sendEmail({
        to: result.owner.email,
        subject: "Activa tu cuenta de Smart NFC",
        react: React.createElement(UserInvitationEmail, {
          name: result.owner.name || "Usuario",
          companyName: company.name,
          role: result.owner.role,
          activationUrl: `${appUrl}/activar-cuenta?token=${activationToken}`,
        }),
      });
      if (!emailRes.success) {
        emailWarning = "La tarjeta y el perfil fueron creados, pero no fue posible enviar la invitación. Puedes reenviarla desde Usuarios.";
      }
    }

    revalidatePath("/superadmin/tarjetas");
    revalidatePath("/superadmin/usuarios");
    revalidatePath(`/superadmin/empresas/${company.id}`);

    return {
      success: true,
      physicalCardId: result.physicalCard.id,
      digitalCardId: result.digitalCard.id,
      token: result.physicalCard.token,
      slug: result.digitalCard.slug,
      ownerRole: result.owner.role,
      emailWarning,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "No fue posible crear la tarjeta.";
    console.error("Error al crear tarjeta corporativa:", err);
    return { success: false, error: message };
  }
}
