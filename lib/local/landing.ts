// Carga de la landing pública /l/[code]. Nunca crea LocalVisit: la visita se registra una sola vez
// en la entrada (/t, /q, /p). Con una visita válida del mismo punto (`v`) registra LANDING_VIEW
// (una por visita) y adjunta `v` a los enlaces de acción para atribuir los clics a esa misma visita.
import { cache } from "react";
import { campaignPublicBrand, type ResolvedLocalBrand } from "./brand";
import { pointPromotion, publicLandingActions, publicPoint } from "./point-resolver";
import { promotionView, type PromotionView } from "./objective-config";

export type { PromotionView };
import { toPublicActions, type PublicAction } from "./public-actions";
import { effectivePresentationMode } from "./point-config";
import { findLocalVisit, recordLocalAction, recordTrackingIncident, visitIdValid } from "./tracking";

/** Compatibilidad: la función vive en brand.ts (módulo puro). */
export { campaignPublicBrand };

/** Una sola lectura del punto por request (generateMetadata + página). */
const landingPoint = cache((code: string) => publicPoint(code));

export type PointLanding =
  | { status: "ok"; brand: ResolvedLocalBrand; actions: PublicAction[]; visitAttributed: boolean; promotion: PromotionView | null }
  | { status: "inactive" }
  | { status: "direct" };

export async function loadPointLanding(code: string, rawVisitId?: string | null): Promise<PointLanding> {
  const point = await landingPoint(code);
  if (!point) return { status: "inactive" };
  const promo = pointPromotion(point);
  // DIRECT efectivo redirige a /p (SMART_LANDING nunca: siempre es Página del Local), salvo una promoción
  // no vigente, cuyo estado se muestra aquí en cualquier modo.
  if (point.objective === "CLUB" || (effectivePresentationMode(point.objective, point.presentationMode) !== "LANDING" && !(promo && promo.status !== "active"))) return { status: "direct" };

  let visitId: string | null = null;
  if (rawVisitId && visitIdValid(rawVisitId)) {
    const visit = await findLocalVisit(rawVisitId, point.campaignId);
    if (visit && visit.touchpointId === point.id) {
      visitId = visit.id;
      try { await recordLocalAction(visit.id, point.campaignId, "LANDING_VIEW"); }
      catch { await recordTrackingIncident(point.campaign.companyId); }
    }
  }
  // Solo datos de presentación pública: identidad resuelta + acciones. Sin nombres internos
  // (point.name, point.location, campaign.name, location.name) ni destinos en el HTML (los enlaces pasan por /go).
  const brand = campaignPublicBrand(point.campaign, point.campaign.company.name);
  // Acciones del punto + CONTACTO sin duplicados; /go sigue resolviendo todas (la deduplicación es solo presentación).
  const actions = toPublicActions(publicLandingActions(point), { interactive: true, code: point.code, version: point.configurationVersion, visitId });
  return { status: "ok", brand, actions, visitAttributed: !!visitId, promotion: promo ? promotionView(promo.promotion, promo.status) : null };
}
