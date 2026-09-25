// Períodos del dashboard de SmartNFC Local (hora de Chile, igual que los reportes). Módulo puro.
// La comparación usa el MISMO TRAMO del período anterior (p. ej. "esta semana hasta ahora" contra
// "la semana pasada hasta el mismo momento"), para no comparar un período parcial con uno completo.
import { REPORT_TIMEZONE, dayAt, periodStart, previousPeriod, shift, startOfDay, type Day } from "./report-period";

export const ANALYTICS_PERIODS = ["today", "week", "lastweek", "month", "custom"] as const;
export type AnalyticsPeriodKey = (typeof ANALYTICS_PERIODS)[number];
export const ANALYTICS_PERIOD_LABELS: Record<AnalyticsPeriodKey, string> = {
  today: "Hoy", week: "Esta semana", lastweek: "Última semana", month: "Este mes", custom: "Personalizado",
};
export const MAX_CUSTOM_DAYS = 366;

export type AnalyticsRange = { start: Date; end: Date };
export type AnalyticsPeriod = AnalyticsRange & {
  key: AnalyticsPeriodKey; label: string; description: string;
  compare: (AnalyticsRange & { label: string }) | null;
  /** Días (AAAA-MM-DD, hora de Chile) cubiertos, para la evolución diaria. */
  days: string[];
  /** Fechas efectivas del rango personalizado (para rellenar el formulario). */
  from: string; to: string;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const dayKey = (d: Day) => `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
const parseDay = (v: string | undefined): Day | null => {
  if (!v || !DAY.test(v)) return null;
  const [year, month, day] = v.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  return check.getUTCMonth() === month - 1 && check.getUTCDate() === day ? { year, month, day } : null;
};
function daysBetween(start: Date, end: Date): string[] {
  const out: string[] = [];
  let d = dayAt(start);
  const last = dayKey(dayAt(new Date(end.getTime() - 1)));
  for (let i = 0; i < MAX_CUSTOM_DAYS + 1; i++) { const k = dayKey(d); out.push(k); if (k >= last) break; d = shift(d, 1); }
  return out;
}
const fmt = new Intl.DateTimeFormat("es-CL", { timeZone: REPORT_TIMEZONE, day: "numeric", month: "short" });
const fmtLong = new Intl.DateTimeFormat("es-CL", { timeZone: REPORT_TIMEZONE, day: "numeric", month: "short", year: "numeric" });
const rangeText = (start: Date, end: Date) => {
  const a = fmtLong.format(start), b = fmtLong.format(new Date(end.getTime() - 1));
  return a === b ? a : `${fmt.format(start)} – ${b}`;
};
/** Mismo tramo transcurrido dentro del período anterior, sin pasar del inicio del actual. */
const sameElapsed = (prevStart: Date, start: Date, end: Date) => new Date(Math.min(prevStart.getTime() + (end.getTime() - start.getTime()), start.getTime()));

export function resolveAnalyticsPeriod(input: { period?: string; from?: string; to?: string }, now = new Date()): AnalyticsPeriod {
  const key: AnalyticsPeriodKey = (ANALYTICS_PERIODS as readonly string[]).includes(input.period ?? "") ? input.period as AnalyticsPeriodKey : "week";
  const today = dayAt(now);
  let start: Date, end: Date, compare: AnalyticsPeriod["compare"];
  if (key === "today") {
    start = startOfDay(today); end = now;
    const prev = startOfDay(shift(today, -1));
    compare = { start: prev, end: sameElapsed(prev, start, end), label: "ayer a la misma hora" };
  } else if (key === "lastweek") {
    end = periodStart(now, "WEEKLY"); start = previousPeriod(end, "WEEKLY");
    compare = { start: previousPeriod(start, "WEEKLY"), end: start, label: "la semana anterior" };
  } else if (key === "month") {
    start = periodStart(now, "MONTHLY"); end = now;
    const prev = previousPeriod(start, "MONTHLY");
    compare = { start: prev, end: sameElapsed(prev, start, end), label: "el mes pasado al mismo día" };
  } else if (key === "custom") {
    const from = parseDay(input.from) ?? shift(today, -6), toDay = parseDay(input.to) ?? today;
    const [a, b] = dayKey(from) <= dayKey(toDay) ? [from, toDay] : [toDay, from];
    start = startOfDay(a);
    const cappedB = dayKey(b) > dayKey(today) ? today : b;
    end = new Date(Math.min(startOfDay(shift(cappedB, 1)).getTime(), now.getTime()));
    if (daysBetween(start, end).length > MAX_CUSTOM_DAYS) start = startOfDay(shift(dayAt(new Date(end.getTime() - 1)), -(MAX_CUSTOM_DAYS - 1)));
    if (end <= start) end = new Date(start.getTime() + 1);
    const n = daysBetween(start, end).length;
    const prev = startOfDay(shift(dayAt(start), -n));
    compare = { start: prev, end: start, label: `los ${n} días anteriores` };
  } else {
    start = periodStart(now, "WEEKLY"); end = now;
    const prev = previousPeriod(start, "WEEKLY");
    compare = { start: prev, end: sameElapsed(prev, start, end), label: "la semana pasada hasta el mismo momento" };
  }
  const days = daysBetween(start, end);
  return { key, label: ANALYTICS_PERIOD_LABELS[key], description: rangeText(start, end), start, end, compare, days,
    from: days[0], to: days[days.length - 1] };
}
