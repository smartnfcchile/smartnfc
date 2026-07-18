// app/dashboard/local/actions.ts
"use server";

import { prisma } from "../../../lib/prisma";
import { requireCompanyAdmin } from "../../../lib/permissions";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { headers } from "next/headers";
import {
  createCampaignSchema,
  updateCampaignSchema,
  publicSubscriptionSchema,
  normalizeChileanWhatsApp
} from "../../../lib/validations/local";

// 1. Crear Campaña Local (Requisito 5)
export async function createLocalCampaignAction(payload: { name: string; slug: string }) {
  const admin = await requireCompanyAdmin();

  // Validar entrada
  const validated = createCampaignSchema.parse(payload);

  // Validar unicidad del slug en base de datos
  const existing = await prisma.localCampaign.findUnique({
    where: { slug: validated.slug }
  });
  if (existing) {
    throw new Error("El identificador URL (slug) ya está registrado en el sistema. Elige otro.");
  }

  // Crear campaña con Touchpoint "Principal" inicial en una transacción
  const campaign = await prisma.$transaction(async (tx) => {
    return await tx.localCampaign.create({
      data: {
        companyId: admin.companyId,
        name: validated.name.trim(),
        slug: validated.slug.trim().toLowerCase(),
        status: "DRAFT",
        template: "URBAN",
        touchpoints: {
          create: {
            name: "Principal",
            code: crypto.randomBytes(16).toString("hex"),
            isActive: true
          }
        }
      }
    });
  });

  // Auditoría
  await prisma.adminAuditLog.create({
    data: {
      actorUserId: admin.id,
      action: "LOCAL_CAMPAIGN_CREATE",
      entityType: "LOCAL_CAMPAIGN",
      entityId: campaign.id,
      companyId: admin.companyId,
      metadata: JSON.stringify({ name: campaign.name, slug: campaign.slug })
    }
  });

  revalidatePath("/dashboard/local");
  return { success: true, campaign };
}

// 2. Actualizar Campaña Local (Requisito 5)
export async function updateLocalCampaignAction(campaignId: string, payload: any) {
  const admin = await requireCompanyAdmin();

  // Validar entrada
  const validated = updateCampaignSchema.parse(payload);

  // Normalizar el número de WhatsApp si está provisto
  const normalizedWhatsapp = validated.whatsappNumber 
    ? normalizeChileanWhatsApp(validated.whatsappNumber) 
    : validated.whatsappNumber;

  // Actualizar campaña garantizando aislamiento multiempresa (Requisito 3)
  const campaign = await prisma.localCampaign.update({
    where: {
      id: campaignId,
      companyId: admin.companyId // Filtro estricto simultáneo
    },
    data: {
      name: validated.name,
      logoUrl: validated.logoUrl,
      primaryColor: validated.primaryColor,
      secondaryColor: validated.secondaryColor,
      businessName: validated.businessName,
      clubName: validated.clubName,
      headline: validated.headline,
      subheadline: validated.subheadline,
      address: validated.address,
      whatsappNumber: normalizedWhatsapp,
      whatsappMessage: validated.whatsappMessage,
      benefitLabel: validated.benefitLabel,
      benefitTitle: validated.benefitTitle,
      benefitDescription: validated.benefitDescription,
      benefitConditions: validated.benefitConditions,
      benefitStartAt: validated.benefitStartAt,
      benefitEndAt: validated.benefitEndAt,
      consentText: validated.consentText
    }
  });

  // Auditoría
  await prisma.adminAuditLog.create({
    data: {
      actorUserId: admin.id,
      action: "LOCAL_CAMPAIGN_UPDATE",
      entityType: "LOCAL_CAMPAIGN",
      entityId: campaignId,
      companyId: admin.companyId
    }
  });

  revalidatePath(`/dashboard/local/campanas/${campaignId}`);
  return { success: true, campaign };
}

