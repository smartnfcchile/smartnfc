export type MetUvSample = { at: string; value: number };
export type MetUvSeries = { updatedAt: string; samples: MetUvSample[] };

export function parseMetUv(payload: unknown): MetUvSeries {
  const input = payload as { properties?: { meta?: { updated_at?: unknown }; timeseries?: unknown } } | null;
  const updatedAt = input?.properties?.meta?.updated_at;
  const rows = input?.properties?.timeseries;
  if (typeof updatedAt !== "string" || !Number.isFinite(Date.parse(updatedAt)) || !Array.isArray(rows) || rows.length > 300) {
    throw new Error("Invalid MET forecast");
  }
  const samples = rows.flatMap(row => {
    const value: unknown = row?.data?.instant?.details?.ultraviolet_index_clear_sky;
    return typeof row?.time === "string" && Number.isFinite(Date.parse(row.time)) &&
      typeof value === "number" && Number.isFinite(value) && value >= 0 ? [{ at: new Date(row.time).toISOString(), value }] : [];
  }).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  if (!samples.length) throw new Error("MET UV unavailable");
  return { updatedAt: new Date(updatedAt).toISOString(), samples };
}

export function summarizeMetUv(series: MetUvSeries, timezone: string, now: Date) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });
  const today = date.format(now);
  const current = series.samples.find(sample => Date.parse(sample.at) <= now.getTime() &&
    now.getTime() - Date.parse(sample.at) < 3600000);
  const day = series.samples.filter(sample => date.format(new Date(sample.at)) === today);
  return {
    current: current?.value ?? null,
    max: day.length ? Math.max(...day.map(sample => sample.value)) : null,
    chart: day.filter(sample => Date.parse(sample.at) >= now.getTime() - 3600000).slice(0, 8),
  };
}
