import { redirect } from "next/navigation";
import { hasCapability } from "../entitlements";
import { prisma } from "../prisma";
import { requireCompanyAdmin } from "../permissions";
import { requireProductAccess } from "../product-access";

export async function requireLocalAdmin(companyId?: string, allowUnavailableRead = false) {
  const actor = await requireCompanyAdmin();
  const target = companyId || actor.companyId;
  if (target !== actor.companyId && actor.role !== "SUPERADMIN") throw new Error("Acceso denegado.");
  const supervising = actor.role === "SUPERADMIN" && allowUnavailableRead;
  if (!supervising) await requireProductAccess(target, "LOCAL");
  const company = await prisma.company.findFirst({ where: { id: target, ...(supervising ? {} : { isActive: true }) } });
  if (!company) throw new Error("Local no disponible.");
  return { actor, company };
}

export async function getPublicLocalCampaign(slug: string) {
  if (!/^[a-z0-9-]{3,30}$/.test(slug)) return null;
  const campaign = await prisma.localCampaign.findUnique({
    where: { slug },
    include: { localLocation: true, company: { include: { productLicenses: { where: { product: "LOCAL" } } } } }
  });
  if (!campaign || !campaign.company.isActive || (campaign.localLocation && !campaign.localLocation.isActive) || campaign.status !== "PUBLISHED" ||
      !campaign.publishedSnapshot || !(await hasCapability(campaign.companyId, "LOCAL_CLUB"))) return null;
  return campaign;
}

// Page navigation handles commercial denial without exposing an exception screen.
export async function requireLocalPage(capability: import("../entitlements/catalog").Capability = "LOCAL_ACCESS") {
  const actor = await requireCompanyAdmin();
  if (!(await hasCapability(actor.companyId, capability))) redirect("/dashboard/local");
  return requireLocalAdmin();
}
