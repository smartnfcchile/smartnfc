// Soporte de SuperAdmin a clientes SmartNFC Local — FASE A: solo lectura (Bloque G).
// Toda consulta se acota explícitamente al companyId solicitado. No hay suplantación ni edición cross-tenant:
// este módulo no escribe datos del cliente. Lo único que escribe es AdminAuditLog (registro de la plataforma).
// El llamador DEBE haber verificado requireSuperAdmin().
import { prisma } from "../prisma";
import { getCompanyEntitlements } from "../entitlements";
import { resolveLocalBrand, type ResolvedLocalBrand } from "./brand";
import { readStoredActions } from "./public-actions";
import { effectivePresentationLabel } from "./point-config";

const COMPANY_ID = /^[A-Za-z0-9_-]{1,64}$/;
export const SUPPORT_VIEW_ACTION = "LOCAL_SUPPORT_VIEW";
const SUPPORT_VIEW_THROTTLE_MS = 10 * 60 * 1000;

export type SupportLocation = {
  id: string; internalName: string | null; isActive: boolean; origin: string; brand: ResolvedLocalBrand; hasIdentity: boolean; brandUpdatedAt: Date | null;
};
export type SupportPoint = {
  id: string; code: string; name: string; location: string | null; objective: string; medium: string;
  /** Comportamiento público efectivo ("Página del local" para Smart Landing, sin importar el valor histórico). */
  presentation: string;
  isActive: boolean; configurationVersion: number; actions: number; destinationHost: string | null; updatedAt: Date;
  campaign: { name: string; status: string }; localName: string | null; localActive: boolean;
  /** Tarjeta NFC física vinculada: id interno, estado y últimos caracteres del token (nunca el token completo). */
  nfc: { id: string; status: string; tokenHint: string; activatedAt: Date | null } | null;
};

const host = (url: string | null) => { if (!url) return null; try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; } };

export async function loadLocalSupport(companyId: string) {
  if (!COMPANY_ID.test(companyId)) return null;
  const company = await prisma.company.findUnique({ where: { id: companyId },
    select: { id: true, name: true, slug: true, isActive: true, createdAt: true, productLicenses: { where: { product: "LOCAL" } } } });
  if (!company) return null;
  const [entitlements, locations, points, campaigns] = await Promise.all([
    getCompanyEntitlements(company.id),
    prisma.localLocation.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "asc" } }),
    prisma.localTouchpoint.findMany({ where: { campaign: { companyId: company.id } }, orderBy: { createdAt: "asc" },
      select: { id: true, code: true, name: true, location: true, objective: true, medium: true, presentationMode: true, isActive: true,
        configurationVersion: true, destinationUrl: true, actions: true, updatedAt: true,
        campaign: { select: { name: true, status: true, localLocation: { select: { name: true, displayName: true, isActive: true } } } },
        physicalNfcCard: { select: { id: true, status: true, token: true, activatedAt: true, companyId: true } } } }),
    prisma.localCampaign.groupBy({ by: ["status"], where: { companyId: company.id }, _count: { _all: true } }),
  ]);
  return {
    company, license: company.productLicenses[0] ?? null, entitlements,
    campaigns: campaigns.map(c => ({ status: c.status, count: c._count._all })),
    locations: locations.map((l): SupportLocation => ({ id: l.id, internalName: l.name, isActive: l.isActive, origin: l.origin,
      brand: resolveLocalBrand({ location: l, company }), brandUpdatedAt: l.brandUpdatedAt,
      hasIdentity: !!(l.displayName || l.logoUrl || l.coverImageUrl || l.primaryColor) })),
    points: points.map((p): SupportPoint => ({ id: p.id, code: p.code, name: p.name, location: p.location, objective: p.objective, medium: p.medium,
      presentation: effectivePresentationLabel(p.objective, p.presentationMode), isActive: p.isActive, configurationVersion: p.configurationVersion,
      actions: readStoredActions(p.actions).length, destinationHost: host(p.destinationUrl), updatedAt: p.updatedAt,
      campaign: { name: p.campaign.name, status: p.campaign.status },
      localName: p.campaign.localLocation ? (p.campaign.localLocation.displayName || p.campaign.localLocation.name) : null,
      localActive: p.campaign.localLocation?.isActive ?? true,
      // Defensa adicional: una tarjeta de otra empresa nunca se muestra aunque estuviera mal vinculada.
      nfc: p.physicalNfcCard && p.physicalNfcCard.companyId === company.id
        ? { id: p.physicalNfcCard.id, status: p.physicalNfcCard.status, tokenHint: "…" + p.physicalNfcCard.token.slice(-4), activatedAt: p.physicalNfcCard.activatedAt } : null })),
  };
}
export type LocalSupport = NonNullable<Awaited<ReturnType<typeof loadLocalSupport>>>;

/**
 * Registra el acceso de soporte en AdminAuditLog (dato de la plataforma, no del cliente), como máximo uno
 * cada 10 minutos por SuperAdmin y empresa para no inflar el registro al navegar entre períodos.
 */
export async function recordSupportView(actorUserId: string, companyId: string, now = new Date()) {
  const recent = await prisma.adminAuditLog.findFirst({ where: { actorUserId, companyId, action: SUPPORT_VIEW_ACTION,
    createdAt: { gte: new Date(now.getTime() - SUPPORT_VIEW_THROTTLE_MS) } }, select: { id: true } });
  if (recent) return false;
  await prisma.adminAuditLog.create({ data: { actorUserId, companyId, action: SUPPORT_VIEW_ACTION, entityType: "COMPANY", entityId: companyId,
    metadata: JSON.stringify({ readOnly: true, scope: "LOCAL" }) } });
  return true;
}
