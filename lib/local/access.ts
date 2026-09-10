import { prisma } from "../prisma";
import { requireCompanyAdmin } from "../permissions";
import { isLicenseValid, requireProductAccess } from "../product-access";

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
    include: { company: { include: { productLicenses: { where: { product: "LOCAL" } } } } }
  });
  if (!campaign || !campaign.company.isActive || campaign.status !== "PUBLISHED" ||
      !campaign.publishedSnapshot || !isLicenseValid(campaign.company.productLicenses[0] ?? null)) return null;
  return campaign;
}
