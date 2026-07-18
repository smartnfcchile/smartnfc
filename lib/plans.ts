import { ProductPlanCode, SmartNfcProduct } from "@prisma/client";

export interface PlanCapacity {
  name: string;
  includedIdentities: number | null;
  includedCampaigns: number | null;
  includedBranches: number | null;
  includedTouchpoints: number | null;
}

export const PRODUCT_PLANS: Record<ProductPlanCode, PlanCapacity> = {
  EMPRESAS_CONECTA: {
    name: "Conecta",
    includedIdentities: 5,
    includedCampaigns: null,
    includedBranches: null,
    includedTouchpoints: null,
  },
  EMPRESAS_CRECE: {
    name: "Crece",
    includedIdentities: 15,
    includedCampaigns: null,
    includedBranches: null,
    includedTouchpoints: null,
  },
  EMPRESAS_ESCALA: {
    name: "Escala",
    includedIdentities: 30,
    includedCampaigns: null,
    includedBranches: null,
    includedTouchpoints: null,
  },
  EMPRESAS_CORPORATIVO: {
    name: "Corporativo",
    includedIdentities: null, // Configurable por el superadministrador
    includedCampaigns: null,
    includedBranches: null,
    includedTouchpoints: null,
  },
  EMPRESAS_HISTORICO: {
    name: "Plan histórico",
    includedIdentities: null, // Se lee dinámicamente desde includedIdentities en la BD
    includedCampaigns: null,
    includedBranches: null,
    includedTouchpoints: null,
  },
  LOCAL_IMPULSA: {
    name: "Impulsa",
    includedIdentities: null,
    includedCampaigns: 1,
    includedBranches: 1,
    includedTouchpoints: 3,
  },
  LOCAL_FUNDADOR: {
    name: "Cliente Fundador",
    includedIdentities: null,
    includedCampaigns: 1,
    includedBranches: 1,
    includedTouchpoints: 3,
  },
  LOCAL_PERSONALIZADO: {
    name: "Personalizado",
    includedIdentities: null, // Configurable por el superadministrador
    includedCampaigns: null,
    includedBranches: null,
    includedTouchpoints: null,
  },
};

export const PRODUCT_NAMES: Record<SmartNfcProduct, string> = {
  EMPRESAS: "Smart NFC Empresas",
  LOCAL: "Smart NFC Local",
};

export const LICENSE_STATUS_NAMES: Record<string, string> = {
  PENDING: "Pendiente",
  ACTIVE: "Activa",
  SUSPENDED: "Suspendida",
  EXPIRED: "Vencida",
  CANCELLED: "Cancelada",
};
