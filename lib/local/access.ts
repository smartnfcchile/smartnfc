import { redirect } from "next/navigation";
import { hasCapability } from "../entitlements";
import { prisma } from "../prisma";
import { getCurrentUserContext, requireCompanyAdmin } from "../permissions";
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

const ADMIN_ROLES = new Set(["SUPERADMIN", "COMPANY_OWNER", "COMPANY_ADMIN"]);

// SmartNFC Local es exclusivo de administradores. En navegación de páginas un colaborador
// vuelve al inicio con un aviso, en lugar de ver una pantalla de error. Las acciones y APIs
// siguen usando requireCompanyAdmin/requireLocalAdmin, que rechazan en servidor.
export async function requireLocalAdminPage() {
  const user = await getCurrentUserContext();
  if (!ADMIN_ROLES.has(user.role)) redirect("/dashboard?acceso=local");
  return requireCompanyAdmin();
}

// Page navigation handles commercial denial without exposing an exception screen.
export async function requireLocalPage(capability: import("../entitlements/catalog").Capability = "LOCAL_ACCESS") {
  const actor = await requireLocalAdminPage();
  if (!(await hasCapability(actor.companyId, capability))) redirect("/dashboard/local");
  return requireLocalAdmin();
}
