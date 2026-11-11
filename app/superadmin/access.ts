import { cache } from "react";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "../../lib/permissions";

export const requireSuperadminPage = cache(async () => {
  try {
    return await requireSuperAdmin();
  } catch {
    redirect("/login?error=superadminRequired");
  }
});
