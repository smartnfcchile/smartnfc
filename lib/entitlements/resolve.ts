import type { CompanyProductLicense, CompanyCapabilityOverride, CompanyLimitOverride } from "@prisma/client";
import { BASE, TEAM, LOCAL, CAPABILITIES, LIMITS, commercialOffer, type Capability, type Limit } from "./catalog";

export function licenseActive(license: Pick<CompanyProductLicense, "status" | "startsAt" | "expiresAt"> | null | undefined, now = new Date()) {
  return !!license && license.status === "ACTIVE" && (!license.startsAt || license.startsAt <= now) && (!license.expiresAt || license.expiresAt > now);
}
export type EntitlementInput = {
  companyId: string; isActive: boolean; maxIdentities: number; profileRights: number;
  licenses: CompanyProductLicense[]; capabilityOverrides: CompanyCapabilityOverride[]; limitOverrides: CompanyLimitOverride[];
};
export type Entitlements = {
  companyId: string; capabilities: Capability[]; limits: Record<Limit, number | null>;
  sources: Record<string, string>; localOperational: boolean; empresasOperational: boolean;
  legacyProducts: string[];
};
const legacyEmpresas = new Set(["EMPRESAS_CONECTA", "EMPRESAS_CRECE", "EMPRESAS_ESCALA", "EMPRESAS_CORPORATIVO", "EMPRESAS_HISTORICO"]);
const legacyLocal = new Set(["LOCAL_IMPULSA", "LOCAL_FUNDADOR", "LOCAL_PERSONALIZADO"]);
// 9999 preserves the deployed legacy fallback; it is not an unlimited new contract.
export function resolveEntitlements(input: EntitlementInput, now = new Date()): Entitlements {
  const capabilities = new Set<Capability>();
  const limits = Object.fromEntries(LIMITS.map(key => [key, 0])) as Record<Limit, number | null>;
  const sources: Record<string, string> = {};
  const legacyProducts: string[] = [];
  let empresasOperational = false, localOperational = false;
  const grant = (items: readonly Capability[], source: string) => items.forEach(c => { capabilities.add(c); sources[c] = source; });
  const limit = (key: Limit, value: number | null | undefined, source: string) => {
    limits[key] = value == null ? null : Math.max(0, Math.trunc(value)); sources[key] = source;
  };
  if (input.isActive) {
    if (input.profileRights > 0) grant(BASE, "PERMANENT_PROFILE_RIGHT");
    for (const license of input.licenses) {
      if (license.companyId !== input.companyId || !licenseActive(license, now)) continue;
      const offer = commercialOffer(license.planCode);
      if (offer && offer.product === license.product) {
        grant(offer.capabilities, license.planCode);
        if (license.product === "EMPRESAS") {
          empresasOperational = true;
          // Profiles provisioned under an active license work; a permanent right survives expiry separately.
          grant(BASE, "ACTIVE_EMPRESAS_LICENSE");
          limit("MAX_IDENTITIES", offer.identities ?? license.includedIdentities ?? 0, license.planCode);
          limits.MAX_IDENTITIES = (limits.MAX_IDENTITIES ?? 0) + (license.authorizedExtraIdentities ?? 0);
        } else {
          localOperational = true;
          limit("MAX_LOCATIONS", offer.locations ?? license.includedBranches ?? 0, license.planCode);
          limit("MAX_TOUCHPOINTS_PER_LOCATION", license.maxActiveTouchpointsPerLocation ?? offer.points ?? 10, license.planCode);
          limit("LEGACY_MAX_CAMPAIGNS", null, "NOT_APPLICABLE");
          limit("LEGACY_MAX_TOUCHPOINTS", null, "NOT_APPLICABLE");
        }
      } else if (license.product === "EMPRESAS" && legacyEmpresas.has(license.planCode)) {
        empresasOperational = true; legacyProducts.push("EMPRESAS");
        grant([...BASE, ...TEAM], "LEGACY_COMPATIBILITY:" + license.planCode);
        const preset: Record<string, number> = { EMPRESAS_CONECTA: 5, EMPRESAS_CRECE: 15, EMPRESAS_ESCALA: 30 };
        const included = preset[license.planCode] ?? license.includedIdentities ?? (license.planCode === "EMPRESAS_HISTORICO" ? input.maxIdentities || 5 : 9999);
        limit("MAX_IDENTITIES", included + (license.authorizedExtraIdentities ?? 0), "LEGACY_COMPATIBILITY:" + license.planCode);
      } else if (license.product === "LOCAL" && legacyLocal.has(license.planCode)) {
        localOperational = true; legacyProducts.push("LOCAL"); grant(LOCAL, "LEGACY_COMPATIBILITY:" + license.planCode);
        const custom = license.planCode === "LOCAL_PERSONALIZADO";
        limit("MAX_LOCATIONS", custom ? license.includedBranches ?? 1 : 1, "LEGACY_COMPATIBILITY");
        limit("MAX_TOUCHPOINTS_PER_LOCATION", null, "LEGACY_COMPANY_WIDE_POINTS");
        limit("LEGACY_MAX_CAMPAIGNS", custom ? license.includedCampaigns ?? 9999 : 1, "LEGACY_COMPATIBILITY");
        limit("LEGACY_MAX_TOUCHPOINTS", custom ? license.includedTouchpoints ?? 9999 : 3, "LEGACY_COMPATIBILITY");
      }
    }
    const active = (o: { companyId: string; startsAt: Date; expiresAt: Date | null; revokedAt: Date | null }) => o.companyId === input.companyId && !o.revokedAt && o.startsAt <= now && (!o.expiresAt || o.expiresAt > now);
    const ordered = <T extends { startsAt: Date; createdAt: Date; id: string }>(items: T[]) => [...items].sort((a,b) => +a.startsAt - +b.startsAt || +a.createdAt - +b.createdAt || a.id.localeCompare(b.id));
    for (const o of ordered(input.capabilityOverrides.filter(active))) {
      const key = o.capability as Capability;
      if (!CAPABILITIES.includes(key) || (BASE as readonly string[]).includes(key)) continue;
      // Overrides cannot reopen an explicitly inactive subscription or Local without a license.
      const isLocal = key.startsWith("LOCAL_");
      const explicitInactive = input.licenses.some(l => l.product === "EMPRESAS" && !licenseActive(l, now));
      if (o.enabled && (isLocal ? !localOperational : explicitInactive)) continue;
      if (o.enabled) capabilities.add(key); else capabilities.delete(key);
      sources[key] = "OVERRIDE:" + o.id;
    }
    for (const o of ordered(input.limitOverrides.filter(active))) {
      if (!LIMITS.includes(o.limit as Limit) || !Number.isSafeInteger(o.value) || o.value < 0) continue;
      if (o.limit === "MAX_IDENTITIES" ? !empresasOperational : !localOperational) continue;
      limit(o.limit as Limit, o.value, "OVERRIDE:" + o.id);
    }
  }
  localOperational = localOperational && capabilities.has("LOCAL_ACCESS");
  if (!localOperational) for (const c of LOCAL) capabilities.delete(c);
  return { companyId: input.companyId, capabilities: [...capabilities], limits, sources, localOperational, empresasOperational, legacyProducts };
}
