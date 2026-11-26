"use client";

import { useState, useTransition } from "react";
import type { CampaignBlock, CampaignContent, CampaignDesign } from "../../../../../lib/soluciones/campaign-content";
import { blockNames, campaignForSite, newCampaignBlock, removeBlockOverrides, updateSiteVariant } from "../../../../../lib/soluciones/campaign-editor";
import { addLandingSite, saveLanding } from "./actions";
import CampaignRichFields from "./CampaignRichFields";
import CampaignPreview from "./CampaignPreview";
import CampaignImageInput from "./CampaignImageInput";

type Site = { id: string; name: string };
const inputClass = "mt-1 w-full rounded-md border border-slate-300 bg-transparent p-2 text-sm dark:border-slate-600";
const labelClass = "block text-sm font-medium";
const actionClass = "rounded-md border px-2 py-1 text-sm hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800";
const panelClass = "min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-700";

function BlockFields({ scope, block, change }: { scope: { companyId: string; projectId: string }; block: CampaignBlock; change: (block: CampaignBlock) => void }) {
  switch (block.type) {
    case "card": case "alert": case "indicator": case "risk-scale": case "card-group":
      return <CampaignRichFields block={block} change={change} />;
    case "hero":
      return <>
        <label className={labelClass}>Título<textarea className={inputClass} rows={4} maxLength={4000} value={block.text} onChange={e => change({ ...block, text: e.target.value })} /></label>
        <label className={labelClass}>Subtítulo opcional<input className={inputClass} maxLength={300} value={block.subtitle ?? ""} onChange={e => {
          const next = { ...block };
          if (e.target.value) next.subtitle = e.target.value;
          else delete next.subtitle;
          change(next);
        }} /></label>
      </>;
    case "text":
      return <label className={labelClass}>Texto<textarea className={inputClass} rows={4} maxLength={4000} value={block.text} onChange={e => change({ ...block, text: e.target.value })} /></label>;
    case "image":
      return <>
        <CampaignImageInput scope={scope} kind="image" value={block.src} label="URL HTTPS de la imagen" onChange={src => change({ ...block, src })} />
        <label className={labelClass}>Texto alternativo<input className={inputClass} maxLength={240} value={block.alt} onChange={e => change({ ...block, alt: e.target.value })} /></label>
      </>;
    case "button":
      return <>
        <label className={labelClass}>Texto del botón<input className={inputClass} maxLength={120} value={block.text} onChange={e => change({ ...block, text: e.target.value })} /></label>
        <label className={labelClass}>Destino HTTPS<input className={inputClass} type="url" maxLength={2048} value={block.href} onChange={e => change({ ...block, href: e.target.value })} /></label>
      </>;
    case "list":
      return <>
        {block.items.map((item, index) => <div key={index} className="flex items-end gap-2">
          <label className={`${labelClass} flex-1`}>Elemento {index + 1}<input className={inputClass} maxLength={500} value={item} onChange={e => change({ ...block, items: block.items.map((x, i) => i === index ? e.target.value : x) })} /></label>
          <button type="button" className={actionClass} disabled={block.items.length === 1} onClick={() => change({ ...block, items: block.items.filter((_, i) => i !== index) })}>Quitar</button>
        </div>)}
        <button type="button" className={actionClass} disabled={block.items.length >= 20} onClick={() => change({ ...block, items: [...block.items, "Nuevo elemento"] })}>Agregar elemento</button>
      </>;
    case "faq":
      return <>
        {block.items.map((item, index) => <div key={index} className="space-y-2 rounded-md border p-2">
          <label className={labelClass}>Pregunta {index + 1}<input className={inputClass} maxLength={240} value={item.question} onChange={e => change({ ...block, items: block.items.map((x, i) => i === index ? { ...x, question: e.target.value } : x) })} /></label>
          <label className={labelClass}>Respuesta {index + 1}<textarea className={inputClass} maxLength={2000} value={item.answer} onChange={e => change({ ...block, items: block.items.map((x, i) => i === index ? { ...x, answer: e.target.value } : x) })} /></label>
          <button type="button" className={actionClass} disabled={block.items.length === 1} onClick={() => change({ ...block, items: block.items.filter((_, i) => i !== index) })}>Quitar pregunta</button>
        </div>)}
        <button type="button" className={actionClass} disabled={block.items.length >= 20} onClick={() => change({ ...block, items: [...block.items, { question: "Nueva pregunta", answer: "Respuesta" }] })}>Agregar pregunta</button>
      </>;
  }
}

