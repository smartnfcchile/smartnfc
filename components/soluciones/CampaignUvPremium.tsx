"use client";

import { useState, type CSSProperties } from "react";
import { locateOnce, type GeoResult, type LocationMode } from "../../lib/soluciones/smartnfc-geo";
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

export default function CampaignUvPremium({ title, mode, reading, preview = false }: {
  title: string; mode: LocationMode; reading?: UvReading; preview?: boolean;
}) {
  const [status, setStatus] = useState<GeoResult["status"] | "idle" | "locating">("idle");
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
    const { status: result } = await locateOnce({ maxAccuracyMeters: 500, timeoutMs: 10_000 });
    setStatus(result);
  }
  return <section className={styles.card} aria-label="Pronóstico UV">
    <header className={styles.top}>
      <div><h2>Índice UV</h2><small>{title} · {mode === "mobile" ? "Teléfono" : mode === "hybrid" ? "Centro de respaldo" : "Ubicación del centro"}</small></div>
      <span>{preview ? "SIMULADO" : "PRONÓSTICO"}</span>
    </header>
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
    <p className={styles.risk} style={{ "--risk": band?.color, "--risk-ink": band?.ink } as CSSProperties}>{band ? `Riesgo ${band.label.toLowerCase()}` : "Pronóstico UV no disponible para este centro."}</p>
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
    </button><p role="status">{preview ? "La ubicación se solicita en la landing pública." : messages[status]}</p></>}
    <p className={styles.tip}>{tip}</p>
    <p className={styles.legal}>Cielo despejado · Pronóstico, no medición real{preview ? " · Valores simulados" : ""}. {reading?.updated && `Actualización: ${reading.updated}. `}
      Fuente: <a href="https://www.met.no/en" rel="noreferrer">MET Norway</a> · <a href="https://creativecommons.org/licenses/by/4.0/" rel="noreferrer">CC BY 4.0</a>.
    </p>
  </section>;
}
