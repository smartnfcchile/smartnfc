import crypto from "crypto";

/**
 * Genera un hash HMAC-SHA-256 seguro de la dirección IP del usuario (Requisito E-1 y E-2).
 * Utiliza la clave dedicada IP_HASH_SECRET o retrocompatibilidad con NEXTAUTH_SECRET (Requisito E-3 y E-4).
 */
export function hashIp(ip: string): string {
  if (!ip) return "";
  const secret = process.env.IP_HASH_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret-nfc-key-2026";
  return crypto.createHmac("sha256", secret).update(ip.trim()).digest("hex");
}
