/**
 * Approximate locations before crossing the browser/server boundary.
 * Version 1 uses 0.01-degree cells (about 1.1 km north–south).
 * East–west width varies with latitude. The cell is not a GPS position.
 */
export function forecastCell(latitude: number, longitude: number): string | null {
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
      !Number.isFinite(longitude) || Math.abs(longitude) > 180) return null;

  return `v1:${Math.round(latitude * 100)}:${Math.round(longitude * 100)}`;
}

export function parseForecastCell(cell: unknown): { latitude: number; longitude: number } | null {
  if (typeof cell !== "string" || cell.length > 24) return null;
  const match = /^v1:(-?\d{1,4}):(-?\d{1,5})$/.exec(cell);
  if (!match) return null;

  const latitude = Number(match[1]) / 100;
  const longitude = Number(match[2]) / 100;
  return forecastCell(latitude, longitude) === cell ? { latitude, longitude } : null;
}
