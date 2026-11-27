"use client";

import { useState, type CSSProperties } from "react";
import { locateOnce, type GeoResult, type LocationMode } from "../../lib/soluciones/smartnfc-geo";
import styles from "./CampaignUvPremium.module.css";

export type UvReading = {
  current: number | null;
  max: number | null;
  hour: string;
  updated: string;
  chart: { hour: string; value: number }[];
};

const bands = [
  { label: "Bajo", color: "#299B32", ink: "#111827" },
  { label: "Moderado", color: "#E7CF00", ink: "#111827" },
  { label: "Alto", color: "#F58000", ink: "#111827" },
  { label: "Muy alto", color: "#DB1837", ink: "#fff" },
  { label: "Extremo", color: "#793CB5", ink: "#fff" },
];
const messages = {
  idle: "Usa tu ubicaci�n solo si lo autorizas.",
  locating: "Obteniendo ubicaci�n.",
  located: "Ubicaci�n obtenida. El pron�stico para el tel�fono a�n no est� disponible.",
  blocked: "La pol�tica de esta p�gina bloquea la ubicaci�n.",
  denied: "No se concedi� permiso para usar la ubicaci�n.",
  timeout: "El tel�fono tard� demasiado en entregar su ubicaci�n.",
  inaccurate: "La ubicaci�n recibida no tiene suficiente precisi�n.",
  unsupported: "Este navegador o conexi�n no admite la ubicaci�n.",
  unavailable: "El tel�fono no pudo determinar su ubicaci�n.",
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
  const tip = level >= 3 ? "Reduce la exposici�n directa y coordina las tareas seg�n el protocolo del centro."
    : level >= 1 ? "Usa la protecci�n indicada para tu tarea y toma las pausas bajo sombra."
    : "Sigue las medidas preventivas de tu centro, incluso en d�as nublados.";
  async function locate() {
    setStatus("locating");
    // Keep exact coordinates out of React state, logging, requests and storage.
    const { status: result } = await locateOnce({ maxAccuracyMeters: 500, timeoutMs: 10_000 });
    setStatus(result);
  }
  return <section className={styles.card} aria-label="Pron�stico UV">
    <header className={styles.top}>
      <div><h2>�ndice UV</h2><small>{title} � {mode === "mobile" ? "Tel�fono" : mode === "hybrid" ? "Centro de respaldo" : "Ubicaci�n del centro"}</small></div>
      <span>{preview ? "SIMULADO" : "PRON�STICO"}</span>
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
      <div><strong>{value === null ? "-" : format.format(value)}</strong><small>�NDICE UV</small></div>
    </div>
    <p className={styles.risk} style={{ "--risk": band?.color, "--risk-ink": band?.ink } as CSSProperties}>{band ? `Riesgo ${band.label.toLowerCase()}` : "Pron�stico no disponible"}</p>
    <dl className={styles.values}>
      <div><dt>Hora local de referencia</dt><dd>{reading?.hour ?? "-"}</dd></div>
      <div><dt>M�ximo diario previsto</dt><dd>{reading?.max == null ? "-" : format.format(reading.max)}</dd></div>
    </dl>
    {!!reading?.chart.length && <ul className={styles.chart} aria-label="Pron�stico horario">{reading.chart.map(sample =>
      <li key={sample.hour}><strong>{format.format(sample.value)}</strong><i aria-hidden="true" style={{ height: Math.min(40, Math.max(2, sample.value * 3)) }} /><span>{sample.hour}</span></li>
    )}</ul>}
    {mobile && <><button type="button" disabled={status === "locating" || preview} onClick={locate}>
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 1v4m0 14v4M1 12h4m14 0h4" /></svg>
      {status === "located" ? "Actualizar mi ubicaci�n" : "Usar mi ubicaci�n"}
    </button><p role="status">{preview ? "La ubicaci�n se solicita en la landing p�blica." : messages[status]}</p></>}
    <p className={styles.tip}>{tip}</p>
    <p className={styles.legal}>Cielo despejado � Pron�stico, no medici�n real{preview ? " � Valores simulados" : ""}. {reading?.updated && `Actualizaci�n: ${reading.updated}. `}
      Fuente: <a href="https://www.met.no/en" rel="noreferrer">MET Norway</a> � <a href="https://creativecommons.org/licenses/by/4.0/" rel="noreferrer">CC BY 4.0</a>.
    </p>
  </section>;
}

