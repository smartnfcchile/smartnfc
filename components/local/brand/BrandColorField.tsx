"use client";
import { normalizeHexColor } from "../../../lib/local/brand";

const PRESETS = ["#2563eb", "#0f766e", "#15803d", "#b45309", "#b91c1c", "#be185d", "#6d28d9", "#0f172a"];

export default function BrandColorField({ id, label, hint, value, fallback, error, onChange }: {
  id: string; label: string; hint: string; value: string; fallback: string; error?: string; onChange: (value: string) => void;
}) {
  const effective = normalizeHexColor(value) ?? fallback;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</label>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      <div className="mt-2.5 flex items-center gap-3">
        <label className="relative h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-xl ring-1 ring-slate-900/10 dark:ring-white/15" style={{ backgroundColor: effective }}>
          <span className="sr-only">Elegir {label.toLowerCase()} con selector</span>
          <input type="color" value={effective} onChange={e => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        </label>
        <input id={id} value={value} onChange={e => onChange(e.target.value)} placeholder={fallback} maxLength={7} spellCheck={false}
          aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
          className={`h-11 w-32 rounded-xl border bg-white px-3 font-mono text-sm uppercase text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500/40 dark:bg-slate-950 dark:text-slate-100 ${error ? "border-rose-400" : "border-slate-300 dark:border-slate-700"}`} />
        <div className="flex flex-wrap gap-1.5" aria-label={`Colores sugeridos para ${label.toLowerCase()}`}>
          {PRESETS.map(color => (
            <button key={color} type="button" onClick={() => onChange(color)} title={color}
              className={`h-6 w-6 rounded-full ring-offset-2 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:ring-offset-slate-900 ${effective === color ? "ring-2 ring-slate-900 dark:ring-white" : "ring-1 ring-slate-900/10"}`}
              style={{ backgroundColor: color }}>
              <span className="sr-only">Usar {color}</span>
            </button>
          ))}
        </div>
      </div>
      {error && <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
