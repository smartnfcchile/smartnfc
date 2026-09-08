import { prisma } from "./prisma";

export type ProfileEditPolicy = "FLEXIBLE" | "CORPORATE" | "ADMIN_ONLY";
export type ProfileEditScope = "FULL" | "PERSONAL_ONLY" | "NONE";

type UserRole = "SUPERADMIN" | "COMPANY_OWNER" | "COMPANY_ADMIN" | "COLLABORATOR";

export const PROFILE_EDIT_POLICIES: Array<{
  value: ProfileEditPolicy;
  title: string;
  description: string;
}> = [
  {
    value: "FLEXIBLE",
    title: "Flexible",
    description: "Administradores y titular de la tarjeta pueden editar el perfil completo.",
  },
  {
    value: "CORPORATE",
    title: "Identidad corporativa protegida",
    description: "La empresa controla diseño, imágenes e identidad corporativa; el titular mantiene actualizables sus datos personales y profesionales.",
  },
  {
    value: "ADMIN_ONLY",
    title: "Sólo administradores",
    description: "Las tarjetas son configuradas exclusivamente por administradores de la empresa.",
  },
];

export function isCompanyAdminRole(role: string): boolean {
  return role === "COMPANY_OWNER" || role === "COMPANY_ADMIN";
}

export async function getCompanyProfileEditPolicy(companyId: string): Promise<ProfileEditPolicy> {
  const rows = await prisma.$queryRaw<Array<{ profileEditPolicy: string }>>`
    SELECT "profileEditPolicy"
    FROM "Company"
    WHERE "id" = ${companyId}
    LIMIT 1
  `;
  const value = rows[0]?.profileEditPolicy;
  if (value === "CORPORATE" || value === "ADMIN_ONLY") return value;
  return "FLEXIBLE";
}

export async function setCompanyProfileEditPolicy(companyId: string, policy: ProfileEditPolicy): Promise<void> {
  if (!PROFILE_EDIT_POLICIES.some((option) => option.value === policy)) {
    throw new Error("Política de edición no válida.");
  }
  await prisma.$executeRaw`
    UPDATE "Company"
    SET "profileEditPolicy" = ${policy}
    WHERE "id" = ${companyId}
  `;
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
