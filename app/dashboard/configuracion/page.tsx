import { hasCapability } from "../../../lib/entitlements";
import { getCurrentUserContext } from "../../../lib/permissions";
import { isCompanyAdminRole } from "../../../lib/profile-edit-policy";
import ConfiguracionClient from "./ConfiguracionClient";

export default async function ConfiguracionPage() {
  const user = await getCurrentUserContext();
  // Misma regla que /dashboard/configuracion/perfiles y el menú lateral.
  const canEditPolicy = isCompanyAdminRole(user.role) && (await hasCapability(user.companyId, "PROFILE_EDIT_POLICY"));
  return <ConfiguracionClient canEditPolicy={canEditPolicy} />;
}
