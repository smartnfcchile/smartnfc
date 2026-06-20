"use server";

import { prisma } from "../../../../lib/prisma";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";

// 1. EL MOTOR DE GUARDADO (Server Action)
export async function updateCard(formData: FormData) {
  const cardId = formData.get("cardId") as string;
  
  const profileName = formData.get("profileName") as string;
  const role = formData.get("role") as string;
  const companyName = formData.get("companyName") as string;
  const bio = formData.get("bio") as string;
  const themeColor = formData.get("themeColor") as string;
  const themeMode = formData.get("themeMode") as string;
  const template = formData.get("template") as string;
  const bannerStyle = formData.get("bannerStyle") as string;
  const photoStyle = formData.get("photoStyle") as string;
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

  let avatarUrl = formData.get("avatarUrl") as string;
  let logoUrl = formData.get("logoUrl") as string;
  let coverUrl = formData.get("coverUrl") as string;

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
      location,
    },
  });

  revalidatePath(`/dashboard/editor/${cardId}`);
}

// Acción para eliminar un enlace personalizado
export async function deleteLink(formData: FormData) {
  const linkId = formData.get("linkId") as string;
  const cardId = formData.get("cardId") as string;
  
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
