// Decisiones del seed sobre cuentas, sin acceso a base de datos.

import crypto from "node:crypto";

export type SuperadminAction =
  | { action: "create" }
  | { action: "refresh-existing-superadmin"; updatePassword: boolean }
  | { action: "refuse-promotion"; reason: string };

// El seed nunca eleva privilegios: solo crea un SUPERADMIN nuevo o actualiza uno que ya lo era.
export function decideSuperadminSeed(existing: { role: string } | null, passwordProvided: boolean): SuperadminAction {
  if (!existing) return { action: "create" };
  if (existing.role === "SUPERADMIN") return { action: "refresh-existing-superadmin", updatePassword: passwordProvided };
  return {
    action: "refuse-promotion",
    reason: "ya existe un usuario con ese correo y otro rol; el seed no promueve cuentas existentes a SUPERADMIN",
  };
}

// Contraseña para cuentas creadas por el seed: la del entorno o una aleatoria (nunca un literal).
export function seedPassword(fromEnv: string | undefined): { value: string; generated: boolean } {
  const provided = fromEnv?.trim();
  if (provided) return { value: provided, generated: false };
  return { value: crypto.randomBytes(12).toString("base64url"), generated: true };
}

export const DEMO_USER_EMAIL = "demo@smartnfc.test";
