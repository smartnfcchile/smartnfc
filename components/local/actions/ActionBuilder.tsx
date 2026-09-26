"use client";
// Action Builder: agrega, configura, ordena, activa/desactiva y elimina acciones públicas de un Punto Inteligente.
// Usa el registro único (lib/local/public-actions.ts) para nombre, texto por defecto, validación e ícono.
// El servidor vuelve a validar todo (pointConfigurationSchema); aquí solo se guía al usuario.
import { useId, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, X as Close } from "lucide-react";
import { ACTION_LIMITS, ACTION_REGISTRY, MAX_POINT_ACTIONS, newActionId, normalizeActionValue, type PublicActionType } from "../../../lib/local/public-actions";
import { ACTION_ICONS } from "../public/action-icons";

export type ActionDraft = { id: string; type: PublicActionType; label: string; value: string; message: string; enabled: boolean };

const GROUPS: Array<{ title: string; types: PublicActionType[] }> = [
  { title: "Mensajes y contacto", types: ["WHATSAPP", "PHONE", "LOCATION"] },
  { title: "Redes sociales", types: ["INSTAGRAM", "FACEBOOK", "TIKTOK", "YOUTUBE", "LINKEDIN", "X", "THREADS"] },
  { title: "Tu negocio", types: ["GOOGLE_REVIEW", "MENU", "PROMOTION", "WEB", "LINK"] },
];
const valueLabel = (type: PublicActionType) =>
  ACTION_REGISTRY[type].input === "whatsapp" ? "Número de WhatsApp" : ACTION_REGISTRY[type].input === "phone" ? "Teléfono" : "Enlace";

/** `id` fijo cuando la acción se crea durante el render (debe coincidir entre servidor y cliente); aleatorio al agregarla. */
export function newActionDraft(type: PublicActionType, value = "", label = "", message = "", id = newActionId()): ActionDraft {
  return { id, type, label, value, message, enabled: true };
}

export default function ActionBuilder({ actions, onChange, title, hint, emptyText, types, firstLabel = "Se muestra primero", addLabel = "Agregar acción" }: {
  actions: ActionDraft[]; onChange: (next: ActionDraft[]) => void; title: string; hint?: string; emptyText: string;
  /** Tipos permitidos (p. ej. solo redes sociales). Por defecto, todos. */
  types?: readonly PublicActionType[]; firstLabel?: string; addLabel?: string;
}) {
  const groups = types ? GROUPS.map(g => ({ ...g, types: g.types.filter(t => types.includes(t)) })).filter(g => g.types.length) : GROUPS;
  const uid = useId();
  const [picking, setPicking] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const update = (id: string, patch: Partial<ActionDraft>) => onChange(actions.map(a => a.id === id ? { ...a, ...patch } : a));
  const move = (index: number, delta: number) => {
    const next = [...actions]; const [item] = next.splice(index, 1); next.splice(index + delta, 0, item); onChange(next);
  };
  const add = (type: PublicActionType) => { onChange([...actions, newActionDraft(type)]); setPicking(false); };
  const full = actions.length >= MAX_POINT_ACTIONS;
  const field = "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

  return (
    <fieldset className="space-y-3">
      <legend className="font-bold">{title}</legend>
      {hint && <p className="text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
      {!actions.length && <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{emptyText}</p>}
      <ol className="space-y-3">
        {actions.map((action, index) => {
          const def = ACTION_REGISTRY[action.type];
          const Icon = ACTION_ICONS[action.type];
          const check = normalizeActionValue(action.type, action.value);
          const error = !check.ok && (touched[action.id] || action.value.trim()) ? check.error : null;
          const base = `${uid}-${action.id}`;
          return (
            <li key={action.id} className={`rounded-xl border p-4 ${action.enabled ? "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" : "border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950"}`}>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"><Icon aria-hidden className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{def.name}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{index === 0 ? firstLabel : `Posición ${index + 1}`}</span>
                </span>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={action.enabled} onChange={e => update(action.id, { enabled: e.target.checked })} />
                  <span>{action.enabled ? "Visible" : "Oculta"}</span>
                </label>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm" htmlFor={`${base}-value`}>{valueLabel(action.type)}
                  <input id={`${base}-value`} className={`${field} mt-1`} value={action.value} placeholder={def.placeholder} maxLength={ACTION_LIMITS.value}
                    inputMode={def.input === "url" ? "url" : "tel"} aria-invalid={!!error} aria-describedby={error ? `${base}-error` : undefined}
                    onChange={e => update(action.id, { value: e.target.value })} onBlur={() => setTouched(t => ({ ...t, [action.id]: true }))} />
                </label>
                <label className="block text-sm" htmlFor={`${base}-label`}>Texto del botón
                  <input id={`${base}-label`} className={`${field} mt-1`} value={action.label} placeholder={def.defaultLabel} maxLength={ACTION_LIMITS.label}
                    onChange={e => update(action.id, { label: e.target.value })} />
                </label>
                {action.type === "WHATSAPP" && (
                  <label className="block text-sm sm:col-span-2" htmlFor={`${base}-message`}>Mensaje sugerido (opcional)
                    <textarea id={`${base}-message`} className={`${field} mt-1`} rows={2} value={action.message} maxLength={ACTION_LIMITS.message}
                      placeholder="Hola, quiero hacer una consulta" onChange={e => update(action.id, { message: e.target.value })} />
                    <span className="text-xs text-slate-500 dark:text-slate-400">La persona podrá editarlo antes de enviarlo.</span>
                  </label>
                )}
              </div>
              {error && <p id={`${base}-error`} role="alert" className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">{def.name}: {error}</p>}
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Subir ${def.name}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 disabled:opacity-40 dark:border-slate-700"><ArrowUp aria-hidden className="h-4 w-4" />Subir</button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === actions.length - 1} aria-label={`Bajar ${def.name}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 disabled:opacity-40 dark:border-slate-700"><ArrowDown aria-hidden className="h-4 w-4" />Bajar</button>
                <button type="button" onClick={() => onChange(actions.filter(a => a.id !== action.id))} aria-label={`Eliminar ${def.name}`}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-rose-700 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300"><Trash2 aria-hidden className="h-4 w-4" />Eliminar</button>
              </div>
            </li>
          );
        })}
      </ol>
      {picking ? (
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div className="flex items-center justify-between"><p className="font-semibold">¿Qué quieres que haga la persona?</p>
            <button type="button" onClick={() => setPicking(false)} aria-label="Cerrar" className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"><Close aria-hidden className="h-4 w-4" /></button></div>
          {groups.map(group => (
            <div key={group.title} className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{group.title}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {group.types.map(type => { const Icon = ACTION_ICONS[type]; return (
                  <button key={type} type="button" onClick={() => add(type)}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-slate-800">
                    <Icon aria-hidden className="h-4 w-4 shrink-0 text-blue-700 dark:text-blue-300" /><span className="truncate">{ACTION_REGISTRY[type].name}</span>
                  </button>); })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <button type="button" onClick={() => setPicking(true)} disabled={full}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-500/40 dark:text-blue-300 dark:hover:bg-slate-800">
          <Plus aria-hidden className="h-4 w-4" />{full ? `Máximo ${MAX_POINT_ACTIONS} acciones` : addLabel}
        </button>
      )}
    </fieldset>
  );
}
