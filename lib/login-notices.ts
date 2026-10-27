// Avisos de /login derivados de la URL (?error=suspended, ?activated=true, ?reset=true).
// Función pura: la página la alimenta con useSearchParams() para que el aviso aparezca tanto al cargar la
// URL directamente como después de router.push() (BUG-E2E-1, 27-oct-2026).

export const LOGIN_NOTICES = {
  suspended: "Tu cuenta o empresa asociada ha sido suspendida. Contacta a soporte.",
  activated: "¡Cuenta activada con éxito! Ya puedes iniciar sesión.",
  reset: "¡Contraseña restablecida con éxito! Ya puedes iniciar sesión.",
} as const;

export type LoginNotices = { error: string; success: string };

export function loginNoticesFromParams(params: { get(name: string): string | null } | null | undefined): LoginNotices {
  if (!params) return { error: "", success: "" };
  const error = params.get("error") === "suspended" ? LOGIN_NOTICES.suspended : "";
  const success = params.get("activated") === "true" ? LOGIN_NOTICES.activated : params.get("reset") === "true" ? LOGIN_NOTICES.reset : "";
  return { error, success };
}
