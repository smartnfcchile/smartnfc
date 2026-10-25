export type PointKind = "local" | "physical";
export type InstallationInput = {
  latitude: number; longitude: number; address: string | null; label: string | null;
  accuracyMeters: number | null; method: "MANUAL" | "MAP" | "ADDRESS"; visibility: "PRIVATE";
};
export class LocationError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function pointKind(value: string): PointKind {
  if (value !== "local" && value !== "physical") throw new LocationError("Tipo de punto inválido.");
  return value;
}
export function validCoordinates(lat: unknown, lng: unknown): boolean {
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
export function parseInstallation(value: unknown): InstallationInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new LocationError("Solicitud inválida.");
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some(k => !["latitude", "longitude", "address", "label", "accuracyMeters", "method", "visibility"].includes(k))) throw new LocationError("Campo no permitido.");
  if (!validCoordinates(v.latitude, v.longitude)) throw new LocationError("Ingresa latitud entre -90 y 90 y longitud entre -180 y 180.");
  const text = (name: string, max: number) => {
    const s = v[name];
    if (s == null) return null;
    if (typeof s !== "string" || s.length > max) throw new LocationError(`Campo ${name} inválido (máximo ${max} caracteres).`);
    return s.trim() || null;
  };
  if (v.accuracyMeters != null && (typeof v.accuracyMeters !== "number" || !Number.isFinite(v.accuracyMeters) || v.accuracyMeters < 0 || v.accuracyMeters > 100000)) throw new LocationError("Precisión inválida.");
  const method = v.method ?? "MANUAL";
  if (!["MANUAL", "MAP", "ADDRESS"].includes(method as string)) throw new LocationError("Método inválido.");
  if (v.visibility !== undefined && v.visibility !== "PRIVATE") throw new LocationError("Esta versión solo admite ubicaciones privadas.");
  return { latitude: v.latitude as number, longitude: v.longitude as number, address: text("address", 300), label: text("label", 120),
    accuracyMeters: (v.accuracyMeters as number | null) ?? null, method: method as InstallationInput["method"], visibility: "PRIVATE" };
}
export function installationDto(row: (InstallationInput & { updatedAt: Date }) | null) {
  return row ? { status: "CONFIGURED" as const, latitude: row.latitude, longitude: row.longitude, address: row.address,
    label: row.label, accuracyMeters: row.accuracyMeters, method: row.method, visibility: row.visibility, updatedAt: row.updatedAt.toISOString() }
    : { status: "PENDING" as const };
}
