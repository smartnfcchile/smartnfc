"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { locateOnce, type GeoResult, type LocationMode } from "../../lib/soluciones/smartnfc-geo";
import { forecastCell } from "../../lib/soluciones/forecast-cell";
import { summarizeMetUv, type MetUvSeries } from "../../lib/soluciones/met-uv";
import styles from "./CampaignUvPremium.module.css";

export type UvReading = {
  current: number | null;
  max: number | null;
  hour: string;
  updated: string;
  chart: { at: string; hour: string; value: number }[];
};

const bands = [
  { label: "Bajo", color: "#299B32", ink: "#111827" },
  { label: "Moderado", color: "#E7CF00", ink: "#111827" },
  { label: "Alto", color: "#F58000", ink: "#111827" },
  { label: "Muy alto", color: "#DB1837", ink: "#fff" },
  { label: "Extremo", color: "#793CB5", ink: "#fff" },
];
const messages = {
  idle: "Usa tu ubicación solo si lo autorizas.",
  locating: "Obteniendo ubicación.",
  located: "Ubicación obtenida. El pronóstico para el teléfono aún no está disponible.",
  blocked: "La política de esta página bloquea la ubicación.",
  denied: "No se concedió permiso para usar la ubicación.",
  timeout: "El teléfono tardó demasiado en entregar su ubicación.",
  inaccurate: "La ubicación recibida no tiene suficiente precisión.",
  unsupported: "Este navegador o conexión no admite la ubicación.",
  unavailable: "El teléfono no pudo determinar su ubicación.",
};
const format = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 });
const point = (angle: number) => [120 - 96 * Math.cos(angle), 110 - 96 * Math.sin(angle)];

