/** Commercial calculations use net CLP, excluding IVA; no billing is performed here. */
export const SOLUCIONES_PRICING = {
  chipPriceClp: 1000,
  estimatedChipCostClp: 80,
  assetMonthlyClp: 200,
  ivaRate: 0.19,
} as const;
export type QuoteInput = {
  mode: "ASSETS" | "CAMPAIGN";
  deviceCount: number;
  activeAssetCount?: number;
  unitPriceClp?: number;
  monthlyCampaignFeeClp?: number;
  installationNetClp?: number;
};
function nonnegativeInteger(n: number, field: string) {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`${field} debe ser entero no negativo`);
}
export function quoteSolution(input: QuoteInput) {
  nonnegativeInteger(input.deviceCount, "deviceCount");
  const activeAssetCount = input.activeAssetCount ?? input.deviceCount;
  nonnegativeInteger(activeAssetCount, "activeAssetCount");
  const unitPrice = input.unitPriceClp ?? SOLUCIONES_PRICING.chipPriceClp;
  const installation = input.installationNetClp ?? 0;
  const monthlyCampaign = input.monthlyCampaignFeeClp;
  for (const [name, value] of [["unitPrice",unitPrice],["installation",installation]] as const) {
    nonnegativeInteger(value,name);
  }
  if (monthlyCampaign !== undefined) nonnegativeInteger(monthlyCampaign,"monthlyCampaignFeeClp");
  if (input.mode === "CAMPAIGN" && monthlyCampaign === undefined) {
    throw new Error("Campañas requieren cotización de servicio, no precio por dispositivo");
  }
  const physicalNetClp = input.deviceCount * unitPrice;
  const monthlyNetClp = input.mode === "ASSETS"
    ? activeAssetCount * SOLUCIONES_PRICING.assetMonthlyClp
    : monthlyCampaign!;
  const initialNetClp = physicalNetClp + installation;
  return {
    mode: input.mode, physicalNetClp, installationNetClp: installation,
    initialNetClp, monthlyNetClp,
    initialWithIvaClp: Math.round(initialNetClp * (1 + SOLUCIONES_PRICING.ivaRate)),
    monthlyWithIvaClp: Math.round(monthlyNetClp * (1 + SOLUCIONES_PRICING.ivaRate)),
    firstYearNetClp: initialNetClp + monthlyNetClp * 12
  };
}