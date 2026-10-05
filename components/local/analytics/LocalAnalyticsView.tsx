// Presentación de la analítica actual de SmartNFC Local (Bloque F). La usan el dashboard del local y la
// vista de soporte de SuperAdmin (solo lectura). Los datos llegan ya acotados a una empresa (lib/local/analytics.ts).
import Link from "next/link";
import type { AnalyticsTotals, LocalAnalytics } from "../../../lib/local/analytics";
import { ANALYTICS_PERIODS, ANALYTICS_PERIOD_LABELS, type AnalyticsPeriod } from "../../../lib/local/analytics-period";
import { ACTION_REGISTRY, PUBLIC_ACTION_TYPES, type PublicActionType } from "../../../lib/local/public-actions";
import { ActionGlyph } from "../public/action-icons";
import DailyBars from "./DailyBars";

const n = (v: number) => v.toLocaleString("es-CL");
const isActionType = (t: string): t is PublicActionType => (PUBLIC_ACTION_TYPES as readonly string[]).includes(t);

function Delta({ current, previous, label }: { current: number; previous: number | undefined; label: string }) {
  if (previous === undefined) return null;
  if (!previous && !current) return <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Sin actividad en {label}</p>;
  if (!previous) return <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Sin datos en {label} para comparar</p>;
  const pct = Math.round(((current - previous) / previous) * 100);
  const tone = pct > 0 ? "text-emerald-700 dark:text-emerald-400" : pct < 0 ? "text-rose-700 dark:text-rose-400" : "text-slate-500 dark:text-slate-400";
  return <p className={`mt-1 text-xs ${tone}`}><span aria-hidden>{pct > 0 ? "▲" : pct < 0 ? "▼" : "="}</span> {pct > 0 ? "+" : ""}{pct}% <span className="text-slate-500 dark:text-slate-400">vs {label} ({n(previous)})</span></p>;
}

function Tile({ label, hint, value, metric, totals, previous, compareLabel, children }: {
  label: string; hint: string; value: number; metric: keyof AnalyticsTotals; totals: AnalyticsTotals; previous: AnalyticsTotals | null; compareLabel: string; children?: React.ReactNode;
}) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</p>
    <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{n(value)}</p>
    <Delta current={totals[metric]} previous={previous?.[metric]} label={compareLabel} />
    {children}
  </div>;
}

