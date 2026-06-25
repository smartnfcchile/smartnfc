// app/dashboard/users/actions.ts
"use server";

import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

export async function createVendorUser(
  name: string,
  email: string,
  passwordPlain: string,
  sendEmail: boolean
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("No autorizado");
  }

  const admin = session.user as any;
  const isAdmin = admin.role === "SUPERADMIN" || admin.role === "CLIENT_ADMIN";

  if (!isAdmin) {
    throw new Error("Solo los administradores pueden crear vendedores.");
  }

  // 1. Validar que el correo no esté registrado
  const existingUser = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (existingUser) {
    throw new Error("Este correo electrónico ya está registrado en la plataforma.");
  }

  // 2. Encriptar contraseña
  const passwordHash = await bcrypt.hash(passwordPlain, 10);

  // 3. Crear usuario
  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: passwordHash,
      role: "USER",
      companyId: admin.companyId,
    },
  });

  // 4. Envío de Correo (Resend)
  if (sendEmail) {
    const resendApiKey = process.env.RESEND_API_KEY;
    const loginUrl = `${process.env.NEXTAUTH_URL || "https://smartnfc-one.vercel.app"}/login`;

    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: "onboarding@resend.dev", // Reemplazar con dominio verificado cuando compren el dominio
          to: newUser.email,
          subject: "Bienvenido a SmartNFC - Tus Credenciales de Acceso",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
              <h2 style="color: #2563eb;">¡Bienvenido a SmartNFC, ${newUser.name}!</h2>
              <p>El administrador de tu empresa ha creado tu cuenta de vendedor. Aquí tienes tus credenciales de acceso:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Enlace de Acceso:</td>
                  <td style="padding: 8px 0;"><a href="${loginUrl}">${loginUrl}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Correo Electrónico:</td>
                  <td style="padding: 8px 0;">${newUser.email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #475569;">Contraseña Temporal:</td>
                  <td style="padding: 8px 0; font-family: monospace; font-size: 14px; font-weight: bold; background: #f1f5f9; padding: 4px 8px; border-radius: 4px;">${passwordPlain}</td>
                </tr>
              </table>
              <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
                Por seguridad, te recomendamos iniciar sesión y no compartir estas credenciales con nadie.
              </p>
            </div>
          `,
        });
        console.log(`[RESEND] Correo de bienvenida enviado a: ${newUser.email}`);
      } catch (err: any) {
        console.error("Error enviando correo con Resend:", err);
      }
    } else {
      // MOCK DEV MODE: Si no hay API Key de Resend, imprimimos en consola
      console.log("\n--------------------------------------------------");
      console.log("📢 [MODO DESARROLLO - CORREO SIMULADO]");
      console.log(`Para: ${newUser.email}`);
      console.log("Asunto: Bienvenido a SmartNFC - Tus Credenciales de Acceso");
      console.log(`Enlace de Acceso: ${loginUrl}`);
      console.log(`Usuario: ${newUser.email}`);
      console.log(`Contraseña: ${passwordPlain}`);
      console.log("--------------------------------------------------\n");
    }
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function deleteVendorUser(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("No autorizado");
  }

  const admin = session.user as any;
  const isAdmin = admin.role === "SUPERADMIN" || admin.role === "CLIENT_ADMIN";

  if (!isAdmin) {
    throw new Error("Solo los administradores pueden eliminar vendedores.");
  }

  // 1. Validar que el usuario a eliminar pertenezca a la misma empresa
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
