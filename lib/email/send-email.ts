import { resend } from "./resend";
import { looksLikeBlockedProduction, resolveEmailMode } from "./email-mode";
import React from "react";
import { render } from "@react-email/render";

interface SendEmailParams {
  to: string;
  subject: string;
  react: React.ReactElement;
}

export async function sendEmail({ to, subject, react }: SendEmailParams) {
  // Fuera de producción no se envían correos reales (pruebas, CI, previews, desarrollo).
  // Se devuelve el mismo contrato que una configuración incompleta para que los llamadores
  // registren el aviso habitual sin cambiar su flujo. No se registra el destinatario.
  const emailMode = resolveEmailMode();
  if (emailMode.mode !== "live") {
    if (looksLikeBlockedProduction(process.env, emailMode)) {
      // Visible en los logs de Vercel: indica una configuración de producción incompleta o contradictoria.
      console.error(`[sendEmail] ALERTA: entorno con apariencia de producción, envío bloqueado (${emailMode.reason}). Revisar docs/email-safe-mode.md.`);
    } else {
      console.warn(`[sendEmail] Envío bloqueado en este entorno (${emailMode.reason}).`);
    }
    return { success: false, skipped: true, error: `Envío de correo deshabilitado: ${emailMode.reason}` };
  }

  // 4. Verificar configuración antes de intentar enviar (Requisito 4)
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!resendApiKey || !from || !appUrl) {
    const missing = [];
    if (!resendApiKey) missing.push("RESEND_API_KEY");
    if (!from) missing.push("EMAIL_FROM");
    if (!appUrl) missing.push("NEXT_PUBLIC_APP_URL");
    console.warn(`[sendEmail] OMITIENDO ENVÍO de correo debido a variables de entorno faltantes: ${missing.join(", ")}`);
    return { success: false, error: `Variables faltantes: ${missing.join(", ")}` };
  }

  if (!resend) {
    console.warn("[sendEmail] Cliente de Resend no está instanciado.");
    return { success: false, error: "Cliente Resend no instanciado" };
  }

  try {
    // Renderizar la plantilla React Email a HTML usando la integración oficial
    const html = await render(react);

    const data = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (data.error) {
      console.error("Error al enviar correo mediante Resend SDK:", data.error);
      return { success: false, error: data.error.message || JSON.stringify(data.error) };
    }

    return { success: true, data };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Excepción al enviar correo mediante Resend:", error);
    return { success: false, error: errorMsg };
  }
}