export default function LocalAnalyticsView({ data, period, basePath }: { data: LocalAnalytics; period: AnalyticsPeriod; basePath: string }) {
  const t = data.totals, prev = data.previous ?? null, cmp = period.compare?.label ?? "";
  const days = period.days.map(day => data.daily.find(d => d.day === day) ?? { day, visits: 0, clicks: 0 });
  const maxAction = Math.max(1, ...data.actions.map(a => a.clicks));
  return <div className="space-y-8">
    <section aria-label="Período" className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {ANALYTICS_PERIODS.map(key => <Link key={key} href={`${basePath}?period=${key}`} aria-current={period.key === key ? "page" : undefined}
          className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${period.key === key ? "bg-blue-600 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"}`}>{ANALYTICS_PERIOD_LABELS[key]}</Link>)}
      </div>
      {period.key === "custom" && <form method="get" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="period" value="custom"/>
        <label className="text-sm">Desde<input type="date" name="from" defaultValue={period.from} className="mt-1 block rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"/></label>
        <label className="text-sm">Hasta<input type="date" name="to" defaultValue={period.to} className="mt-1 block rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"/></label>
        <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Ver período</button>
      </form>}
      <p className="text-sm text-slate-500 dark:text-slate-400">{period.label}: {period.description} (hora de Chile). Comparado con {cmp}.</p>
      {data.incidents > 0 && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">Se detectaron {n(data.incidents)} incidencias de medición en este período: las cifras pueden estar incompletas.</p>}
    </section>

    <section aria-label="Resumen del período" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Tile label="Accesos" hint="Toques NFC, escaneos QR y enlaces directos" value={t.visits} metric="visits" totals={t} previous={prev} compareLabel={cmp}>
        <p className="mt-3 flex flex-wrap gap-x-3 text-xs text-slate-600 dark:text-slate-300"><span>NFC {n(t.nfc)}</span><span>QR {n(t.qr)}</span><span>Enlace {n(t.direct)}</span></p>
      </Tile>
      <Tile label="Vistas de la página del local" hint="Puntos en “Mostrar página del local”" value={t.landingViews} metric="landingViews" totals={t} previous={prev} compareLabel={cmp}/>
      <Tile label="Clics en acciones" hint="Botones tocados en la página del local" value={t.actionClicks} metric="actionClicks" totals={t} previous={prev} compareLabel={cmp}>
        {t.landingViews > 0 && <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">{n(Math.round((t.actionClicks / t.landingViews) * 100))} clics por cada 100 vistas de página</p>}
      </Tile>
      <Tile label="Salidas directas" hint="Puntos en “Abrir directamente” que llevaron al destino" value={t.directExits} metric="directExits" totals={t} previous={prev} compareLabel={cmp}/>
      <Tile label="Nuevas suscripciones al Club" hint="Personas que se registraron y aceptaron el consentimiento" value={t.newSubscribers} metric="newSubscribers" totals={t} previous={prev} compareLabel={cmp}>
        {(t.clubWhatsapp > 0 || t.clubContacts > 0) && <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">Clics en confirmar por WhatsApp {n(t.clubWhatsapp)} · Clics en Guardar contacto {n(t.clubContacts)}</p>}
      </Tile>
    </section>

    {!t.visits && !data.incidents && <p className="text-slate-600 dark:text-slate-300">No se registraron accesos en este período. Cero actividad registrada no prueba que no haya habido visitantes.</p>}

    {days.length > 1 && t.visits > 0 && <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <DailyBars data={days} title="Accesos por día"/>
    </section>}

    {data.points.length > 0 && <section className="min-w-0 space-y-3">
        <h2 className="text-lg font-bold">Puntos más usados</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700"><table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60"><tr><th className="p-3 font-semibold">Punto</th><th className="p-3 font-semibold">Objetivo</th><th className="p-3 text-right font-semibold">Accesos</th><th className="p-3 text-right font-semibold">Clics</th></tr></thead>
          <tbody className="tabular-nums">{data.points.slice(0, 10).map(p => <tr key={p.id} className="border-t border-slate-200 dark:border-slate-700">
            <td className="p-3"><span className="block font-medium">{p.name}</span>{p.location && <span className="block text-xs text-slate-500 dark:text-slate-400">{p.location}</span>}</td>
            <td className="p-3"><span className="block">{p.objective}</span><span className="block text-xs text-slate-500 dark:text-slate-400">{p.mode}</span></td>
            <td className="p-3 text-right">{n(p.visits)}</td><td className="p-3 text-right">{n(p.clicks)}</td></tr>)}</tbody>
        </table></div>
      </section>}

    <div className="grid gap-6 xl:grid-cols-2">


      {data.actions.length > 0 && <section className="min-w-0 space-y-3">
        <h2 className="text-lg font-bold">Acciones más tocadas</h2>
        <ul className="space-y-2.5">{data.actions.map(a => {
          return <li key={a.type} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2"><ActionGlyph type={isActionType(a.type) ? a.type : "LINK"} size="xs"/><span className="truncate">{a.type === "SAVE_CONTACT" ? "Clics en Guardar contacto" : isActionType(a.type) ? ACTION_REGISTRY[a.type].name : a.type}</span></span>
            <span className="h-2.5 rounded-r-[4px] bg-blue-600 dark:bg-blue-500" style={{ width: `${(a.clicks / maxAction) * 100}%` }} aria-hidden/>
            <span className="tabular-nums text-slate-700 dark:text-slate-200">{n(a.clicks)}</span>
          </li>;
        })}</ul>
        <p className="text-xs text-slate-500 dark:text-slate-400">Un clic indica que la persona tocó el botón; no confirma un mensaje enviado, una reseña, un seguidor ni una compra.</p>
      </section>}

      {data.objectives.length > 0 && <section className="min-w-0 space-y-3">
        <h2 className="text-lg font-bold">Accesos por objetivo</h2>
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 text-sm dark:divide-slate-700 dark:border-slate-700">{data.objectives.map(o =>
          <li key={o.objective} className="flex justify-between p-3"><span>{o.label}</span><span className="tabular-nums">{n(o.visits)}</span></li>)}</ul>
      </section>}

      {data.locations.length > 1 && <section className="min-w-0 space-y-3">
        <h2 className="text-lg font-bold">Accesos por local</h2>
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 text-sm dark:divide-slate-700 dark:border-slate-700">{data.locations.map(l =>
          <li key={l.id} className="flex justify-between p-3"><span>{l.name}</span><span className="tabular-nums">{n(l.visits)}</span></li>)}</ul>
      </section>}
    </div>

    <p className="text-xs text-slate-500 dark:text-slate-400">Un acceso es una visita, no una persona única. Las salidas directas y los clics en la página del local se miden por separado porque no significan lo mismo. Los reportes automáticos por correo estarán disponibles próximamente.</p>
  </div>;
}
