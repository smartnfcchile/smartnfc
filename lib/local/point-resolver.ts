import type { ContactSource } from "@prisma/client";
import { prisma } from "../prisma";
import { isLicenseValid } from "../product-access";
import { getPublicUrl } from "../public-url";
import { escapeHtml } from "./report-email";
import { pointConfigurationSchema, smartLinksSchema } from "./point-config";
import { findLocalVisit, recordLocalAction, recordLocalArrival, recordTrackingIncident } from "./tracking";

const privateHeaders = { "Cache-Control": "no-store, max-age=0", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };
const unavailable = () => new Response("Este punto no está disponible.", { status: 403, headers: privateHeaders });
export async function publicPoint(code: string) {
  if (!/^[a-zA-Z0-9_-]{3,100}$/.test(code)) return null;
  const point = await prisma.localTouchpoint.findUnique({ where: { code },
    include: { campaign: { include: { company: { include: { productLicenses: { where: { product: "LOCAL" } } } } } } }
  });
  if (!point || !point.isActive || point.campaign.status === "ARCHIVED" || !point.campaign.company.isActive ||
      !isLicenseValid(point.campaign.company.productLicenses[0] ?? null)) return null;
  if (point.objective === "CLUB") {
    if (point.campaign.status !== "PUBLISHED" || !point.campaign.publishedSnapshot) return null;
  } else {
    const valid = pointConfigurationSchema.safeParse({ name: point.name, location: point.location || "Sin ubicación",
      objective: point.objective, medium: point.medium, isActive: point.isActive, destinationUrl: point.destinationUrl || "", smartLinks: point.smartLinks });
    if (!valid.success) return null;
  }
  return point;
}
function redirect(url: string) {
  return new Response(null, { status: 302, headers: { ...privateHeaders, Location: url } });
}
export async function resolveLocalPoint(code: string, source: ContactSource, headers: Headers, expectedCompanyId?: string) {
  const point = await publicPoint(code);
  if (!point || (expectedCompanyId && expectedCompanyId !== point.campaign.companyId)) return unavailable();
  if ((source === "NFC" && point.medium === "QR") || (source === "QR" && point.medium === "NFC")) return unavailable();
  let visitId = "";
  try {
    visitId = await recordLocalArrival({ companyId: point.campaign.companyId, campaignId: point.campaignId,
      touchpointId: point.id, source, headers, objective: point.objective });
  } catch { await recordTrackingIncident(point.campaign.companyId); }
  if (point.objective === "CLUB") {
    return redirect(getPublicUrl(`/club/${point.campaign.slug}?ref=${point.code}${visitId ? "&v=" + visitId : ""}`));
  }
  if (point.objective === "SMART_LANDING") {
    const links = smartLinksSchema.parse(point.smartLinks);
    const actions = links.map((link, index) => {
      const href = getPublicUrl(`/p/${point.code}/go?index=${index}&version=${point.configurationVersion}${visitId ? "&v=" + visitId : ""}`);
      return `<a href="${escapeHtml(href)}">${escapeHtml(link.label)}</a>`;
    }).join("");
    return new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(point.campaign.company.name)}</title>
      <style>body{margin:0;background:#f1f5f9;color:#0f172a;font-family:system-ui,sans-serif}main{max-width:460px;margin:8vh auto;padding:28px;background:white;border-radius:20px}h1{font-size:26px}a{display:block;margin:14px 0;padding:18px;border-radius:12px;background:#1d4ed8;color:white;text-decoration:none;font-weight:600}a:focus-visible{outline:3px solid #0f172a;outline-offset:3px}small{color:#475569}@media(max-width:520px){main{margin:24px 16px}}</style></head>
      <body><main><small>${escapeHtml(point.campaign.company.name)}</small><h1>${escapeHtml(point.name)}</h1><p>Elige cómo quieres conectar con nosotros.</p>${actions}</main></body></html>`,
      { headers: { ...privateHeaders, "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'" } });
  }
  if (visitId) {
    try { await recordLocalAction(visitId, point.campaignId, point.objective === "WHATSAPP" ? "WHATSAPP_REDIRECT" : "DESTINATION_REDIRECT"); }
    catch { await recordTrackingIncident(point.campaign.companyId); }
  }
  return redirect(point.destinationUrl!);
}
export async function resolvePointAction(code: string, query: URLSearchParams) {
  const point = await publicPoint(code);
  if (!point || point.objective !== "SMART_LANDING") return unavailable();
  if (query.get("version") !== String(point.configurationVersion)) {
    return new Response("Este punto cambió. Vuelve a abrir el enlace del punto para ver las acciones actuales.", { status: 409, headers: privateHeaders });
  }
  const rawIndex = query.get("index") || "";
  if (!/^[0-5]$/.test(rawIndex)) return new Response("Acción no disponible.", { status: 404, headers: privateHeaders });
  const link = smartLinksSchema.parse(point.smartLinks)[Number(rawIndex)];
  if (!link) return new Response("Acción no disponible.", { status: 404, headers: privateHeaders });
  const visitId = query.get("v");
  if (visitId) {
    const visit = await findLocalVisit(visitId, point.campaignId);
    if (visit?.touchpointId === point.id && visit.objective === "SMART_LANDING") {
      try { await recordLocalAction(visit.id, point.campaignId, "DESTINATION_REDIRECT"); }
      catch { await recordTrackingIncident(point.campaign.companyId); }
    }
  }
  return redirect(link.url);
}
