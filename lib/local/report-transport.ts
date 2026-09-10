import { Resend } from "resend";
import type { MailPayload } from "./report-email";
export type ReportTransport=(payload:MailPayload,key:string)=>Promise<{id:string}>;
export function deliveryMode() {
  const mode=process.env.LOCAL_REPORT_EMAIL_MODE;
  return mode==="live" || mode==="preview" ? mode : "disabled";
}
export function validateReportTransport() {
  if (deliveryMode()!=="live") return;
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !process.env.LOCAL_REPORT_SUPPORT_EMAIL ||
      !process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://")) throw new Error("Configuración de reportes incompleta.");
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV!=="production") throw new Error("Los envíos reales están deshabilitados en previews.");
}
export const sendReportMail:ReportTransport=async(payload,key)=>{
  validateReportTransport();
  if (deliveryMode()!=="live") throw new Error("Los envíos reales están deshabilitados.");
  const response=await new Resend(process.env.RESEND_API_KEY!).fetchRequest<{id:string}>("/emails",{
    method:"POST",signal:AbortSignal.timeout(10000),
    headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY!}`,"Content-Type":"application/json","Idempotency-Key":key},
    body:JSON.stringify(payload)
  });
  if (response.error || !response.data?.id) throw new Error("El proveedor no confirmó la aceptación.");
  return {id:response.data.id};
};
