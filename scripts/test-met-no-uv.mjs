import { writeFile } from "node:fs/promises";

const points = [
  ["Chiloé", -41.87, -73.81],
  ["Queullín", -41.88, -72.92],
  ["Fiordo de Aysén", -45.40, -72.69],
];
const results = [];
for (const [name, lat, lon] of points) {
  const url = "https://api.met.no/weatherapi/locationforecast/2.0/complete?" + new URLSearchParams({ lat, lon });
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "SmartNFC-UV-lab/2.1 (+https://www.smartnfc.cl/)" },
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json().catch(() => null);
    const series = payload?.properties?.timeseries ?? [];
    const uv = series.flatMap(entry => {
      const value = entry?.data?.instant?.details?.ultraviolet_index_clear_sky;
      return typeof value === "number" && Number.isFinite(value) && value >= 0 ? [{ time: entry.time, value }] : [];
    });
    results.push({ name, lat, lon, status: response.status, expires: response.headers.get("expires"),
      modified: response.headers.get("last-modified"), updatedAt: payload?.properties?.meta?.updated_at,
      rows: series.length, uvRows: uv.length, uvFirst24h: uv.filter(row => Date.parse(row.time) < Date.parse(series[0]?.time) + 86400000),
      fields: Object.keys(series[0]?.data?.instant?.details ?? {}),
    });
  } catch (error) {
    results.push({ name, error: error instanceof Error ? error.name : "Error" });
  }
}
console.log(JSON.stringify(results, null, 2));
await writeFile("uv-provider-evidence.json", JSON.stringify(results, null, 2));
