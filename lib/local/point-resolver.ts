import type { ContactSource } from "@prisma/client";
import { prisma } from "../prisma";
import { hasCapability } from "../entitlements";
import { getPublicUrl } from "../public-url";
import { campaignPublicBrand } from "./brand";
import { effectivePresentationMode, pointConfigurationSchema, smartLinksSchema } from "./point-config";
import { PUBLIC_ACTION_ID_PATTERN, landingActions, localContactCard, readStoredActions, resolveContactActions, resolvePointActions, type ResolvedAction } from "./public-actions";
import { generateBusinessVcf, vcfFilename } from "../vcf";
import { promotionStatus, readObjectiveConfig, type Promotion, type PromotionStatus } from "./objective-config";
import { findLocalVisit, recordActionClick, recordLocalAction, recordLocalArrival, recordTrackingIncident } from "./tracking";

const privateHeaders = { "Cache-Control": "no-store, max-age=0", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };
const unavailable = () => new Response('<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Punto Inteligente temporalmente inactivo</title></head><body><main><p>Punto Inteligente temporalmente inactivo</p></main></body></html>', { status: 403, headers: { ...privateHeaders, "Content-Type": "text/html; charset=utf-8" } });
const changed = () => new Response("Este punto cambió. Vuelve a abrir el enlace del punto para ver las acciones actuales.", { status: 409, headers: privateHeaders });
const missingAction = () => new Response("Acción no disponible.", { status: 404, headers: privateHeaders });

export async function publicPoint(code: string) {
  if (!/^[a-zA-Z0-9_-]{3,100}$/.test(code)) return null;
  const point = await prisma.localTouchpoint.findUnique({ where: { code },
    include: { campaign: { include: { localLocation: true, company: { include: { productLicenses: { where: { product: "LOCAL" } } } } } } }
  });
  if (!point || !point.isActive || point.campaign.status === "ARCHIVED" || !point.campaign.company.isActive || (point.campaign.localLocation && !point.campaign.localLocation.isActive) ||
      !(await hasCapability(point.campaign.companyId, "LOCAL_TOUCHPOINTS")) || !(await hasCapability(point.campaign.companyId, `LOCAL_${point.objective}`))) return null;
  if (point.objective === "CLUB") {
    if (point.campaign.status !== "PUBLISHED" || !point.campaign.publishedSnapshot) return null;
  } else {
    // Acciones guardadas: lectura tolerante (una acción que ya no valida se omite; el punto sigue funcionando).
    const valid = pointConfigurationSchema.safeParse({ name: point.name, location: point.location || "Sin ubicación",
      objective: point.objective, medium: point.medium, isActive: point.isActive, destinationUrl: point.destinationUrl || "", smartLinks: point.smartLinks,
      presentationMode: point.presentationMode, actions: readStoredActions(point.actions), objectiveConfig: readObjectiveConfig(point.objectiveConfig) });
    if (!valid.success) return null;
  }
  return point;
}
export type PublicPoint = NonNullable<Awaited<ReturnType<typeof publicPoint>>>;

/** Promoción del punto y su vigencia hoy (null si el objetivo no es promoción). */
export function pointPromotion(point: PublicPoint): { promotion: Promotion | undefined; status: PromotionStatus } | null {
  if (point.objective !== "PROMOTION") return null;
  const promotion = readObjectiveConfig(point.objectiveConfig).promotion;
  return { promotion, status: promotionStatus(promotion) };
}

/** Acciones públicas de un punto (objetivo + adicionales) y, opcionalmente, las de contacto del Local. */
export function publicPointActions(point: PublicPoint, withContact: boolean): ResolvedAction[] {
  const smartLinks = smartLinksSchema.safeParse(point.smartLinks);
  const promo = pointPromotion(point);
  const actions = resolvePointActions({ objective: point.objective, destinationUrl: point.destinationUrl,
    smartLinks: smartLinks.success ? smartLinks.data : [], actions: readStoredActions(point.actions), ctaLabel: readObjectiveConfig(point.objectiveConfig).ctaLabel })
    // Una promoción programada o terminada no ofrece su botón principal.
    .filter(a => !(promo && promo.status !== "active" && a.id === "primary"));
  return withContact ? [...actions, ...resolveContactActions(campaignPublicBrand(point.campaign, point.campaign.company.name), actions)] : actions;
}
/** Acciones que muestra la Página del Local: las del punto y CONTACTO sin duplicados (solo presentación). */
export function publicLandingActions(point: PublicPoint): ResolvedAction[] {
  return landingActions(publicPointActions(point, false), campaignPublicBrand(point.campaign, point.campaign.company.name));
}