// 3. Publicar Campaña Local (Requisito 5)
export async function publishLocalCampaignAction(campaignId: string) {
  const admin = await requireCompanyAdmin();

  // Buscar campaña con aislamiento multiempresa
  const campaign = await prisma.localCampaign.findFirst({
    where: {
      id: campaignId,
      companyId: admin.companyId
    }
  });

  if (!campaign) {
    throw new Error("Campaña no encontrada o acceso denegado.");
  }

  // Validar campos obligatorios requeridos para publicar
  if (!campaign.businessName || !campaign.clubName || !campaign.benefitTitle || !campaign.benefitDescription || !campaign.whatsappNumber || !campaign.consentText) {
    throw new Error("No es posible publicar. Debes completar el nombre comercial, el club, el título/descripción del beneficio, el número de WhatsApp y el texto de consentimiento legal.");
  }

  // Construir el snapshot explícito en el servidor (Requisito 5)
  const snapshot = {
    schemaVersion: 1,
    name: campaign.name,
    logoUrl: campaign.logoUrl,
    primaryColor: campaign.primaryColor,
    secondaryColor: campaign.secondaryColor,
    businessName: campaign.businessName,
    clubName: campaign.clubName,
    headline: campaign.headline,
    subheadline: campaign.subheadline,
    address: campaign.address,
    whatsappNumber: campaign.whatsappNumber,
    whatsappMessage: campaign.whatsappMessage,
    benefitLabel: campaign.benefitLabel,
    benefitTitle: campaign.benefitTitle,
    benefitDescription: campaign.benefitDescription,
    benefitConditions: campaign.benefitConditions,
    benefitStartAt: campaign.benefitStartAt ? campaign.benefitStartAt.toISOString() : null,
    benefitEndAt: campaign.benefitEndAt ? campaign.benefitEndAt.toISOString() : null,
    consentText: campaign.consentText,
    consentVersion: campaign.consentVersion
  };

  // Actualizar estado e incrementar versión publicada
  const updated = await prisma.localCampaign.update({
    where: { id: campaign.id },
    data: {
      status: "PUBLISHED",
      isPublished: true,
      publishedSnapshot: snapshot,
      publishedVersion: { increment: 1 },
      publishedAt: new Date()
    }
  });

  // Auditoría
  await prisma.adminAuditLog.create({
    data: {
      actorUserId: admin.id,
      action: "LOCAL_CAMPAIGN_PUBLISH",
      entityType: "LOCAL_CAMPAIGN",
      entityId: campaign.id,
      companyId: admin.companyId,
      metadata: JSON.stringify({ version: updated.publishedVersion })
    }
  });

  revalidatePath(`/dashboard/local/campanas/${campaignId}`);
  return { success: true, campaign: updated };
}

// 4. Archivar Campaña Local (Requisito 5)
export async function archiveLocalCampaignAction(campaignId: string) {
  const admin = await requireCompanyAdmin();

  // Actualizar estado a ARCHIVED con aislamiento multiempresa
  const campaign = await prisma.localCampaign.update({
    where: {
      id: campaignId,
      companyId: admin.companyId
    },
    data: {
      status: "ARCHIVED",
      isActive: false
    }
  });

  // Auditoría
  await prisma.adminAuditLog.create({
    data: {
      actorUserId: admin.id,
      action: "LOCAL_CAMPAIGN_ARCHIVE",
      entityType: "LOCAL_CAMPAIGN",
      entityId: campaignId,
      companyId: admin.companyId
    }
  });

  revalidatePath("/dashboard/local");
  return { success: true, campaign };
}

