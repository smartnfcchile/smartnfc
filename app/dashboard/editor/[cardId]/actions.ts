"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";
import { requireCompanyAdmin, assertCardBelongsToCompany } from "../../../../lib/permissions";
import { normalizeTemplate, normalizePhotoStyle, normalizeBannerStyle } from "../../../../lib/templates";

// 1. EL MOTOR DE GUARDADO (Server Action)
export async function updateCard(formData: FormData) {
  try {
    const cardId = formData.get("cardId") as string;
  
  const admin = await requireCompanyAdmin();
  if (admin.role !== "SUPERADMIN") {
    await assertCardBelongsToCompany(cardId, admin.companyId);
  }
  
  const profileName = formData.get("profileName") as string;
  const role = formData.get("role") as string;
  const companyName = formData.get("companyName") as string;
  const bio = formData.get("bio") as string;
  const themeColor = formData.get("themeColor") as string;
  const themeMode = formData.get("themeMode") as string;
  const rawTemplate = formData.get("template") as string;
  const template = normalizeTemplate(rawTemplate);
  const bannerStyle = normalizeBannerStyle(formData.get("bannerStyle") as string, rawTemplate);
  const photoStyle = normalizePhotoStyle(formData.get("photoStyle") as string);
  const whatsapp = formData.get("whatsapp") as string; 
  const email = formData.get("email") as string; 
  const linkedin = formData.get("linkedin") as string;
  const phone = formData.get("phone") as string;
  const location = formData.get("location") as string;

  const instagram = formData.get("instagram") as string;
  const facebook = formData.get("facebook") as string;
  const tiktok = formData.get("tiktok") as string;
  const youtube = formData.get("youtube") as string;

  const showEmail = formData.get("showEmail") === "on";
  const showPhone = formData.get("showPhone") === "on";
  const showWhatsapp = formData.get("showWhatsapp") === "on";
  const showInstagram = formData.get("showInstagram") === "on";
  const showFacebook = formData.get("showFacebook") === "on";
  const showLinkedin = formData.get("showLinkedin") === "on";
  const showTiktok = formData.get("showTiktok") === "on";
  const showYoutube = formData.get("showYoutube") === "on";

  // Compárteme tus datos settings
  const shareContactEnabled = formData.get("shareContactEnabled") === "on";
  const shareContactButtonText = formData.get("shareContactButtonText") as string || "Compárteme tus datos";
  const shareContactIntro = formData.get("shareContactIntro") as string || "Déjame tus datos para mantenernos en contacto.";
  const shareContactConfirm = formData.get("shareContactConfirm") as string || "¡Gracias! Tus datos fueron enviados correctamente.";
  const shareContactConsent = formData.get("shareContactConsent") as string || "Acepto el tratamiento de mis datos personales para fines de contacto comercial.";
  const primaryActionType = formData.get("primaryActionType") as string || "WHATSAPP";
  const secondaryActionType = formData.get("secondaryActionType") as string || "SAVE_CONTACT";

  const shareContactFieldsInput = formData.get("shareContactFields") as string;
  let shareContactFields = null;
  if (shareContactFieldsInput) {
    try {
      shareContactFields = JSON.parse(shareContactFieldsInput);
    } catch {
      // Fallback
    }
  }

  // 1.5. Validaciones Zod de CTA
  const ActionTypeSchema = z.enum(["WHATSAPP", "PHONE", "EMAIL", "SAVE_CONTACT", "CRM_FORM", "NONE"]);

  try {
    const ctaData = {
      primaryActionType,
      secondaryActionType,
      shareContactEnabled,
      whatsapp: whatsapp || null,
      showWhatsapp,
      phone: phone || null,
      showPhone,
      email: email || null,
      showEmail,
    };

    z.object({
      primaryActionType: ActionTypeSchema,
      secondaryActionType: ActionTypeSchema,
      shareContactEnabled: z.boolean(),
      whatsapp: z.string().optional().nullable(),
      showWhatsapp: z.boolean(),
      phone: z.string().optional().nullable(),
      showPhone: z.boolean(),
      email: z.string().optional().nullable(),
      showEmail: z.boolean(),
    }).refine(data => {
      // Impide guardar la misma acción para primaria y secundaria, salvo NONE
      if (data.primaryActionType === data.secondaryActionType && data.primaryActionType !== "NONE") {
        return false;
      }
      return true;
    }, {
      message: "La acción primaria y secundaria no pueden ser la misma, excepto si es 'Ninguna (NONE)'",
      path: ["secondaryActionType"]
    }).refine(data => {
      // Impide guardar CRM_FORM si la captura está desactivada
      if ((data.primaryActionType === "CRM_FORM" || data.secondaryActionType === "CRM_FORM") && !data.shareContactEnabled) {
        return false;
      }
      return true;
    }, {
      message: "No se puede seleccionar 'Formulario de Captura (CRM_FORM)' si la captura de prospectos está desactivada.",
      path: ["primaryActionType"]
    }).refine(data => {
      // WHATSAPP sin número válido y visible
      if ((data.primaryActionType === "WHATSAPP" || data.secondaryActionType === "WHATSAPP") && (!data.whatsapp || !data.showWhatsapp)) {
        return false;
      }
      return true;
    }, {
      message: "Se requiere un número de WhatsApp visible para usar la acción de WhatsApp.",
      path: ["whatsapp"]
    }).refine(data => {
      // PHONE sin teléfono válido y visible
      if ((data.primaryActionType === "PHONE" || data.secondaryActionType === "PHONE") && (!data.phone || !data.showPhone)) {
        return false;
      }
      return true;
    }, {
      message: "Se requiere un número de teléfono visible para usar la acción de llamada.",
      path: ["phone"]
    }).refine(data => {
      // EMAIL sin correo válido y visible
      if ((data.primaryActionType === "EMAIL" || data.secondaryActionType === "EMAIL") && (!data.email || !data.showEmail)) {
        return false;
      }
      return true;
    }, {
      message: "Se requiere un correo electrónico visible para usar la acción de enviar correo.",
      path: ["email"]
    }).parse(ctaData);

    // Validar parámetros visuales normalizados mediante Zod
    z.object({
      template: z.enum(["classic-dark", "classic-light", "neobrutalist", "split-diagonal", "company-dark", "company-light"]),
      photoStyle: z.enum(["circle", "rounded-square", "hexagon", "no-frame"]),
      bannerStyle: z.enum(["straight", "arc", "wave"]),
    }).parse({ template, photoStyle, bannerStyle });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      throw new Error(err.issues.map((e: any) => e.message).join(" | "));
    }
    throw err;
  }

  let avatarUrl = formData.get("avatarUrl") as string;
  let logoUrl = formData.get("logoUrl") as string;
  let coverUrl = formData.get("coverUrl") as string;
  let heroImageUrl = formData.get("heroImageUrl") as string;

  // Procesamos la subida de la foto de portada (Banner)
  const coverFile = formData.get("coverFile") as File | null;
  if (coverFile && coverFile.size > 0) {
    try {
      const ext = coverFile.name.split(".").pop() || "jpg";
      const filename = `cover-${cardId}-${Date.now()}.${ext}`;

      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(filename, coverFile, {
          access: "public",
        });
        coverUrl = blob.url;
      } else {
        const bytes = await coverFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filepath = path.join(uploadDir, filename);
        await fs.promises.writeFile(filepath, buffer);
        coverUrl = `/uploads/${filename}`;
      }
    } catch (error) {
      console.error("Error al guardar Portada:", error);
    }
  }

  // Procesamos la subida de la imagen hero (Fondo)
  const heroFile = formData.get("heroImageFile") as File | null;
  if (heroFile && heroFile.size > 0) {
    try {
      const ext = heroFile.name.split(".").pop() || "jpg";
      const filename = `hero-${cardId}-${Date.now()}.${ext}`;

      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(filename, heroFile, {
          access: "public",
        });
        heroImageUrl = blob.url;
      } else {
        const bytes = await heroFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filepath = path.join(uploadDir, filename);
        await fs.promises.writeFile(filepath, buffer);
        heroImageUrl = `/uploads/${filename}`;
      }
    } catch (error) {
      console.error("Error al guardar Imagen Hero:", error);
    }
  }

  // Procesamos la subida de la foto de perfil (Avatar)
  const avatarFile = formData.get("avatarFile") as File | null;
  if (avatarFile && avatarFile.size > 0) {
    try {
      const ext = avatarFile.name.split(".").pop() || "jpg";
      const filename = `avatar-${cardId}-${Date.now()}.${ext}`;

      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(filename, avatarFile, {
          access: "public",
        });
        avatarUrl = blob.url;
      } else {
        const bytes = await avatarFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filepath = path.join(uploadDir, filename);
        await fs.promises.writeFile(filepath, buffer);
        avatarUrl = `/uploads/${filename}`;
      }
    } catch (error) {
      console.error("Error al guardar Avatar:", error);
    }
  }

  // Procesamos la subida del Logo de la empresa
  const logoFile = formData.get("logoFile") as File | null;
  if (logoFile && logoFile.size > 0) {
    try {
      const ext = logoFile.name.split(".").pop() || "png";
      const filename = `logo-${cardId}-${Date.now()}.${ext}`;

      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(filename, logoFile, {
          access: "public",
        });
        logoUrl = blob.url;
      } else {
        const bytes = await logoFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filepath = path.join(uploadDir, filename);
        await fs.promises.writeFile(filepath, buffer);
        logoUrl = `/uploads/${filename}`;
      }
    } catch (error) {
      console.error("Error al guardar Logo:", error);
    }
  }

  await prisma.card.update({
    where: { id: cardId },
    data: {
      profileName,
      role,
      companyName,
      bio,
      themeColor,
      themeMode,
      template,
      bannerStyle,
      photoStyle,
      whatsapp, 
      email, 
      phone,
      instagram,
      facebook,
      linkedin,
      tiktok,
      youtube,
      showEmail,
      showPhone,
      showWhatsapp,
      showInstagram,
      showFacebook,
      showLinkedin,
      showTiktok,
      showYoutube,
      avatarUrl,
      logoUrl,
      coverUrl,
      heroImageUrl,
      location,
      shareContactEnabled,
      shareContactButtonText,
      shareContactIntro,
      shareContactConfirm,
      shareContactConsent,
      shareContactFields: shareContactFields || undefined,
      primaryActionType,
      secondaryActionType,
    },
  });

  revalidatePath(`/dashboard/editor/${cardId}`);
  return { success: true };
  } catch (error: any) {
    console.error("Error al actualizar la tarjeta:", error);
    return { success: false, error: error.message || "Error interno del servidor" };
  }
}

// Acción para eliminar un enlace personalizado
export async function deleteLink(formData: FormData) {
  const linkId = formData.get("linkId") as string;
  const cardId = formData.get("cardId") as string;
  
  const admin = await requireCompanyAdmin();
  if (admin.role !== "SUPERADMIN") {
    await assertCardBelongsToCompany(cardId, admin.companyId);
  }

  await prisma.cardLink.delete({
    where: { id: linkId }
  });
  
  if (cardId) {
    revalidatePath(`/dashboard/editor/${cardId}`);
  }
}

// Acción para agregar un nuevo enlace personalizado
export async function addLink(formData: FormData) {
  const title = formData.get("title") as string;
  const url = formData.get("url") as string;
  const cardId = formData.get("cardId") as string;

  if (!title || !url || !cardId) return;

  const admin = await requireCompanyAdmin();
  if (admin.role !== "SUPERADMIN") {
    await assertCardBelongsToCompany(cardId, admin.companyId);
  }

  const currentLinksCount = await prisma.cardLink.count({
    where: { cardId },
  });

  await prisma.cardLink.create({
    data: {
      title,
      url,
      cardId,
      order: currentLinksCount,
      isActive: true
    }
  });

  revalidatePath(`/dashboard/editor/${cardId}`);
}
