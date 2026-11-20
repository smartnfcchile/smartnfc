"use client";

import { useActionState } from "react";
import { submitSolutionCsv, type CsvImportState } from "./import-actions";

const initial: CsvImportState = { message:"", accepted:0, errors:[], applied:false };

export default function CsvImportForm({ companyId, projectId, templateId }: {
  companyId:string; projectId:string; templateId:string;
}) {
  const [state, action, pending] = useActionState(submitSolutionCsv, initial);
  return <form action={action} className="space-y-3 rounded-xl border p-5">
    <h2 className="text-xl font-bold">Importar inventario desde Excel (CSV)</h2>
    <p className="text-sm text-slate-500">
      Exporta tu planilla como CSV UTF-8. Primero previsualiza; al aplicar, los códigos existentes se actualizan y los nuevos se crean.
      Solo se aceptan proyectos en borrador y máximo 500 filas por lote.
    </p>
    <input type="hidden" name="companyId" value={companyId}/>
    <input type="hidden" name="projectId" value={projectId}/>
    <input type="hidden" name="templateId" value={templateId}/>
    <label htmlFor="sol-csv" className="block text-sm font-semibold">Archivo CSV</label>
    <input id="sol-csv" type="file" name="csv" accept=".csv,text/csv" required
      className="block w-full rounded-lg border p-2 text-sm"/>
    <div className="flex flex-wrap gap-2">
      <button disabled={pending} name="operation" value="preview"
        className="rounded-lg bg-slate-700 text-white px-4 py-2 disabled:opacity-50">Previsualizar</button>
      <button disabled={pending} name="operation" value="apply"
        className="rounded-lg bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
        onClick={e=>{ if(!window.confirm("¿Aplicar esta importación? Se actualizarán fichas con el mismo código.")) e.preventDefault(); }}>
        Importar datos
      </button>
    </div>
    {state.message && <div role="status" className="rounded-lg bg-slate-100 text-slate-900 p-3 text-sm">
      <p className="font-semibold">{state.message}</p>
      <p>{state.accepted} registros válidos</p>
      {state.errors.length>0 && <ul className="list-disc pl-5 mt-2">{state.errors.map((e,i)=><li key={i}>{e}</li>)}</ul>}
    </div>}
  </form>;
}