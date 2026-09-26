"use client";
// Evolución diaria de accesos (una serie). Barras finas desde una línea base, etiqueta solo en el máximo,
// tooltip por barra al pasar el cursor o con el teclado, y la misma información como tabla.
import { useState } from "react";

const dayLabel = new Intl.DateTimeFormat("es-CL", { timeZone: "UTC", weekday: "short", day: "numeric" });
const dayLong = new Intl.DateTimeFormat("es-CL", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const at = (day: string) => new Date(day + "T12:00:00Z");
const n = (v: number) => v.toLocaleString("es-CL");

export default function DailyBars({ data, title }: { data: Array<{ day: string; visits: number; clicks: number }>; title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map(d => d.visits));
  const maxIndex = data.findIndex(d => d.visits === max);
  const labelEvery = data.length > 16 ? Math.ceil(data.length / 8) : 1;
  const current = active === null ? null : data[active];
  return (
    <figure className="space-y-3">
      <figcaption className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</figcaption>
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-slate-200 dark:border-slate-700" aria-hidden />
        {data.length > 16 && <span className="pointer-events-none absolute -top-2.5 right-0 bg-white px-1 text-[11px] tabular-nums text-slate-400 dark:bg-slate-900" aria-hidden>{n(max)}</span>}
        <div role="group" aria-label={title} className="flex h-40 items-end gap-[2px] border-b border-slate-300 pt-3 dark:border-slate-600">
          {data.map((d, i) => (
            <button key={d.day} type="button" aria-label={`${dayLong.format(at(d.day))}: ${n(d.visits)} accesos, ${n(d.clicks)} clics en acciones`}
              onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}
              className="group relative flex h-full min-w-0 flex-1 items-end justify-center outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              {i === maxIndex && d.visits > 0 && data.length <= 16 && (
                <span className="absolute text-[11px] font-semibold tabular-nums text-slate-600 dark:text-slate-300" style={{ bottom: `calc(${(d.visits / max) * 100}% + 2px)` }}>{n(d.visits)}</span>
              )}
              <span className={`block w-full max-w-[24px] rounded-t-[4px] bg-blue-600 transition-opacity dark:bg-blue-500 ${active !== null && active !== i ? "opacity-50" : ""}`}
                style={{ height: `${(d.visits / max) * 100}%`, minHeight: d.visits ? 2 : 0 }} />
            </button>
          ))}
        </div>
        {current && (
          <div role="status" className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
            <span className="font-semibold">{dayLong.format(at(current.day))}</span> · {n(current.visits)} accesos · {n(current.clicks)} clics
          </div>
        )}
        <div className="mt-1.5 flex gap-[2px]" aria-hidden>
          {data.map((d, i) => <span key={d.day} className="min-w-0 flex-1 truncate text-center text-[10px] text-slate-500 dark:text-slate-400">{i % labelEvery === 0 ? dayLabel.format(at(d.day)) : ""}</span>)}
        </div>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-slate-500 dark:text-slate-400">Ver como tabla</summary>
        <table className="mt-2 w-full text-left text-sm">
          <thead><tr className="border-b border-slate-200 dark:border-slate-700"><th className="py-1.5 font-semibold">Día</th><th className="py-1.5 text-right font-semibold">Accesos</th><th className="py-1.5 text-right font-semibold">Clics en acciones</th></tr></thead>
          <tbody className="tabular-nums">{data.map(d => <tr key={d.day} className="border-b border-slate-100 dark:border-slate-800"><td className="py-1.5">{dayLong.format(at(d.day))}</td><td className="py-1.5 text-right">{n(d.visits)}</td><td className="py-1.5 text-right">{n(d.clicks)}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}
