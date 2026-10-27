"use client";
// Formulario «Agregar local» (BUG-E2E-3): muestra el resultado de saveLocationAction en vez de dejar que un
// error lanzado rompa la página. Mismo diseño y campos que el formulario anterior.
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { saveLocationAction, type LocationFormState } from "../../app/dashboard/local/locales/actions";

export default function LocationCreateForm({ field }: { field: string }) {
  const [state, action, pending] = useActionState(saveLocationAction, null as LocationFormState);
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white"><Plus aria-hidden className="h-4 w-4" />Agregar local</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">Nombre<input name="name" className={`${field} mt-2`} required minLength={2} maxLength={120}/></label>
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">Dirección<input name="address" className={`${field} mt-2`} maxLength={240}/></label>
      </div>
      {state && !state.ok && <p role="alert" className="text-sm font-medium text-rose-700 dark:text-rose-300">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Local creado.</p>}
      <button disabled={pending} className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{pending ? "Creando…" : "Crear local"}</button>
    </form>
  );
}
