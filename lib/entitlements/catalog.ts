// Prices are commercial metadata only. Resolution never reads them.
export const PHYSICAL_CATALOG = {
  CARD: { priceClp: 29990, permanentProfile: true },
  LOCAL_MINI: { priceClp: 19990, permanentProfile: false },
  LOCAL_STANDARD: { priceClp: 29990, permanentProfile: false },
  LOCAL_XL: { priceClp: 39990, permanentProfile: false },
} as const;

export const BASE = ["PROFILE", "PROFILE_EDIT", "CONTACT_AND_SOCIAL", "CUSTOM_LINKS", "CONTACT_SHARING"] as const;
export const PRO = ["CRM", "LEAD_CAPTURE", "ANALYTICS"] as const;
export const TEAM = [...PRO, "TEAM_MANAGEMENT", "COMPANY_AGGREGATED_ANALYTICS", "PROFILE_EDIT_POLICY"] as const;
export const LOCAL = ["LOCAL_ACCESS", "LOCAL_TOUCHPOINTS", "LOCAL_GOOGLE_REVIEW", "LOCAL_WHATSAPP", "LOCAL_SOCIAL", "LOCAL_CLUB", "LOCAL_PROMOTION", "LOCAL_MENU", "LOCAL_SMART_LANDING", "LOCAL_SUBSCRIBERS", "LOCAL_REPORTS", "LOCAL_EXPORTS"] as const;
export const CAPABILITIES = [...BASE, ...TEAM, ...LOCAL] as const;
export type Capability = typeof CAPABILITIES[number];
export const LIMITS = ["MAX_IDENTITIES", "MAX_LOCATIONS", "MAX_TOUCHPOINTS_PER_LOCATION", "LEGACY_MAX_CAMPAIGNS", "LEGACY_MAX_TOUCHPOINTS"] as const;
export type Limit = typeof LIMITS[number];
type Offer = { product: "EMPRESAS" | "LOCAL"; name: string; capabilities: readonly Capability[]; identities?: number; locations?: number; points?: number; monthlyClp?: number; annualClp?: number; contract?: boolean };
export const DIGITAL_CATALOG = {
  EMPRESAS_PROFILE: { product: "EMPRESAS", name: "Perfil adquirido", capabilities: [], identities: 1 },
  EMPRESAS_PRO: { product: "EMPRESAS", name: "SmartNFC Pro", capabilities: PRO, monthlyClp: 7990, annualClp: 79900 },
  // No fixed price or identity count: a pilot's capacity is set per case via includedIdentities on its
  // license, and its premium capabilities (if any) via CompanyCapabilityOverride — both already exist.
  EMPRESAS_PILOT: { product: "EMPRESAS", name: "Piloto comercial", capabilities: [] },
  EMPRESAS_TEAM_5: { product: "EMPRESAS", name: "Equipo 5", capabilities: TEAM, identities: 5, monthlyClp: 19990 },
  EMPRESAS_TEAM_10: { product: "EMPRESAS", name: "Equipo 10", capabilities: TEAM, identities: 10, monthlyClp: 34990 },
  EMPRESAS_TEAM_25: { product: "EMPRESAS", name: "Equipo 25", capabilities: TEAM, identities: 25, monthlyClp: 69990 },
  EMPRESAS_TEAM_CONTRACT: { product: "EMPRESAS", name: "Empresa 50+", capabilities: TEAM, contract: true },
  LOCAL_PRO: { product: "LOCAL", name: "Local Pro", capabilities: LOCAL, locations: 1, points: 10, monthlyClp: 14990, annualClp: 149900 },
  LOCAL_PACK_3: { product: "LOCAL", name: "Pack Local 3", capabilities: LOCAL, locations: 3, points: 10 },
  LOCAL_PACK_5: { product: "LOCAL", name: "Local Pack 5", capabilities: LOCAL, locations: 5, points: 10 },
  LOCAL_CONTRACT: { product: "LOCAL", name: "Local contractual", capabilities: LOCAL, points: 10, contract: true },
} satisfies Record<string, Offer>;
export function commercialOffer(code: string): Offer | undefined {
  return (DIGITAL_CATALOG as Record<string, Offer>)[code];
}