// 5. Suscripción Pública (Requisito 6)
export async function subscribeToCampaignAction(slug: string, payload: any) {
  // Validar payload con el schema de suscripción
  const validated = publicSubscriptionSchema.parse(payload);

  // Honeypot Check
  if (validated.honeypot) {
    return { success: false, error: "Inscripción no autorizada." };
  }

  // Buscar campaña y comprobar que esté publicada y activa
  const campaign = await prisma.localCampaign.findUnique({
    where: { slug }
  });

  if (!campaign || campaign.status !== "PUBLISHED" || !campaign.isActive) {
    return { success: false, error: "La campaña no está disponible." };
  }

  // Resolver touchpoint si se provee código público
  let touchpointId: string | null = null;
  if (validated.touchpointCode) {
    const tp = await prisma.localTouchpoint.findUnique({
      where: { code: validated.touchpointCode }
    });
    if (tp && tp.campaignId === campaign.id && tp.isActive) {
      touchpointId = tp.id;
    }
  }

  // Capturar IP Hash, UA y Referer del servidor de Next.js
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "127.0.0.1";
  const userAgent = headersList.get("user-agent") || "";
  const referer = headersList.get("referer") || "";
  // Hash Ip Reutilizando algoritmo seguro (SHA-256)
  const ipHash = crypto.createHash("sha256").update(ip.split(",")[0].trim()).digest("hex");

  // Transacción segura e idempotente (Requisito 6)
  await prisma.$transaction(async (tx) => {
    // Buscar si ya está registrado
    const existing = await tx.localSubscriber.findUnique({
      where: {
        campaignId_whatsapp: {
          campaignId: campaign.id,
          whatsapp: validated.whatsapp
        }
      },
      include: {
        consentRecords: {
          orderBy: { acceptedAt: "desc" },
          take: 1
        }
      }
    });

    let subscriberId: string;

    if (existing) {
      subscriberId = existing.id;
      // Actualizar datos del suscriptor
      await tx.localSubscriber.update({
        where: { id: existing.id },
        data: {
          name: validated.name.trim(),
          lastInteractionAt: new Date(),
          status: "ACTIVE" // Reactivar por si estaba cancelado
        }
      });

      // Crear nuevo registro de consentimiento si cambió de versión
      const latestConsent = existing.consentRecords[0];
      if (!latestConsent || latestConsent.consentVersion !== campaign.consentVersion) {
        await tx.localConsentRecord.create({
          data: {
            subscriberId: existing.id,
            campaignId: campaign.id,
            consentVersion: campaign.consentVersion,
            consentText: campaign.consentText || "Consentimiento aceptado",
            ipHash,
            userAgent,
            source: touchpointId ? "NFC_QR" : "DIRECT"
          }
        });
      }
    } else {
      // Crear nuevo suscriptor y consentimiento
      const created = await tx.localSubscriber.create({
        data: {
          campaignId: campaign.id,
          name: validated.name.trim(),
          whatsapp: validated.whatsapp,
          status: "ACTIVE",
          consentRecords: {
            create: {
              campaignId: campaign.id,
              consentVersion: campaign.consentVersion,
              consentText: campaign.consentText || "Consentimiento aceptado",
              ipHash,
              userAgent,
              source: touchpointId ? "NFC_QR" : "DIRECT"
            }
          }
        }
      });
      subscriberId = created.id;
    }

    // Registrar el evento de conversión
    await tx.localEvent.create({
      data: {
        campaignId: campaign.id,
        touchpointId,
        subscriberId,
        eventType: "SUBSCRIPTION",
        ipHash,
        userAgent,
        referer
      }
    });
  });

  // Retornar datos mínimos para el enlace de WhatsApp público (Requisito 6)
  let bizWhatsapp = campaign.whatsappNumber || "";
  let bizMsg = campaign.whatsappMessage || "";

  if (campaign.publishedSnapshot) {
    const snap = campaign.publishedSnapshot as any;
    bizWhatsapp = snap.whatsappNumber || bizWhatsapp;
    bizMsg = snap.whatsappMessage || bizMsg;
  }

  return {
    success: true,
    businessWhatsapp: bizWhatsapp,
    whatsappMessage: bizMsg
  };
}
