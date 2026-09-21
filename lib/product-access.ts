import { prisma } from "./prisma";
import { SmartNfcProduct, CompanyProductLicense } from "@prisma/client";
import { getCompanyEntitlements, type EntitlementDb } from "./entitlements";
import { licenseActive } from "./entitlements/resolve";
export function isLicenseValid(license: CompanyProductLicense | null) { return licenseActive(license); }
export async function getCompanyProductLicenses(companyId: string) { return prisma.companyProductLicense.findMany({ where: { companyId } }); }
export async function getProductLicense(companyId: string, product: SmartNfcProduct) { return prisma.companyProductLicense.findUnique({ where: { companyId_product: { companyId, product } } }); }
export async function hasActiveProduct(companyId: string, product: SmartNfcProduct) {
  const e = await getCompanyEntitlements(companyId);
  return product === "LOCAL" ? e.localOperational : e.capabilities.includes("PROFILE");
}
export async function requireProductAccess(companyId: string, product: SmartNfcProduct) {
  if (!(await hasActiveProduct(companyId, product))) throw new Error("Producto no disponible.");
}
export async function canCreateIdentity(companyId: string, db: EntitlementDb = prisma) {
  const e = await getCompanyEntitlements(companyId, db);
  if (!e.empresasOperational) return false;
  const count = await db.card.count({ where: { companyId, isActive: true } });
  return count < (e.limits.MAX_IDENTITIES ?? 0);
}
export async function canCreateLocalCampaign(companyId: string, db: EntitlementDb = prisma) {
  const e = await getCompanyEntitlements(companyId, db);
  if (!e.localOperational) return false;
  const count = await db.localCampaign.count({ where: { companyId, status: { not: "ARCHIVED" } } });
  return e.limits.LEGACY_MAX_CAMPAIGNS === null || count < e.limits.LEGACY_MAX_CAMPAIGNS;
}
export async function canCreateLocalTouchpoint(companyId: string, locationId?: string, db: EntitlementDb = prisma, active = true) {
  const e = await getCompanyEntitlements(companyId, db);
  if (!e.capabilities.includes("LOCAL_TOUCHPOINTS")) return false;
  if (e.limits.LEGACY_MAX_TOUCHPOINTS !== null) {
    const count = await db.localTouchpoint.count({ where: { campaign: { companyId, status: { not: "ARCHIVED" } } } });
    return count < e.limits.LEGACY_MAX_TOUCHPOINTS;
  }
  if (!locationId || !(await db.localLocation.findFirst({ where: { id: locationId, companyId, isActive: true } }))) return false;
  if (!active) return true;
  const count = await db.localTouchpoint.count({ where: { isActive: true, campaign: { companyId, locationId } } });
  return count < (e.limits.MAX_TOUCHPOINTS_PER_LOCATION ?? 0);
}
