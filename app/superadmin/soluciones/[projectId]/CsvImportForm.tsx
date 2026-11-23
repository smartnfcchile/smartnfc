"use client";

import { useActionState } from "react";
import { submitSolutionCsv, type CsvImportState } from "./import-actions";

const initial: CsvImportState = { message:"", accepted:0, errors:[], applied:false };

export default function CsvImportForm({ companyId, projectId, templateId }: {
  companyId:string; projectId:string; templateId:string;
}) {
  const [state, action, pending] = useActionState(async (previous: CsvImportState, form: FormData) => {
    const file = form.get("csv");
    if (file instanceof File && file.name.toLowerCase().endsWith(".xlsx")) {
      if (!file.size || file.size > 1_000_000) return { ...initial, message: "Selecciona un XLSX de hasta 1 MB." };
      try {
        const { readSheet } = await import("read-excel-file/browser");
        const rows = await readSheet(file, 1);
        if (rows.length > 501 || rows.some(row => row.length > 51)) {
          return { ...initial, message: "El XLSX admite hasta 500 registros y 51 columnas." };
        }
        const csv = rows.map(row => row.map(cell => {
          const value = cell instanceof Date ? cell.toISOString().slice(0, 10) : String(cell ?? "");
          return '"' + value.replaceAll('"', '""') + '"';
        }).join(";")).join("\r\n");
        form.set("csv", new File([csv], "inventario.csv", { type: "text/csv" }));
      } catch {
        return { ...initial, message: "No se pudo leer la primera hoja del XLSX." };
      }
    }
    return submitSolutionCsv(previous, form);
  }, initial);
  return <form action={action} className="space-y-3 rounded-xl border p-5">
    <h2 className="text-xl font-bold">Importar inventario CSV o XLSX</h2>
    <p className="text-sm text-slate-500">
      Usa CSV UTF-8 o la primera hoja de un archivo XLSX. Primero previsualiza; al aplicar, los códigos existentes se actualizan y los nuevos se crean.
      Solo se aceptan proyectos en borrador y máximo 500 filas por lote.
    </p>
    <input type="hidden" name="companyId" value={companyId}/>
    <input type="hidden" name="projectId" value={projectId}/>
    <input type="hidden" name="templateId" value={templateId}/>
    <label htmlFor="sol-csv" className="block text-sm font-semibold">Archivo CSV o XLSX</label>
    <input id="sol-csv" type="file" name="csv" accept=".csv,.xlsx" required
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