export default function LandingEditor({ scope, sites: initialSites, initial, initialRevision }: {
  scope: { companyId: string; projectId: string }; sites: Site[]; initial: CampaignContent; initialRevision: number;
}) {
  const [content, setContent] = useState(initial);
  const [revision, setRevision] = useState(initialRevision);
  const [sites, setSites] = useState(initialSites);
  const [siteId, setSiteId] = useState("");
  const [siteName, setSiteName] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean; conflict?: boolean }>();
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const variant = content.variants.find(item => item.siteId === siteId);
  const visibleBlocks = campaignForSite(content, siteId).blocks;
  const block = visibleBlocks.find(item => item.id === selected);
  const index = content.blocks.findIndex(item => item.id === selected);
  const isProtected = !!block && !!content.protectedBlockIds?.includes(block.id);
  const isOverride = !!block && !!variant?.blocks.some(item => item.id === block.id);

  function update(next: CampaignContent) {
    setContent(next);
    setDirty(true);
    if (!message?.conflict) setMessage(undefined);
  }

  function add(type: CampaignBlock["type"]) {
    const item = newCampaignBlock(type, crypto.randomUUID());
    update({ ...content, blocks: [...content.blocks, item] });
    setSelected(item.id);
  }

  function change(item: CampaignBlock) {
    if (siteId) {
      if (isProtected) return;
      update(updateSiteVariant(content, siteId, current => ({ ...current, blocks: [...current.blocks.filter(x => x.id !== item.id), item] })));
    } else {
      update({ ...content, blocks: content.blocks.map(x => x.id === item.id ? item : x) });
    }
  }

  function changeDesign(patch: Partial<CampaignDesign>) {
    update({ ...content, design: { ...content.design, ...patch } });
  }

  function move(delta: number) {
    const blocks = [...content.blocks];
    const [item] = blocks.splice(index, 1);
    blocks.splice(index + delta, 0, item);
    update({ ...content, blocks });
  }

  function save() {
    startTransition(async () => {
      try {
        const result = await saveLanding(scope, revision, content);
        if ("error" in result && result.error) {
          setMessage({ text: result.error, error: true, conflict: result.conflict });
        } else if ("revision" in result && result.revision !== undefined) {
          setRevision(result.revision);
          setDirty(false);
          setMessage({ text: "Borrador guardado." });
        }
      } catch {
        setMessage({ text: "No se pudo guardar. Comprueba tu sesión y vuelve a intentar.", error: true });
      }
    });
  }

  function createSite() {
    startTransition(async () => {
      try {
        const result = await addLandingSite(scope, siteName);
        if (!result.site) return setMessage({ text: result.error, error: true });
        setSites([...sites, result.site]);
        setSiteId(result.site.id);
        setSiteName("");
      } catch {
        setMessage({ text: "No se pudo crear la sede.", error: true });
      }
    });
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
      <label className="text-sm font-medium">Contenido
        <select className="ml-2 max-w-full rounded-md border bg-transparent px-2 py-1" value={siteId} onChange={e => setSiteId(e.target.value)}>
          <option value="">Plantilla corporativa</option>
          {sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
        </select>
      </label>
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">Revisión {revision}{dirty ? " · Cambios sin guardar" : ""}</span>
        <button type="button" disabled={pending || !dirty || !!message?.conflict} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={save}>{pending ? "Procesando…" : "Guardar borrador"}</button>
      </div>
    </div>
    {message && <p role={message.error ? "alert" : "status"} className={message.error ? "text-sm text-red-700 dark:text-red-300" : "text-sm text-emerald-700 dark:text-emerald-300"}>{message.text}</p>}
    <fieldset disabled={pending} className="grid min-w-0 gap-4 xl:grid-cols-[minmax(180px,0.8fr)_minmax(280px,1.2fr)_minmax(240px,1fr)]">
      <section className={panelClass} aria-label="Biblioteca de bloques">
        <h2 className="mb-3 text-sm font-semibold">Bloques</h2>
        {!siteId && <div className="mb-4 grid grid-cols-2 gap-2">{Object.entries(blockNames).map(([type, name]) => <button key={type} type="button" className={actionClass} disabled={content.blocks.length >= 40} onClick={() => add(type as CampaignBlock["type"])}>+ {name}</button>)}</div>}
        <button type="button" className={`mb-2 w-full text-left ${actionClass}`} aria-pressed={selected === null} onClick={() => setSelected(null)}>Identidad y sedes</button>
        <ol className="space-y-2">{visibleBlocks.map((item, i) => <li key={item.id}>
          <button type="button" aria-pressed={selected === item.id} className={`w-full text-left ${actionClass} ${selected === item.id ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : ""}`} onClick={() => setSelected(item.id)}>
            {i + 1}. {blockNames[item.type]}{item.hidden ? " · Oculto" : ""}{content.protectedBlockIds?.includes(item.id) ? " · Protegido" : ""}
          </button>
        </li>)}</ol>
      </section>
      <section className={`${panelClass} space-y-4`} aria-label="Configuración">
        {block ? <>
          <h2 className="text-sm font-semibold">{blockNames[block.type]}</h2>
          {siteId && isProtected ? <p className="text-sm text-slate-500">Este bloque corporativo se hereda y solo puede editarse en la plantilla.</p> : <>
            <BlockFields key={siteId + ":" + block.id} scope={scope} block={block} change={change} />
            <label className={labelClass}><input type="checkbox" className="mr-2" checked={block.hidden} onChange={e => change({ ...block, hidden: e.target.checked })} />Ocultar bloque</label>
            {siteId && isOverride && <button type="button" className={actionClass} onClick={() => update(updateSiteVariant(content, siteId, current => ({ ...current, blocks: current.blocks.filter(item => item.id !== block.id) })))}>Restablecer bloque corporativo</button>}
          </>}
          {!siteId && <>
            <label className={labelClass}><input type="checkbox" className="mr-2" checked={isProtected} onChange={e => {
              const ids = content.protectedBlockIds ?? [];
              update(e.target.checked ? { ...removeBlockOverrides(content, block.id), protectedBlockIds: [...ids, block.id] } :
                { ...content, protectedBlockIds: ids.filter(id => id !== block.id) });
            }} />Proteger en todas las sedes</label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={actionClass} disabled={index <= 0} onClick={() => move(-1)}>Subir</button>
              <button type="button" className={actionClass} disabled={index >= content.blocks.length - 1} onClick={() => move(1)}>Bajar</button>
              <button type="button" className={actionClass} disabled={content.blocks.length >= 40} onClick={() => {
                const copy = { ...block, id: crypto.randomUUID() };
                const items = [...content.blocks];
                items.splice(index + 1, 0, copy);
                update({ ...content, blocks: items });
                setSelected(copy.id);
              }}>Duplicar</button>
              <button type="button" className={`${actionClass} text-red-700 dark:text-red-300`} onClick={() => {
                update({ ...removeBlockOverrides(content, block.id), blocks: content.blocks.filter(item => item.id !== block.id),
                  protectedBlockIds: content.protectedBlockIds?.filter(id => id !== block.id) ?? [] });
                setSelected(null);
              }}>Eliminar</button>
            </div>
          </>}
        </> : <>
          <h2 className="text-sm font-semibold">Identidad</h2>
          {siteId ? <>
            <label className={labelClass}>Color de la sede<input type="color" className={inputClass} value={variant?.color ?? content.design.color} onChange={e => update(updateSiteVariant(content, siteId, current => ({ ...current, color: e.target.value })))} /></label>
            {variant?.color && <button type="button" className={actionClass} onClick={() => update(updateSiteVariant(content, siteId, current => ({ siteId, blocks: current.blocks })))}>Heredar color corporativo</button>}
          </> : <>
            <label className={labelClass}>Nombre visible<input className={inputClass} maxLength={120} value={content.design.name} onChange={e => changeDesign({ name: e.target.value })} /></label>
            <CampaignImageInput scope={scope} kind="logo" value={content.design.logo ?? ""} label="Logo (URL HTTPS)" onChange={url => {
              const design = { ...content.design };
              if (url) design.logo = url;
              else delete design.logo;
              update({ ...content, design });
            }} />
            <label className={labelClass}>Color corporativo<input type="color" className={inputClass} value={content.design.color} onChange={e => changeDesign({ color: e.target.value })} /></label>
            <label className={labelClass}>Tipografía<select className={inputClass} value={content.design.font} onChange={e => changeDesign({ font: e.target.value as CampaignDesign["font"] })}><option value="system">Sistema</option><option value="serif">Serif</option></select></label>
            <label className={labelClass}>Estilo<select className={inputClass} value={content.design.style} onChange={e => changeDesign({ style: e.target.value as CampaignDesign["style"] })}><option value="clean">Limpio</option><option value="bold">Destacado</option><option value="editorial">Editorial</option></select></label>
            <div className="flex items-end gap-2 border-t pt-3">
              <label className={`${labelClass} flex-1`}>Nueva sede<input className={inputClass} maxLength={120} value={siteName} onChange={e => setSiteName(e.target.value)} /></label>
              <button type="button" className={actionClass} disabled={!siteName.trim()} onClick={createSite}>Crear sede</button>
            </div>
          </>}
        </>}
      </section>
      <CampaignPreview content={content} siteId={siteId} />
    </fieldset>
  </div>;
}
