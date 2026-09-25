"use client";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { savePointAction, type PointFormState } from "../../app/dashboard/local/puntos/actions";
import { mediumLabels, objectiveLabels, pointObjectives, presentationModeLabels, type PointConfiguration } from "../../lib/local/point-config";
import type { ResolvedLocalBrand } from "../../lib/local/brand";
import { legacyLinkToAction, resolveContactActions, resolvePointActions, storedActionSchema, toPublicActions, type StoredAction } from "../../lib/local/public-actions";
import ActionBuilder, { newActionDraft, type ActionDraft } from "./actions/ActionBuilder";
import LocalLandingView from "./public/LocalLandingView";
import MobileDeviceFrame from "./brand/MobileDeviceFrame";

type Point = PointConfiguration & { id: string; campaignId: string; configurationVersion: number };
type Mode = PointConfiguration["presentationMode"];

export default function PointForm({ point, campaigns, locations = [], brandByCampaign = {}, brandByLocation = {}, companyBrand }: {
  locations?: Array<{ id: string; name: string | null }>; point?: Point; campaigns: Array<{ id: string; name: string }>;
  /** Identidad pública ya resuelta en el servidor (resolveLocalBrand) para la vista previa. */
  brandByCampaign?: Record<string, ResolvedLocalBrand>; brandByLocation?: Record<string, ResolvedLocalBrand>; companyBrand?: ResolvedLocalBrand;
}) {
  const [objective, setObjective] = useState<PointConfiguration["objective"]>(point?.objective || "GOOGLE_REVIEW");
  const [campaignId, setCampaignId] = useState(point?.campaignId || campaigns[0]?.id || "__new");
  const [locationId, setLocationId] = useState(locations[0]?.id || "");
  const [mode, setMode] = useState<Mode>(point?.presentationMode || "DIRECT");
  const [destinationUrl, setDestinationUrl] = useState(point?.destinationUrl || "");
  // Acciones del Action Builder. Un Smart Landing sin acciones guardadas parte de sus enlaces heredados.
  const [drafts, setDrafts] = useState<ActionDraft[]>(() => point?.actions.length
    ? point.actions.map(a => ({ id: a.id, type: a.type, label: a.label, value: a.value, message: a.message, enabled: a.enabled }))
    : point?.objective === "SMART_LANDING" ? point.smartLinks.map((link, index) => {
      // Id determinista: el estado inicial se renderiza igual en servidor y cliente.
      const a = legacyLinkToAction(link);
      return newActionDraft(a.type, a.value, a.label, a.message, `lnk${index}${point.id.toLowerCase().replace(/[^a-z0-9]/g, "").slice(-12)}`);
    }) : []);
  const [state, action, pending] = useActionState(savePointAction, {} as PointFormState);

  const effectiveMode: Mode = objective === "CLUB" ? "DIRECT" : mode;
  const brand = (campaignId === "__new" ? brandByLocation[locationId] : brandByCampaign[campaignId]) || companyBrand;
  // Solo las acciones completas y válidas llegan a la vista previa (igual que en la página pública).
  const validActions = useMemo(() => drafts.flatMap(d => { const r = storedActionSchema.safeParse(d); return r.success ? [r.data] : []; }) as StoredAction[], [drafts]);
  const smart = objective === "SMART_LANDING";
  const showBuilder = objective !== "CLUB" && (smart || effectiveMode === "LANDING");
  // DIRECT de objetivo único: las acciones adicionales no se muestran; se conservan solo las completas.
  const submittedActions = objective === "CLUB" ? [] : showBuilder ? drafts : drafts.filter(d => storedActionSchema.safeParse(d).success);
  // Vista previa: exactamente LocalLandingView con las acciones que tendría la landing pública (sin enlaces).
  const previewActions = useMemo(() => brand ? toPublicActions([
    ...resolvePointActions({ objective, destinationUrl: smart ? null : destinationUrl, smartLinks: [], actions: validActions }),
    ...resolveContactActions(brand),
  ], { interactive: false }) : [], [brand, objective, smart, destinationUrl, validActions]);

  if (!point && state.success) return <div role="status" className="rounded-xl border border-green-300 bg-green-50 text-green-950 p-6 space-y-4">
    <p className="font-semibold">{state.success}</p>
    <Link className="underline" href="/dashboard/local/puntos">Volver a mis puntos</Link>
  </div>;
  const field = "block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 mt-1";
  const destinationHost = (() => { try { return new URL(destinationUrl).hostname.replace(/^www\./, ""); } catch { return ""; } })();

  return <div className="grid gap-8 lg:grid-cols-[minmax(0,42rem)_minmax(0,1fr)]">
    <form action={action} className="max-w-2xl space-y-5">
      {point && <><input type="hidden" name="pointId" value={point.id}/><input type="hidden" name="version" value={point.configurationVersion}/></>}
      <label className="block">Campaña
        <select name="campaignId" className={field} value={campaignId} onChange={event => setCampaignId(event.target.value)} disabled={!!point} required>
          {!point && <option value="__new">Crear una campaña nueva</option>}
          {campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
        </select>
      </label>
      {!point && campaignId === "__new" && locations.length > 0 && <label className="block">Local<select name="locationId" className={field} required value={locationId} onChange={e => setLocationId(e.target.value)}>{locations.map((l, i) => <option key={l.id} value={l.id}>{l.name || `Local pendiente de identificar ${i + 1}`}</option>)}</select></label>}
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
        : smart ? null
        : <label className="block">Enlace de destino
          <input name="destinationUrl" type="url" className={field} value={destinationUrl} onChange={e => setDestinationUrl(e.target.value)} placeholder={objective === "WHATSAPP" ? "https://wa.me/56912345678" : "https://…"} required maxLength={2048}/>
          <span className="text-sm text-slate-500">{objective === "GOOGLE_REVIEW" ? "Copia el enlace para solicitar reseñas desde tu perfil de negocio en Google." : objective === "MENU" ? "Enlace público a tu menú, PDF o catálogo." : objective === "PROMOTION" ? "Enlace público a la oferta o promoción vigente." : "Podrás cambiar este enlace conservando el mismo NFC y QR."}</span>
        </label>}
      {objective !== "CLUB" && <fieldset className="space-y-2">
        <legend className="font-bold">Al escanear el NFC o QR</legend>
        {(["DIRECT", "LANDING"] as const).map(value => <label key={value} className="flex gap-3 items-start rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <input type="radio" name="presentationMode" value={value} checked={mode === value} onChange={() => setMode(value)} className="mt-1"/>
          <span><span className="block font-semibold">{presentationModeLabels[value]}</span>
            <span className="block text-sm text-slate-500">{value === "DIRECT"
              ? (objective === "SMART_LANDING" ? "Muestra la página de acciones actual, sin la identidad del local." : "Abre el destino de inmediato, sin una página intermedia.")
              : "Muestra la página con la identidad del local y la acción principal. Cambiarlo no requiere regrabar el NFC ni reimprimir el QR."}</span></span>
        </label>)}
      </fieldset>}
      {objective === "CLUB" && <input type="hidden" name="presentationMode" value="DIRECT"/>}
      {showBuilder && <ActionBuilder actions={drafts} onChange={setDrafts}
        title={smart ? "Acciones de tu página" : "Acciones adicionales (opcional)"}
        hint={smart ? "La primera acción visible se destaca. Ordénalas según lo que más te importa." : "Se muestran debajo de la acción principal, en la página del local."}
        emptyText={smart ? "Agrega al menos una acción, por ejemplo WhatsApp, Instagram o tu menú." : "Sin acciones adicionales. Puedes sumar redes, menú, ubicación u otras."} />}
      {!showBuilder && objective !== "CLUB" && submittedActions.length > 0 && <p className="text-sm text-slate-500">Este punto tiene {submittedActions.length} {submittedActions.length === 1 ? "acción adicional" : "acciones adicionales"}: se muestran al elegir “{presentationModeLabels.LANDING}”.</p>}
      <input type="hidden" name="actions" value={JSON.stringify(submittedActions)}/>
      <label className="flex gap-3 items-center"><input type="checkbox" name="isActive" defaultChecked={point?.isActive || false}/> Activar el punto</label>
      <p className="text-sm text-slate-500">Guardar actualiza el destino de este punto. Desactívalo si todavía estás preparando la experiencia.</p>
      {state.error && <p role="alert" className="text-red-700 dark:text-red-300">{state.error}</p>}
      {state.success && <p role="status" className="text-green-700 dark:text-green-300">{state.success} <Link className="underline" href="/dashboard/local/puntos">Volver a mis puntos</Link></p>}
      <button disabled={pending} className="rounded-lg bg-blue-700 text-white px-6 py-3 disabled:opacity-50">{pending ? "Guardando…" : "Guardar punto"}</button>
    </form>

    <aside aria-label="Vista previa del punto" className="lg:sticky lg:top-6 self-start space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Vista previa</p>
      {effectiveMode === "LANDING" && brand ? <>
        <MobileDeviceFrame compact label="Vista previa de la página del local">
          <LocalLandingView brand={brand} actions={previewActions} framed emptyHint={smart ? "Agrega una acción para verla aquí." : "Completa el destino para ver la acción principal."} />
        </MobileDeviceFrame>
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">La identidad se edita en <Link className="underline" href="/dashboard/local/locales">Mis locales</Link>.</p>
      </> : <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 text-sm text-slate-600 dark:text-slate-300">
        {objective === "CLUB" ? "Al escanear se abre el Club publicado de la campaña."
          : objective === "SMART_LANDING" ? "Al escanear se muestra la página de acciones actual."
          : destinationHost ? `Al escanear se abre directamente ${destinationHost}.` : "Al escanear se abrirá directamente el enlace de destino."}
      </div>}
    </aside>
  </div>;
}
