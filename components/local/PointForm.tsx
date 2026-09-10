"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { savePointAction, type PointFormState } from "../../app/dashboard/local/puntos/actions";
import { mediumLabels, objectiveLabels, pointObjectives, type PointConfiguration } from "../../lib/local/point-config";

type Point = PointConfiguration & { id: string; campaignId: string; configurationVersion: number };
export default function PointForm({ point, campaigns }: { point?: Point; campaigns: Array<{ id: string; name: string }> }) {
  const [objective, setObjective] = useState<PointConfiguration["objective"]>(point?.objective || "GOOGLE_REVIEW");
  const [campaignId, setCampaignId] = useState(point?.campaignId || campaigns[0]?.id || "__new");
  const [state, action, pending] = useActionState(savePointAction, {} as PointFormState);
  if (!point && state.success) return <div role="status" className="rounded-xl border border-green-300 bg-green-50 text-green-950 p-6 space-y-4">
    <p className="font-semibold">{state.success}</p>
    <Link className="underline" href="/dashboard/local/puntos">Volver a mis puntos</Link>
  </div>;
  const field = "block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 mt-1";
  return <form action={action} className="max-w-2xl space-y-5">
    {point && <><input type="hidden" name="pointId" value={point.id}/><input type="hidden" name="version" value={point.configurationVersion}/></>}
    <label className="block">Campaña
      <select name="campaignId" className={field} value={campaignId} onChange={event => setCampaignId(event.target.value)} disabled={!!point} required>
        {!point && <option value="__new">Crear una campaña nueva</option>}
        {campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
      </select>
    </label>
    {campaignId === "__new" && <label className="block">Nombre de la campaña<input name="campaignName" className={field} placeholder="Puntos de mi local" required minLength={2} maxLength={80}/><span className="text-sm text-slate-500">Agrupa los puntos de tu local. Solo el objetivo Club necesita un formulario y beneficio publicados.</span></label>}
    <label className="block">Nombre del punto<input name="name" className={field} defaultValue={point?.name} placeholder="Caja principal" required maxLength={80}/></label>
    <label className="block">Ubicación física<input name="location" className={field} defaultValue={point?.location} placeholder="Mostrador, junto a la caja 1" required maxLength={160}/></label>
    <label className="block">¿Qué quieres conseguir?
      <select name="objective" className={field} value={objective} onChange={event => setObjective(event.target.value as PointConfiguration["objective"])}>
        {pointObjectives.map(value => <option key={value} value={value}>{objectiveLabels[value]}</option>)}
      </select>
    </label>
    <label className="block">Soporte del punto
      <select name="medium" className={field} defaultValue={point?.medium || "NFC_QR"}>
        {Object.entries(mediumLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    {objective === "CLUB" ? <p className="rounded-lg bg-blue-50 text-blue-950 p-4">El punto abrirá el Club publicado de esta campaña, con registro y consentimiento.</p>
      : objective === "SMART_LANDING" ? <fieldset className="space-y-3"><legend className="font-bold">Acciones de tu página · hasta 6</legend>
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="grid sm:grid-cols-2 gap-2">
          <label>Nombre de la acción {index + 1}<input name={`label${index}`} className={field} defaultValue={point?.smartLinks[index]?.label} maxLength={60}/></label>
          <label>Enlace de la acción {index + 1}<input name={`url${index}`} type="url" className={field} defaultValue={point?.smartLinks[index]?.url} placeholder="https://…" maxLength={2048}/></label>
        </div>)}
      </fieldset>
      : <label className="block">Enlace de destino
        <input name="destinationUrl" type="url" className={field} defaultValue={point?.destinationUrl} placeholder={objective === "WHATSAPP" ? "https://wa.me/56912345678" : "https://…"} required maxLength={2048}/>
        <span className="text-sm text-slate-500">{objective === "GOOGLE_REVIEW" ? "Copia el enlace para solicitar reseñas desde tu perfil de negocio en Google." : objective === "MENU" ? "Enlace público a tu menú, PDF o catálogo." : objective === "PROMOTION" ? "Enlace público a la oferta o promoción vigente." : "Podrás cambiar este enlace conservando el mismo NFC y QR."}</span>
      </label>}
    <label className="flex gap-3 items-center"><input type="checkbox" name="isActive" defaultChecked={point?.isActive || false}/> Activar el punto</label>
    <p className="text-sm text-slate-500">Guardar actualiza el destino de este punto. Desactívalo si todavía estás preparando la experiencia.</p>
    {state.error && <p role="alert" className="text-red-700 dark:text-red-300">{state.error}</p>}
    {state.success && <p role="status" className="text-green-700 dark:text-green-300">{state.success} <Link className="underline" href="/dashboard/local/puntos">Volver a mis puntos</Link></p>}
    <button disabled={pending} className="rounded-lg bg-blue-700 text-white px-6 py-3 disabled:opacity-50">{pending ? "Guardando…" : "Guardar punto"}</button>
  </form>;
}
