import { resend } from "./resend";
import React from "react";

interface SendEmailParams {
  to: string;
  subject: string;
  react: React.ReactNode;
}

export async function sendEmail({ to, subject, react }: SendEmailParams) {
  if (!resend) {
    console.warn("Resend no está configurado (RESEND_API_KEY falta).");
    return { success: false, error: "Resend no configurado" };
  }

  const from = process.env.EMAIL_FROM || "Smart NFC Chile <onboarding@resend.dev>";

  try {
    const data = await resend.emails.send({
      from,
      to,
      subject,
      react,
    });

    if (data.error) {
      console.error("Error al enviar correo mediante Resend SDK:", data.error);
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Excepción al enviar correo mediante Resend:", error);
    return { success: false, error: errorMsg };
  }
}
