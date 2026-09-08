"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../../lib/prisma";
import { getCurrentUserContext } from "../../../../lib/permissions";
import {
  isCompanyAdminRole,
  setCompanyProfileEditPolicy,
  type ProfileEditPolicy,
} from "../../../../lib/profile-edit-policy";

export async function updateProfileEditPolicyAction(policy: ProfileEditPolicy) {
  const user = await getCurrentUserContext();
  if (!isCompanyAdminRole(user.role)) {
    throw new Error("Solo los administradores de la empresa pueden cambiar esta política.");
  }

  await setCompanyProfileEditPolicy(user.companyId, policy);

  await prisma.adminAuditLog.create({
    data: {
      actorUserId: user.id,
      action: "PROFILE_EDIT_POLICY_UPDATED",
      entityType: "COMPANY",
      entityId: user.companyId,
      companyId: user.companyId,
      metadata: JSON.stringify({ policy }),
    },
  });

  revalidatePath("/dashboard/configuracion/perfiles");
  revalidatePath("/dashboard");
  return { success: true };
}
