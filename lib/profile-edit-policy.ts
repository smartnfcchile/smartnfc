import { prisma } from "./prisma";
import {
  PROFILE_EDIT_POLICIES,
  type ProfileEditPolicy,
  type ProfileEditScope,
} from "./profile-edit-policy-shared";

export type { ProfileEditPolicy, ProfileEditScope } from "./profile-edit-policy-shared";

type UserRole = "SUPERADMIN" | "COMPANY_OWNER" | "COMPANY_ADMIN" | "COLLABORATOR";

export function isCompanyAdminRole(role: string): boolean {
  return role === "COMPANY_OWNER" || role === "COMPANY_ADMIN";
}

export async function getCompanyProfileEditPolicy(companyId: string): Promise<ProfileEditPolicy> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { profileEditPolicy: true },
  });

  const value = company?.profileEditPolicy;
  if (value === "CORPORATE" || value === "ADMIN_ONLY") return value;
  return "FLEXIBLE";
}

export async function setCompanyProfileEditPolicy(companyId: string, policy: ProfileEditPolicy): Promise<void> {
  if (!PROFILE_EDIT_POLICIES.some((option) => option.value === policy)) {
    throw new Error("Política de edición no válida.");
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { profileEditPolicy: policy },
  });
}

export function resolveProfileEditScope(input: {
  userRole: UserRole | string;
  userId: string;
  userCompanyId: string;
  cardUserId: string;
  cardCompanyId: string;
  policy: ProfileEditPolicy;
}): ProfileEditScope {
  const { userRole, userId, userCompanyId, cardUserId, cardCompanyId, policy } = input;

  if (userRole === "SUPERADMIN") return "NONE";
  if (userCompanyId !== cardCompanyId) return "NONE";
  if (isCompanyAdminRole(userRole)) return "FULL";
  if (userRole !== "COLLABORATOR" || userId !== cardUserId) return "NONE";

  if (policy === "ADMIN_ONLY") return "NONE";
  if (policy === "CORPORATE") return "PERSONAL_ONLY";
  return "FULL";
}