async function requestReading(token: string, timezone: string, signal: AbortSignal, cell?: string): Promise<UvReading | null> {
  try {
    const response = await fetch("/api/uv/forecast", {
      method: "POST", credentials: "same-origin", cache: "no-store", signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cell === undefined ? { token } : { token, cell }),
    });
    if (!response.ok) return null;
    const data = await response.json() as { status: string; source: string; series: MetUvSeries };
    if (data.status !== "available" || data.source !== (cell === undefined ? "center" : "phone")) return null;
    const now = new Date();
    const view = summarizeMetUv(data.series, timezone, now);
    if (view.current === null && view.max === null) return null;
    const clock = new Intl.DateTimeFormat("es-CL", { timeZone: timezone, hour: "2-digit", minute: "2-digit" });
    const updated = new Intl.DateTimeFormat("es-CL", { timeZone: timezone, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    return {
      current: view.current, max: view.max,
      hour: view.current === null ? "-" : clock.format(now),
      updated: updated.format(new Date(data.series.updatedAt)),
      chart: view.chart.map(sample => ({ ...sample, hour: clock.format(new Date(sample.at)) })),
    };
  } catch {
    return null;
  }
}

export default function CampaignUvPremium({ title, mode, reading: initialReading, preview = false, simulated = preview, token, timezone = "America/Santiago" }: {
  title: string; mode: LocationMode; reading?: UvReading; preview?: boolean; simulated?: boolean; token?: string; timezone?: string;
}) {
  const [status, setStatus] = useState<GeoResult["status"] | "idle" | "locating">("idle");
  const [centerReading, setCenterReading] = useState<UvReading | null>(null);
  const [phoneReading, setPhoneReading] = useState<UvReading | null>(null);
  useEffect(() => {
    if (!token || preview || mode === "mobile") return;
    const controller = new AbortController();
    void requestReading(token, timezone, AbortSignal.any([controller.signal, AbortSignal.timeout(5000)])).then(result => {
      if (!controller.signal.aborted) setCenterReading(result);
    });
    return () => controller.abort();
  }, [token, timezone, preview, mode]);
  const reading = phoneReading ?? centerReading ?? initialReading;
  const value = reading?.current ?? null;
  const rounded = value === null ? -1 : Math.round(value);
  const level = rounded < 0 ? -1 : rounded <= 2 ? 0 : rounded <= 5 ? 1 : rounded <= 7 ? 2 : rounded <= 10 ? 3 : 4;
  const band = bands[level];
  const [x, y] = point(Math.PI * (.09 + .2 * level));
  const mobile = mode !== "fixed";
  const tip = level >= 3 ? "Reduce la exposición directa y coordina las tareas según el protocolo del centro."
    : level >= 1 ? "Usa la protección indicada para tu tarea y toma las pausas bajo sombra."
    : "Sigue las medidas preventivas de tu centro, incluso en días nublados.";
  async function locate() {
    setStatus("locating");
    // Keep exact coordinates out of React state, logging, requests and storage.
    setPhoneReading(null);
    const result = await locateOnce({ maxAccuracyMeters: 500, timeoutMs: 10_000 });
    if (token && result.status === "located") {
      const cell = forecastCell(result.latitude, result.longitude);
      if (cell) setPhoneReading(await requestReading(token, timezone, AbortSignal.timeout(5000), cell));
    }
    setStatus(result.status);
  }
  return <section className={styles.card} aria-label="Pronóstico UV">
    <div className={styles.top}>
      <div><h2>Índice UV</h2><small>{title} · {phoneReading || mode === "mobile" ? "Teléfono" : mode === "hybrid" ? "Centro de respaldo" : "Ubicación del centro"}</small></div>
      <span>{simulated ? "SIMULADO" : reading ? "PRONÓSTICO" : "SIN DATOS"}</span>
    </div>
    <div className={styles.gauge}>
      <svg viewBox="0 0 240 116" aria-hidden="true">
        {bands.map(({ color }, index) => {
          const start = point(Math.PI * (index * .2 + .025));
          const end = point(Math.PI * ((index + 1) * .2 - .025));
          return <path key={color} d={`M ${start.join(" ")} A 96 96 0 0 1 ${end.join(" ")}`} stroke={color} fill="none" strokeWidth="12" strokeLinecap="round" />;
        })}
        {band && <circle cx={x} cy={y} r="7" fill="white" stroke="#102743" strokeWidth="2" />}
      </svg>
      <div><strong>{value === null ? "-" : format.format(value)}</strong><small>UV para esta hora</small></div>
    </div>
    <p className={styles.risk} style={{ "--risk": band?.color, "--risk-ink": band?.ink } as CSSProperties}>{band ? `Riesgo ${band.label.toLowerCase()}` : mode === "mobile" ? "Pronóstico UV del teléfono no disponible." : "Pronóstico UV no disponible para este centro."}</p>
    <dl className={styles.values}>
      <div><dt>Hora local de referencia</dt><dd>{reading?.hour ?? "-"}</dd></div>
      <div><dt>Máximo diario previsto</dt><dd>{reading?.max == null ? "-" : format.format(reading.max)}</dd></div>
    </dl>
    {!!reading?.chart.length && <ul className={styles.chart} aria-label="Pronóstico horario">{reading.chart.map(sample =>
      <li key={sample.at}><strong>{format.format(sample.value)}</strong><i aria-hidden="true" style={{ height: Math.min(40, Math.max(2, sample.value * 3)) }} /><span>{sample.hour}</span></li>
    )}</ul>}
    {mobile && <><button type="button" disabled={status === "locating" || preview} onClick={locate}>
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 1v4m0 14v4M1 12h4m14 0h4" /></svg>
      {status === "located" ? "Actualizar mi ubicación" : "Usar mi ubicación"}
    </button><p role="status">{preview ? "La ubicación se solicita en la landing pública." : phoneReading ? "Pronóstico para la zona aproximada del teléfono." : messages[status]}</p></>}
    <p className={styles.tip}>{tip}</p>
    <p className={styles.legal}>{simulated ? "Origen: datos simulados para demostración." : reading ? <>
      Cielo despejado · Pronóstico, no medición real. {reading.updated && `Actualización: ${reading.updated}. `}
      Fuente: <a href="https://www.met.no/en" rel="noreferrer">MET Norway</a> · <a href="https://creativecommons.org/licenses/by/4.0/" rel="noreferrer">CC BY 4.0</a>.
    </> : "Sin datos de pronóstico para mostrar."}</p>
  </section>;
}
