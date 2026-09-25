"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { savePointAction, type PointFormState } from "../../app/dashboard/local/puntos/actions";
import { mediumLabels, objectiveLabels, pointObjectives, presentationModeLabels, type PointConfiguration } from "../../lib/local/point-config";
import type { ResolvedLocalBrand } from "../../lib/local/brand";
import {
  ACTION_REGISTRY, SOCIAL_ACTION_TYPES, legacyLinkToAction, normalizeActionValue, objectiveActionType, resolveContactActions, resolvePointActions,
  storedActionDestination, storedActionSchema, toPublicActions, whatsappFromUrl, whatsappUrl, type StoredAction,
} from "../../lib/local/public-actions";
import { OBJECTIVE_CTA_MAX, PROMOTION_LIMITS, promotionStatus, promotionView, type Promotion } from "../../lib/local/objective-config";
import BrandImageField from "./brand/BrandImageField";
import LocalLandingView from "./public/LocalLandingView";
import MobileDeviceFrame from "./brand/MobileDeviceFrame";
import ActionBuilder, { newActionDraft, type ActionDraft } from "./actions/ActionBuilder";

type Point = PointConfiguration & { id: string; campaignId: string; configurationVersion: number };
type Mode = PointConfiguration["presentationMode"];
type Objective = PointConfiguration["objective"];

const toDraft = (a: StoredAction): ActionDraft => ({ id: a.id, type: a.type, label: a.label, value: a.value, message: a.message, enabled: a.enabled });
const validStored = (drafts: ActionDraft[]) => drafts.flatMap(d => { const r = storedActionSchema.safeParse(d); return r.success ? [r.data] : []; });
/** Sufijo determinista por punto: el estado inicial se renderiza igual en servidor y cliente. */
const seed = (point?: Point) => (point?.id ?? "nuevo").toLowerCase().replace(/[^a-z0-9]/g, "").slice(-12);

// Textos de ayuda por objetivo: qué configura la persona y qué mide SmartNFC (sin prometer resultados).
const OBJECTIVE_HELP: Partial<Record<Objective, { link: string; hint: string; placeholder: string }>> = {
  GOOGLE_REVIEW: { link: "Enlace para pedir reseñas", placeholder: "https://g.page/r/…/review",
    hint: "En tu Perfil de Empresa de Google, elige “Pedir reseñas” y copia el enlace. SmartNFC registra el toque; no puede saber si la reseña se publicó." },
  MENU: { link: "Enlace del menú o catálogo", placeholder: "https://… (web o PDF)", hint: "Página web, PDF o catálogo público. Podrás cambiarlo sin regrabar el NFC ni reimprimir el QR." },
  PROMOTION: { link: "Enlace de la promoción", placeholder: "https://…", hint: "Página pública con la oferta o promoción vigente." },
};

