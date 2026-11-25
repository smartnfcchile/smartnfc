export function publicationExpiry(raw: FormDataEntryValue | null): Date | undefined {
  if (raw === null || raw === "") return undefined;
  if (typeof raw !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(raw)) throw new Error("Vencimiento UTC inválido.");
  const date = new Date(raw + ":00Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 16) !== raw) throw new Error("Vencimiento UTC inválido.");
  return date;
}

export function isPublicationExpired(expiresAt: Date | null | undefined, now = Date.now()): boolean {
  return expiresAt != null && expiresAt.getTime() <= now;
}
