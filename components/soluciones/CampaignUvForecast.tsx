import type { CampaignBlock } from "../../lib/soluciones/campaign-content";
import { summarizeMetUv, type MetUvSeries } from "../../lib/soluciones/met-uv";

type Block = Extract<CampaignBlock, { type: "uv-forecast" }>;

export default function CampaignUvForecast({ block, forecast, asOf }: { block: Block; forecast?: MetUvSeries; asOf?: string }) {
  const view = forecast && asOf ? summarizeMetUv(forecast, block.timezone, new Date(asOf)) : null;
  const clock = new Intl.DateTimeFormat("es-CL", { timeZone: block.timezone, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const hour = new Intl.DateTimeFormat("es-CL", { timeZone: block.timezone, hour: "2-digit", minute: "2-digit" });
  const level = view?.current == null ? null : Math.round(view.current);
  const label = level === null ? null : level <= 2 ? "Bajo" : level <= 5 ? "Moderado" : level <= 7 ? "Alto" : level <= 10 ? "Muy alto" : "Extremo";
  return <section className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-slate-950">
    <h2 className="text-xl font-black">{block.title}</h2>
    <p className="text-xs font-semibold">Pronóstico para cielo despejado · No es una medición real</p>
    {view?.current != null || view?.max != null ? <>
      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white p-2"><dt className="text-xs font-medium">UV para esta hora</dt><dd className="text-2xl font-black">{view.current?.toLocaleString("es-CL") ?? "—"}</dd>{label && <span className="text-xs font-semibold">{label}</span>}</div>
        <div className="rounded-lg bg-white p-2"><dt className="text-xs font-medium">Máx. previsto en horas disponibles de hoy</dt><dd className="text-2xl font-black">{view.max?.toLocaleString("es-CL") ?? "—"}</dd></div>
      </dl>
      {view.chart.length > 0 && <ul aria-label="Pronóstico por hora" className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {view.chart.map(sample => <li key={sample.at} className="text-center text-[0.65rem]"><div className="flex h-12 items-end justify-center"><div aria-hidden="true" className="w-4 rounded-t bg-amber-600" style={{ height: Math.max(2, Math.min(sample.value * 4, 48)) }} /></div><strong className="block">{sample.value.toLocaleString("es-CL")}</strong>{hour.format(new Date(sample.at))}</li>)}
      </ul>}
      {level !== null && level >= 3 && <p className="text-sm">Usa la protección indicada para tu trabajo y reduce la exposición directa.</p>}
      <p className="text-xs">Actualización del modelo: {clock.format(new Date(forecast!.updatedAt))} (hora del centro).</p>
    </> : <p className="text-sm">Pronóstico UV no disponible para este centro. Sigue las medidas preventivas de tu lugar de trabajo.</p>}
    <p className="text-xs"><a className="underline" href="https://www.met.no/en" rel="noreferrer">Norwegian Meteorological Institute (MET Norway)</a> · <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" rel="noreferrer">CC BY 4.0</a></p>
  </section>;
}