/**
 * vCard del Local para "Guardar contacto": solo la identidad pública efectiva (nombre comercial, descripción,
 * dirección, teléfono, web, mapa) y los medios de contacto de las acciones visibles del punto. Generada al vuelo.
 */
function contactVcfResponse(point: PublicPoint) {
  const card = localContactCard(campaignPublicBrand(point.campaign, point.campaign.company.name), publicPointActions(point, false));
  const body = generateBusinessVcf({ name: card.name, note: card.note, address: card.address, emails: card.emails, urls: card.urls,
    phones: card.phones.map(p => ({ number: p.number, label: p.kind === "whatsapp" ? "WhatsApp" : undefined })) });
  const filename = vcfFilename(card.name);
  return new Response(body, { status: 200, headers: { ...privateHeaders, "Content-Type": "text/vcard; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`, "X-Content-Type-Options": "nosniff" } });
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
  // Página del Local: la visita ya quedó registrada arriba (una sola vez). La página no registra otra;
  // los clics se registran solo cuando el visitante toca una acción (/p/[code]/go).
  // - LANDING efectivo: SMART_LANDING siempre (aunque su valor histórico sea DIRECT) y los objetivos en LANDING.
  // - Una promoción programada o terminada muestra su estado en la página del local aunque el punto sea DIRECT.
  const promo = pointPromotion(point);
  if (effectivePresentationMode(point.objective, point.presentationMode) === "LANDING" || (promo && promo.status !== "active")) {
    return redirect(getPublicUrl(`/l/${point.code}${visitId ? "?v=" + visitId : ""}`));
  }
  // DIRECT de objetivo único: salida automática al destino (no es un clic del visitante).
  if (visitId) {
    try { await recordLocalAction(visitId, point.campaignId, point.objective === "WHATSAPP" ? "WHATSAPP_REDIRECT" : "DESTINATION_REDIRECT"); }
    catch { await recordTrackingIncident(point.campaign.companyId); }
  }
  return redirect(point.destinationUrl!);
}

/**
 * /p/[code]/go — salida por una acción.
 * - `action=<id>`: acción del punto o de contacto del Local. Redirige SOLO al destino guardado y validado
 *   (cualquier url= u otro parámetro se ignora), responde 409 si la configuración cambió y registra
 *   un clic por visita y acción. Con `ping` (enlaces tel:) solo registra y responde 204.
 * - `index=N`: enlaces de páginas de acciones heredadas que aún estén abiertas en un teléfono (compatibilidad).
 */
export async function resolvePointAction(code: string, query: URLSearchParams, opts: { ping?: boolean } = {}) {
  const point = await publicPoint(code);
  if (!point) return unavailable();
  const actionId = query.get("action");
  if (actionId !== null) return resolveActionById(point, actionId, query, !!opts.ping);
  if (opts.ping || point.objective !== "SMART_LANDING") return unavailable();
  if (query.get("version") !== String(point.configurationVersion)) return changed();
  const rawIndex = query.get("index") || "";
  if (!/^[0-5]$/.test(rawIndex)) return missingAction();
  const link = smartLinksSchema.parse(point.smartLinks)[Number(rawIndex)];
  if (!link) return missingAction();
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

async function resolveActionById(point: PublicPoint, actionId: string, query: URLSearchParams, ping: boolean) {
  if (!PUBLIC_ACTION_ID_PATTERN.test(actionId)) return missingAction();
  if (query.get("version") !== String(point.configurationVersion)) return changed();
  const action = publicPointActions(point, true).find(a => a.id === actionId);
  if (!action) {
    // Botón de una promoción que dejó de estar vigente: se muestra su estado, sin registrar clic ni salir.
    const promo = pointPromotion(point);
    if (ping) return new Response(null, { status: 204, headers: privateHeaders });
    if (actionId === "primary" && promo && promo.status !== "active") return redirect(getPublicUrl(`/l/${point.code}`));
    return missingAction();
  }
  const visitId = query.get("v");
  if (visitId) {
    const visit = await findLocalVisit(visitId, point.campaignId);
    // Solo se atribuye a una visita reciente del MISMO punto y del objetivo vigente.
    if (visit && visit.touchpointId === point.id && visit.objective === point.objective) {
      try {
        await recordActionClick({ visit, point: { objective: point.objective, presentationMode: effectivePresentationMode(point.objective, point.presentationMode) }, action });
      } catch { await recordTrackingIncident(point.campaign.companyId); }
    }
  }
  if (ping) return new Response(null, { status: 204, headers: privateHeaders });
  // Guardar contacto: se registra el clic (arriba) y se entrega la vCard; nunca se confirma que el contacto quedó guardado.
  return action.type === "SAVE_CONTACT" ? contactVcfResponse(point) : redirect(action.destination);
}
