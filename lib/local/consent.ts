import { createHmac, timingSafeEqual } from "node:crypto";

export type PublishedConsent = { campaignId: string; publishedVersion: number; consentVersion: number; consentText: string };
function secret() {
  const value = process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("No se pudo validar el consentimiento.");
  return value;
}
export function signConsent(consent: PublishedConsent) {
  return createHmac("sha256", secret()).update(JSON.stringify(consent)).digest("hex");
}
export function verifyConsent(consent: PublishedConsent, signature: string) {
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signConsent(consent), "hex"), Buffer.from(signature, "hex"));
}
