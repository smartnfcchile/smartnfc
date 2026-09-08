export type ProfileEditPolicy = "FLEXIBLE" | "CORPORATE" | "ADMIN_ONLY";
export type ProfileEditScope = "FULL" | "PERSONAL_ONLY" | "NONE";

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
