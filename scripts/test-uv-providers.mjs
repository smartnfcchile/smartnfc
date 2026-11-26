import { writeFile } from "node:fs/promises";

const points = [{ label: "Chiloé (Los Lagos)", lat: -41.87, lon: -73.81 }, { label: "Fiordo Aysén", lat: -45.40, lon: -72.69 }];
const openMeteo = point => "https://api.open-meteo.com/v1/forecast?" + new URLSearchParams({
  latitude: point.lat, longitude: point.lon, hourly: "uv_index", daily: "uv_index_max",
  timezone: point.label.startsWith("Fiordo") ? "America/Coyhaique" : "America/Santiago", forecast_days: 1,
});
const probes = points.flatMap(point => [
  { provider: "Open-Meteo", point: point.label, url: openMeteo(point) },
  { provider: "OpenWeather 4.0 sin clave", point: point.label, url: `https://api.openweathermap.org/data/4.0/onecall/timeline/1h?lat=${point.lat}&lon=${point.lon}` },
]);
probes.push({ provider: "DMC UVB estaciones", url: "https://climatologia.meteochile.gob.cl/application/productos/recienteUvb" });
const evidence = await Promise.all(probes.map(async ({ url, ...label }) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    const data = await response.json().catch(() => null);
    return { ...label, status: response.status, date: response.headers.get("date"), result: label.provider === "Open-Meteo" && response.ok ? {
      timezone: data?.timezone, grid: [data?.latitude, data?.longitude], day: data?.daily?.time?.[0],
      validHours: data?.hourly?.uv_index?.filter(Number.isFinite).length, dailyMax: data?.daily?.uv_index_max?.[0],
    } : { json: !!data, keys: data && Object.keys(data).slice(0, 12) } };
  } catch (error) {
    return { ...label, error: error instanceof Error ? error.name : "Error" };
  }
}));
console.log(JSON.stringify(evidence, null, 2));
await writeFile("uv-provider-evidence.json", JSON.stringify(evidence, null, 2));
