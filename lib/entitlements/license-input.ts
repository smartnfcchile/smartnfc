import { ProductPlanCode, ProductLicenseStatus } from "@prisma/client";
import { commercialOffer } from "./catalog";
export function validateLicenseInput(product: "EMPRESAS" | "LOCAL", input: { planCode: string; status: string; startsAt?: string; expiresAt?: string; includedIdentities?: number; authorizedExtraIdentities?: number; includedCampaigns?: number; includedBranches?: number; includedTouchpoints?: number }) {
  if (!Object.values(ProductPlanCode).includes(input.planCode as ProductPlanCode) || !input.planCode.startsWith(product + "_") || !Object.values(ProductLicenseStatus).includes(input.status as ProductLicenseStatus)) throw new Error("Licencia no válida para este producto.");
  for (const value of [input.includedIdentities,input.authorizedExtraIdentities,input.includedCampaigns,input.includedBranches,input.includedTouchpoints]) if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) throw new Error("Los cupos deben ser enteros no negativos.");
  const starts = input.startsAt ? new Date(input.startsAt) : null, expires = input.expiresAt ? new Date(input.expiresAt) : null;
  if ((starts && !Number.isFinite(+starts)) || (expires && !Number.isFinite(+expires)) || (starts && expires && expires <= starts)) throw new Error("Vigencia no válida.");
  const offer = commercialOffer(input.planCode);
  if (offer?.contract && (product === "EMPRESAS" ? !input.includedIdentities : !input.includedBranches)) throw new Error("Define el cupo contractual.");
}

export function normalizeLicenseInput<T extends Parameters<typeof validateLicenseInput>[1]>(product: "EMPRESAS" | "LOCAL", input: T): T {
  validateLicenseInput(product, input);
  const offer = commercialOffer(input.planCode);
  return { ...input, ...(offer?.identities !== undefined ? { includedIdentities: offer.identities } : {}), ...(offer?.locations !== undefined ? { includedBranches: offer.locations } : {}) };
}
