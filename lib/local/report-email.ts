import { periodLabel } from "./report-period";
import type { ReportSnapshot } from "./report-data";
export type MailPayload={from:string;to:string;subject:string;html:string};
export const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
export function renderReportEmail(snapshot:ReportSnapshot,url:string) {
  const m=snapshot.current;
  const change=snapshot.comparisonAvailable
    ? (snapshot.previous.visits ? ((m.visits-snapshot.previous.visits)/snapshot.previous.visits*100).toFixed(1)+"% de variación en accesos" : "El periodo anterior no registró accesos.")
    : "La comparación estará disponible cuando ambos periodos tengan cobertura completa.";
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a">
  <div style="max-width:640px;margin:32px auto;background:white;padding:32px;border-radius:16px">
  <p style="color:#2563eb;font-weight:bold">SmartNFC Local · Informe automático</p>
  <h1 style="font-size:26px">${escapeHtml(snapshot.companyName)}</h1>
  <p>${escapeHtml(periodLabel(snapshot.periodStart,snapshot.periodEnd))}</p>
  ${snapshot.partial?'<p style="background:#fef3c7;padding:12px">Cobertura parcial: la medición corregida comenzó durante este periodo.</p>':""}
  <p>${snapshot.measurementIssues?"Se detectaron incidencias de medición. Las cifras pueden estar incompletas.":""}</p>
  <h2>${m.visits?m.visits+" accesos registrados":snapshot.measurementIssues?"Actividad no concluyente":"No se registró actividad"}</h2>
  <p>${escapeHtml(change)}</p>
  <table style="width:100%;border-collapse:collapse"><tbody>
  ${[["NFC",m.nfc],["QR",m.qr],["Directos",m.direct],["Nuevos registros al club",m.newSubscribers],
  ["Visitas con registro",m.conversions],["Conversión",m.conversionRate.toFixed(1)+"%"],["Clics a WhatsApp",m.whatsapp],
  ["Descargas de contacto",m.vcf]].map(([label,value])=>`<tr><td style="padding:10px;border-bottom:1px solid #e2e8f0">${label}</td><td style="text-align:right">${value}</td></tr>`).join("")}
  </tbody></table><h2 style="font-size:18px">Tus puntos</h2>
  ${m.points.length?m.points.map(p=>`<p><strong>${escapeHtml(p.name)}</strong>: ${p.visits} accesos · ${p.conversions} registros · ${p.whatsapp} clics WhatsApp</p>`).join(""):"<p>No hay accesos registrados en los puntos durante este periodo.</p>"}
  <p style="margin:28px 0"><a href="${escapeHtml(url)}" style="background:#2563eb;color:white;padding:14px 20px;border-radius:8px;text-decoration:none">Ver informe completo</a></p>
  <p style="font-size:12px;color:#64748b">El informe requiere iniciar sesión. Los clics no confirman mensajes enviados. Un acceso es una visita, no una persona única. Cero actividad registrada no acredita ausencia de visitantes. Los datos anteriores al inicio de la medición corregida se conservan fuera de este informe.</p>
  </div></body></html>`;
}