export default function PointForm({ point, campaigns, locations = [], brandByCampaign = {}, brandByLocation = {}, companyBrand, locationByCampaign = {} }: {
  locations?: Array<{ id: string; name: string | null }>; point?: Point; campaigns: Array<{ id: string; name: string }>;
  /** Identidad pública ya resuelta en el servidor (resolveLocalBrand) para la vista previa. */
  brandByCampaign?: Record<string, ResolvedLocalBrand>; brandByLocation?: Record<string, ResolvedLocalBrand>; companyBrand?: ResolvedLocalBrand;
  /** Local de cada campaña: las imágenes de promoción se suben a su carpeta. */
  locationByCampaign?: Record<string, string | null>;
}) {
  const [objective, setObjective] = useState<Objective>(point?.objective || "GOOGLE_REVIEW");
  const [campaignId, setCampaignId] = useState(point?.campaignId || campaigns[0]?.id || "__new");
  const [locationId, setLocationId] = useState(locations[0]?.id || "");
  const [mode, setMode] = useState<Mode>(point?.presentationMode || "DIRECT");
  const [link, setLink] = useState(point && ["GOOGLE_REVIEW", "MENU", "PROMOTION"].includes(point.objective) ? point.destinationUrl : "");
  const [ctaLabel, setCtaLabel] = useState(point?.objectiveConfig.ctaLabel || "");
  const [linkTouched, setLinkTouched] = useState(false);
  // WhatsApp: número y mensaje estructurados; el enlace se construye con whatsappUrl (nunca se escribe a mano).
  const [wa, setWa] = useState(() => (point?.objective === "WHATSAPP" && whatsappFromUrl(point.destinationUrl)) || { phone: "", message: "" });
  const [waTouched, setWaTouched] = useState(false);
  // Redes: la primera red visible es la principal (destino); las demás se guardan como acciones.
  const [networks, setNetworks] = useState<ActionDraft[]>(() => {
    if (point?.objective !== "SOCIAL") return [];
    const first = point.destinationUrl ? legacyLinkToAction({ label: point.objectiveConfig.ctaLabel, url: point.destinationUrl }) : null;
    return [...(first ? [newActionDraft(first.type, first.value, first.label, "", `red0${seed(point)}`)] : []), ...point.actions.map(toDraft)];
  });
  // Acciones del Action Builder: todas las de Smart Landing o las adicionales de la página. Smart Landing sin acciones parte de sus enlaces heredados.
  const [drafts, setDrafts] = useState<ActionDraft[]>(() => point?.objective === "SOCIAL" ? []
    : point?.actions.length ? point.actions.map(toDraft)
    : point?.objective === "SMART_LANDING" ? point.smartLinks.map((l, i) => { const a = legacyLinkToAction(l); return newActionDraft(a.type, a.value, a.label, a.message, `lnk${i}${seed(point)}`); })
    : []);
  // Promoción: contenido y vigencia (días en hora de Chile).
  const [promo, setPromo] = useState<Promotion>(() => point?.objectiveConfig.promotion ?? { title: "", description: "", imageUrl: "", startDate: "", endDate: "" });
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [state, action, pending] = useActionState(savePointAction, {} as PointFormState);

  const smart = objective === "SMART_LANDING", social = objective === "SOCIAL", club = objective === "CLUB";
  const effectiveMode: Mode = club ? "DIRECT" : mode;
  const brand = (campaignId === "__new" ? brandByLocation[locationId] : brandByCampaign[campaignId]) || companyBrand;

  // Lo que se envía: destino principal, acciones y configuración del objetivo, derivados de los editores.
  const waCheck = normalizeActionValue("WHATSAPP", wa.phone);
  const socialValid = validStored(networks);
  const socialFirst = socialValid.find(a => a.enabled);
  const destinationUrl = objective === "WHATSAPP" ? (waCheck.ok ? whatsappUrl(waCheck.value, wa.message) : "")
    : social ? (socialFirst ? storedActionDestination(socialFirst) : "")
    : smart || club ? "" : link;
  const showBuilder = !club && !social && (smart || effectiveMode === "LANDING");
  const submittedActions = club ? [] : social ? networks.filter(n => n.id !== socialFirst?.id)
    : showBuilder ? drafts : drafts.filter(d => storedActionSchema.safeParse(d).success);
  const primaryLabel = social ? (socialFirst?.label ?? "") : ctaLabel;
  const promotion = objective === "PROMOTION";
  const promoStatus = promotionStatus(promo);
  const promoLocationId = campaignId === "__new" ? locationId : locationByCampaign[campaignId] ?? "";
  const objectiveConfig = { ctaLabel: club || smart ? "" : primaryLabel, ...(promotion ? { promotion: promo } : {}) };

  // React Compiler memoiza estos cálculos; no se usa memoización manual.
  const validActions = validStored(drafts);
  const previewActions = brand ? toPublicActions([
    ...resolvePointActions({ objective, destinationUrl: smart ? null : destinationUrl || null, smartLinks: [], ctaLabel: primaryLabel,
      actions: social ? socialValid.filter(a => a.id !== socialFirst?.id) : validActions }),
    ...resolveContactActions(brand),
  ], { interactive: false }).filter(a => !(promotion && promoStatus !== "active" && a.key === "primary")) : [];
  const previewPromotion = promotion ? promotionView(promo, promoStatus) : null;
  const visibleNetworks = socialValid.filter(a => a.enabled).length;

  if (!point && state.success) return <div role="status" className="rounded-xl border border-green-300 bg-green-50 text-green-950 p-6 space-y-4">
    <p className="font-semibold">{state.success}</p>
    <Link className="underline" href="/dashboard/local/puntos">Volver a mis puntos</Link>
  </div>;
  const field = "block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 mt-1";
  const destinationHost = (() => { try { return new URL(destinationUrl).hostname.replace(/^www\./, ""); } catch { return ""; } })();
  const help = OBJECTIVE_HELP[objective];
  const linkError = help && linkTouched && link.trim() && !normalizeActionValue(objectiveActionType(objective, link), link).ok
    ? (objective === "GOOGLE_REVIEW" ? "Usa el enlace de reseñas proporcionado por Google." : "Usa una dirección https:// pública válida.") : null;
  const primaryType = objective === "WHATSAPP" ? "WHATSAPP" : destinationUrl ? objectiveActionType(objective, destinationUrl) : objectiveActionType(objective, link);
  const setPromoField = (key: keyof Promotion) => (e: { target: { value: string } }) => setPromo(p => ({ ...p, [key]: e.target.value }));
  const promoFields = promotion && <>
    <label className="block">Título de la promoción
      <input className={field} value={promo.title} onChange={setPromoField("title")} maxLength={PROMOTION_LIMITS.title} placeholder="2x1 en cafés de especialidad" required/>
    </label>
    <label className="block">Descripción <span className="text-sm text-slate-500">(opcional)</span>
      <textarea className={field} rows={3} value={promo.description} onChange={setPromoField("description")} maxLength={PROMOTION_LIMITS.description} placeholder="Condiciones, horarios o productos incluidos."/>
    </label>
    {promoLocationId
      ? <BrandImageField id="promo-image" kind="promo" locationId={promoLocationId} label="Imagen de la promoción" hint="Opcional. Se muestra en la página del local."
          value={promo.imageUrl} onChange={url => setPromo(p => ({ ...p, imageUrl: url }))}/>
      : <p className="text-sm text-slate-500">Para agregar una imagen, la campaña debe estar asignada a un local.</p>}
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block">Desde <span className="text-sm text-slate-500">(opcional)</span><input type="date" className={field} value={promo.startDate} onChange={setPromoField("startDate")}/></label>
      <label className="block">Hasta <span className="text-sm text-slate-500">(opcional)</span><input type="date" className={field} value={promo.endDate} min={promo.startDate || undefined} onChange={setPromoField("endDate")}/></label>
    </div>
    <p role="status" className={`rounded-lg p-3 text-sm ${promoStatus === "active" ? "bg-green-50 text-green-900 dark:bg-green-500/10 dark:text-green-200" : "bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"}`}>
      {promoStatus === "active" ? "Vigente hoy." : promoStatus === "scheduled" ? "Programada: hasta la fecha de inicio se muestra el aviso de inicio, sin botón." : "Terminada: se muestra que la promoción terminó, sin botón. El historial de visitas y clics se conserva."}
      {" "}Las fechas se consideran en hora de Chile.
    </p>
  </>;
  const ctaField = (
    <label className="block">Texto del botón principal <span className="text-sm text-slate-500">(opcional)</span>
      <input className={field} value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} maxLength={OBJECTIVE_CTA_MAX} placeholder={ACTION_REGISTRY[primaryType].defaultLabel}/>
      <span className="text-sm text-slate-500">Se muestra en la página del local. Invita a la acción; no promete un resultado.</span>
    </label>
  );

  return <div className="space-y-4">
    <div role="tablist" aria-label="Editor del punto" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-semibold lg:hidden dark:bg-slate-800">
      {(["edit", "preview"] as const).map(view => <button key={view} type="button" role="tab" aria-selected={mobileView === view} onClick={() => setMobileView(view)}
        className={`rounded-lg px-3 py-2 ${mobileView === view ? "bg-white shadow-sm dark:bg-slate-900" : "text-slate-600 dark:text-slate-300"}`}>{view === "edit" ? "Editar" : "Vista previa"}</button>)}
    </div>
    <div className="grid gap-8 lg:grid-cols-[minmax(0,42rem)_minmax(0,1fr)]">
    <form action={action} className={`max-w-2xl space-y-5 ${mobileView === "preview" ? "hidden lg:block" : ""}`}>
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
      <label className="block">¿Qué quieres que haga la persona al tocar este punto?
        <select name="objective" className={field} value={objective} onChange={event => setObjective(event.target.value as Objective)}>
          {pointObjectives.map(value => <option key={value} value={value}>{objectiveLabels[value]}</option>)}
        </select>
      </label>
      <label className="block">Soporte del punto
        <select name="medium" className={field} defaultValue={point?.medium || "NFC_QR"}>
          {Object.entries(mediumLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>

      {club && <p className="rounded-lg bg-blue-50 text-blue-950 p-4">El punto abrirá el Club publicado de esta campaña, con registro y consentimiento. El Club usa su propia identidad y completa logo, portada y dirección con la identidad del local.
        {campaignId !== "__new" && <> <Link className="font-semibold underline" href={`/dashboard/local/campanas/${campaignId}`}>Editar el Club de esta campaña</Link></>}</p>}

      {objective === "WHATSAPP" && <fieldset className="space-y-3">
        <legend className="font-bold">Tu WhatsApp</legend>
        <label className="block">Número de WhatsApp
          <input className={field} value={wa.phone} inputMode="tel" placeholder="+56 9 1234 5678" maxLength={30} aria-invalid={waTouched && !waCheck.ok}
            onChange={e => setWa(w => ({ ...w, phone: e.target.value }))} onBlur={() => setWaTouched(true)}/>
          {waTouched && wa.phone.trim() && !waCheck.ok && <span role="alert" className="text-sm text-rose-600">{waCheck.error.charAt(0).toUpperCase() + waCheck.error.slice(1)}</span>}
        </label>
        <label className="block">Mensaje sugerido <span className="text-sm text-slate-500">(opcional)</span>
          <textarea className={field} rows={2} value={wa.message} maxLength={300} placeholder="Hola, quiero hacer una consulta" onChange={e => setWa(w => ({ ...w, message: e.target.value }))}/>
          <span className="text-sm text-slate-500">La persona puede editarlo antes de enviarlo. SmartNFC registra el toque, no si el mensaje se envió.</span>
        </label>
        {ctaField}
      </fieldset>}

      {help && <fieldset className="space-y-3">
        <legend className="font-bold">{objectiveLabels[objective]}</legend>
        {promoFields}
        <label className="block">{help.link}
          <input type="url" className={field} value={link} onChange={e => setLink(e.target.value)} onBlur={() => setLinkTouched(true)} placeholder={help.placeholder} maxLength={2048} aria-invalid={!!linkError}/>
          {linkError && <span role="alert" className="block text-sm text-rose-600">{linkError}</span>}
          <span className="text-sm text-slate-500">{help.hint}</span>
        </label>
        {ctaField}
      </fieldset>}

      {social && <ActionBuilder actions={networks} onChange={setNetworks} types={SOCIAL_ACTION_TYPES} title="Tus redes sociales" addLabel="Agregar red"
        firstLabel="Red principal" hint="La primera red visible es la principal. SmartNFC registra el toque en cada red; no puede saber si la persona te siguió."
        emptyText="Agrega al menos una red, por ejemplo Instagram."/>}

      {!club && <fieldset className="space-y-2">
        <legend className="font-bold">Al escanear el NFC o QR</legend>
        {(["DIRECT", "LANDING"] as const).map(value => <label key={value} className="flex gap-3 items-start rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <input type="radio" name="presentationMode" value={value} checked={mode === value} onChange={() => setMode(value)} className="mt-1"/>
          <span><span className="block font-semibold">{presentationModeLabels[value]}</span>
            <span className="block text-sm text-slate-500">{value === "DIRECT"
              ? (smart ? "Muestra la página de acciones actual, sin la identidad del local." : social ? "Abre directamente la red principal." : "Abre el destino de inmediato, sin una página intermedia.")
              : "Muestra la página con la identidad del local y sus acciones. Cambiarlo no requiere regrabar el NFC ni reimprimir el QR."}</span></span>
        </label>)}
        {social && mode === "DIRECT" && visibleNetworks > 1 && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          En modo directo solo se abre la red principal. Para mostrar tus {visibleNetworks} redes, elige “{presentationModeLabels.LANDING}”.
          <button type="button" className="ml-2 font-semibold underline" onClick={() => setMode("LANDING")}>Usar la página del local</button></p>}
      </fieldset>}
      {club && <input type="hidden" name="presentationMode" value="DIRECT"/>}

      {showBuilder && <ActionBuilder actions={drafts} onChange={setDrafts}
        title={smart ? "Acciones de tu página" : "Acciones adicionales (opcional)"}
        hint={smart ? "La primera acción visible se destaca. Ordénalas según lo que más te importa." : "Se muestran debajo de la acción principal, en la página del local."}
        emptyText={smart ? "Agrega al menos una acción, por ejemplo WhatsApp, Instagram o tu menú." : "Sin acciones adicionales. Puedes sumar redes, menú, ubicación u otras."} />}
      {!showBuilder && !club && !social && submittedActions.length > 0 && <p className="text-sm text-slate-500">Este punto tiene {submittedActions.length} {submittedActions.length === 1 ? "acción adicional" : "acciones adicionales"}: se muestran al elegir “{presentationModeLabels.LANDING}”.</p>}
      <input type="hidden" name="destinationUrl" value={destinationUrl}/>
      <input type="hidden" name="actions" value={JSON.stringify(submittedActions)}/>
      <input type="hidden" name="objectiveConfig" value={JSON.stringify(objectiveConfig)}/>

      <label className="flex gap-3 items-center"><input type="checkbox" name="isActive" defaultChecked={point?.isActive || false}/> Activar el punto</label>
      <p className="text-sm text-slate-500">Guardar actualiza el destino de este punto. Desactívalo si todavía estás preparando la experiencia.</p>
      {state.error && <p role="alert" className="text-red-700 dark:text-red-300">{state.error}</p>}
      {state.success && <p role="status" className="text-green-700 dark:text-green-300">{state.success} <Link className="underline" href="/dashboard/local/puntos">Volver a mis puntos</Link></p>}
      <button disabled={pending} className="rounded-lg bg-blue-700 text-white px-6 py-3 disabled:opacity-50">{pending ? "Guardando…" : "Guardar punto"}</button>
    </form>

    <aside aria-label="Vista previa del punto" className={`lg:sticky lg:top-6 self-start space-y-3 ${mobileView === "edit" ? "hidden lg:block" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Vista previa</p>
      {(effectiveMode === "LANDING" || (promotion && promoStatus !== "active")) && brand ? <>
        <MobileDeviceFrame compact label="Vista previa de la página del local">
          <LocalLandingView brand={brand} actions={previewActions} promotion={previewPromotion} framed emptyHint={smart ? "Agrega una acción para verla aquí." : "Completa el destino para ver la acción principal."} />
        </MobileDeviceFrame>
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">La identidad se edita en <Link className="underline" href="/dashboard/local/locales">Mis locales</Link>.</p>
      </> : <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 text-sm text-slate-600 dark:text-slate-300">
        {club ? "Al escanear se abre el Club publicado de la campaña."
          : smart ? "Al escanear se muestra la página de acciones actual."
          : objective === "WHATSAPP" && waCheck.ok ? `Al escanear se abre WhatsApp para escribir a ${waCheck.value}${wa.message.trim() ? ", con tu mensaje sugerido" : ""}.`
          : destinationHost ? `Al escanear se abre directamente ${destinationHost}.` : "Al escanear se abrirá directamente el destino que configures."}
      </div>}
    </aside>
    </div>
  </div>;
}
