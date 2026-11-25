"use client";

import { useActionState, useState, type ReactNode } from "react";
import { operateCampaign } from "./actions";

export function Operation({ scope, action, revision, target, label, children }: {
  scope: { projectId: string; companyId: string }; action: string; revision: number; target?: string; label: string; children?: ReactNode;
}) {
  const [state, submit, pending] = useActionState(operateCampaign.bind(null, scope), { message: "" });
  return <form action={submit} className="space-y-2 rounded-lg border p-3">
    <input type="hidden" name="operation" value={action} />
    <input type="hidden" name="revision" value={revision} />
    <input type="hidden" name="target" value={target ?? ""} />
    {children}
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirmed" value="yes" required />Confirmar {label.toLowerCase()}</label>
    <button className="rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={pending}>
      {pending ? "Procesando…" : label}
    </button>
    {state.message && <p role={state.error ? "alert" : "status"} className={state.error ? "text-sm text-red-700 dark:text-red-300" : "text-sm text-green-700 dark:text-green-300"}>{state.message}</p>}
  </form>;
}

export function PointUrl({ url }: { url: string }) {
  const [message, setMessage] = useState("");
  return <div className="space-y-2">
    <a href={url} target="_blank" rel="noreferrer" className="block break-all text-sm text-blue-700 underline dark:text-blue-300">{url}</a>
    <button type="button" className="rounded border px-2 py-1 text-sm" onClick={async () => {
      try { await navigator.clipboard.writeText(url); setMessage("URL copiada."); }
      catch { setMessage("Selecciona el enlace para copiarlo."); }
    }}>Copiar URL</button>
    {message && <span className="ml-2 text-sm" role="status">{message}</span>}
  </div>;
}
