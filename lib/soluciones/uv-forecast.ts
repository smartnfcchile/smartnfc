export type UvSite = { latitude: number; longitude: number; timezone: string };
export type UvForecast = {
  source: "Open-Meteo";
  retrievedAt: string;
  timezone: string;
  hours: { at: number; uv: number | null }[];
  current: number | null;
  dailyMax: number | null;
};

const isUv = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

export function uvSiteKey(site: UvSite) {
  if (!Number.isFinite(site.latitude) || Math.abs(site.latitude) > 90 ||
      !Number.isFinite(site.longitude) || Math.abs(site.longitude) > 180) throw new Error("Coordenadas inválidas.");
  new Intl.DateTimeFormat("es-CL", { timeZone: site.timezone });
  return `${site.latitude.toFixed(3)},${site.longitude.toFixed(3)},${site.timezone}`;
}

export function normalizeUvForecast(payload: unknown, site: UvSite, now: Date): UvForecast {
  const value = payload as { hourly?: { time?: unknown; uv_index?: unknown }; daily?: { uv_index_max?: unknown } } | null;
  const times = value?.hourly?.time;
  const values = value?.hourly?.uv_index;
  if (!Array.isArray(times) || !Array.isArray(values) || !times.length || times.length !== values.length ||
      times.some((at, i) => !Number.isSafeInteger(at) || (i > 0 && at <= times[i - 1]))) throw new Error("Pronóstico horario no disponible.");
  const hours = times.map((at: number, i) => ({ at, uv: isUv(values[i]) ? values[i] : null }));
  const at = Math.floor(now.getTime() / 1000);
  const current = hours.find(hour => hour.at <= at && at < hour.at + 3600)?.uv ?? null;
  const maxima = value?.daily?.uv_index_max;
  const dailyMax = Array.isArray(maxima) && isUv(maxima[0]) ? maxima[0] : null;
  return { source: "Open-Meteo", retrievedAt: now.toISOString(), timezone: site.timezone, hours, current, dailyMax };
}
