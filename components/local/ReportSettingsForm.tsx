"use client";
import { useActionState } from "react";
import { saveReportSettings } from "../../app/dashboard/local/reportes/actions";
export default function ReportSettingsForm({companyId,enabled,frequency,recipientIds,users}:{
  companyId:string;enabled:boolean;frequency:string;recipientIds:string[];users:{id:string;name:string|null;email:string}[];
}) {
  const [state,action,pending]=useActionState(saveReportSettings,{});
  return <form action={action} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 dark:bg-slate-900 dark:border-slate-700">
    <input type="hidden" name="companyId" value={companyId}/>
    <h2 className="text-lg font-bold">Entrega automática</h2>
    <label className="flex gap-3 items-center"><input type="checkbox" name="enabled" defaultChecked={enabled}/> Activar reportes para este local</label>
    <label className="block">Frecuencia<select name="frequency" defaultValue={frequency} className="block mt-2 rounded-lg border p-2 bg-transparent">
      <option value="WEEKLY">Semanal · lunes</option><option value="MONTHLY">Mensual · primer día del mes</option>
    </select></label>
    <p className="text-sm text-slate-500">Se envía el periodo anterior cerrado, desde las 08:00 de Chile. El primer informe puede tener cobertura parcial.</p>
    <fieldset className="space-y-2"><legend className="font-semibold mb-2">Destinatarios autorizados</legend>
      {users.map(u=><label key={u.id} className="flex items-start gap-3"><input type="checkbox" name="recipientIds" value={u.id} defaultChecked={recipientIds.includes(u.id)}/>
        <span>{u.name || "Administrador"} <span className="block text-sm text-slate-500">{u.email}</span></span></label>)}
      {!users.length && <p>No hay administradores activos disponibles.</p>}
    </fieldset>
    {state.error && <p role="alert" className="text-red-600">{state.error}</p>}
    {state.success && <p role="status" className="text-green-700">{state.success}</p>}
    <button disabled={pending} className="rounded-xl bg-blue-600 text-white px-5 py-3 font-bold disabled:opacity-50">{pending?"Guardando…":"Guardar preferencias"}</button>
  </form>;
}
