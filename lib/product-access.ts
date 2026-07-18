import { prisma } from "./prisma";
import { SmartNfcProduct, CompanyProductLicense } from "@prisma/client";
import { PRODUCT_PLANS } from "./plans";

/**
 * Verifica si una licencia es válida y activa en la fecha actual (Requisito Parte 3).
 * Una licencia concede acceso únicamente cuando:
 * - status === ACTIVE
 * - startsAt es null o startsAt <= ahora
 * - expiresAt es null o expiresAt > ahora
 * renewsAt no bloquea automáticamente y la consulta no altera el estado.
 */
export function isLicenseValid(license: CompanyProductLicense | null): boolean {
  if (!license) return false;
  if (license.status !== "ACTIVE") return false;

  const now = new Date(); // Comparación basada en UTC

  if (license.startsAt && license.startsAt > now) {
    return false;
  }

  if (license.expiresAt && license.expiresAt <= now) {
    return false;
  }

  return true;
}

/**
 * Obtiene todas las licencias de producto configuradas para una empresa.
 */
export async function getCompanyProductLicenses(companyId: string): Promise<CompanyProductLicense[]> {
  return prisma.companyProductLicense.findMany({
    where: { companyId }
  });
}

/**
 * Obtiene la licencia de producto específica de una empresa.
 */
export async function getProductLicense(
  companyId: string,
  product: SmartNfcProduct
): Promise<CompanyProductLicense | null> {
  return prisma.companyProductLicense.findUnique({
    where: {
      companyId_product: {
        companyId,
        product
      }
    }
  });
}

/**
 * Retorna true si la empresa tiene una licencia activa para el producto especificado (Requisito Parte F).
 */
export async function hasActiveProduct(companyId: string, product: SmartNfcProduct): Promise<boolean> {
  const license = await getProductLicense(companyId, product);
  return isLicenseValid(license);
}

/**
 * Guarda de servidor que arroja un error si el acceso al producto no está activo.
 */
export async function requireProductAccess(companyId: string, product: SmartNfcProduct): Promise<void> {
  const active = await hasActiveProduct(companyId, product);
  if (!active) {
    throw new Error(`Acceso denegado: El producto ${product === "EMPRESAS" ? "Smart NFC Empresas" : "Smart NFC Local"} no está activo para su empresa.`);
  }
}

/**
 * Evalúa si la empresa tiene capacidad para crear o activar una nueva identidad (tarjeta B2B activa).
 */
export async function canCreateIdentity(companyId: string): Promise<boolean> {
  const license = await getProductLicense(companyId, "EMPRESAS");
  if (!license || !isLicenseValid(license)) return false;

  let limit = 5;
  if (license.planCode === "EMPRESAS_HISTORICO") {
    if (license.includedIdentities !== null) {
      limit = license.includedIdentities;
    } else {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { maxIdentities: true }
      });
      limit = company?.maxIdentities || 5;
    }
  } else if (license.planCode === "EMPRESAS_CORPORATIVO") {
    limit = license.includedIdentities ?? 9999;
  } else {
    const plan = PRODUCT_PLANS[license.planCode];
    limit = plan?.includedIdentities ?? 5;
  }

  const extra = license.authorizedExtraIdentities ?? 0;
  const totalAllowed = limit + extra;

  // Contar tarjetas activas reales de la empresa
  const activeCount = await prisma.card.count({
    where: { companyId, isActive: true }
  });

  return activeCount < totalAllowed;
}

/**
 * Evalúa si la empresa puede crear una nueva campaña local.
 */
export async function canCreateLocalCampaign(companyId: string): Promise<boolean> {
  const license = await getProductLicense(companyId, "LOCAL");
  if (!license || !isLicenseValid(license)) return false;

  let limit = 1;
  if (license.planCode === "LOCAL_PERSONALIZADO") {
    limit = license.includedCampaigns ?? 9999;
  } else {
    const plan = PRODUCT_PLANS[license.planCode];
    limit = plan?.includedCampaigns ?? 1;
  }

  const count = await prisma.localCampaign.count({
    where: {
      companyId,
      status: { not: "ARCHIVED" }
    }
  });

  return count < limit;
}

/**
 * Evalúa si la empresa puede crear un nuevo punto de contacto local.
 */
export async function canCreateLocalTouchpoint(companyId: string): Promise<boolean> {
  const license = await getProductLicense(companyId, "LOCAL");
  if (!license || !isLicenseValid(license)) return false;

  let limit = 3;
  if (license.planCode === "LOCAL_PERSONALIZADO") {
    limit = license.includedTouchpoints ?? 9999;
  } else {
    const plan = PRODUCT_PLANS[license.planCode];
    limit = plan?.includedTouchpoints ?? 3;
  }

  const count = await prisma.localTouchpoint.count({
    where: {
      campaign: {
        companyId,
        status: { not: "ARCHIVED" }
      }
    }
  });

  return count < limit;
}
