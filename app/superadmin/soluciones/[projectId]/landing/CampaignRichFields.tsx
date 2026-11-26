"use client";

import { campaignIcons, riskTones, type CampaignCard, type CampaignRichBlock, type RiskTone } from "../../../../../lib/soluciones/campaign-content";

const field = "block w-full rounded-md border bg-transparent p-2 text-sm";
const iconNames = { sun: "Sol", shield: "Protección", eye: "Ojos", shirt: "Vestimenta", shade: "Sombra", info: "Información" };
const toneNames = { green: "Verde", yellow: "Amarillo", orange: "Naranjo", red: "Rojo", violet: "Violeta" };
const action = "rounded-md border px-3 py-1 text-sm";

function CardFields({ card, change }: { card: CampaignCard; change: (card: CampaignCard) => void }) {
  return <>
    <label className="block text-sm">Título<input className={field} value={card.title} maxLength={120} onChange={e => change({ ...card, title: e.target.value })} /></label>
    <label className="block text-sm">Descripción<textarea className={field} value={card.text} maxLength={600} onChange={e => change({ ...card, text: e.target.value })} /></label>
    <label className="block text-sm">Icono<select className={field} value={card.icon} onChange={e => change({ ...card, icon: e.target.value as CampaignCard["icon"] })}>{campaignIcons.map(icon => <option key={icon} value={icon}>{iconNames[icon]}</option>)}</select></label>
  </>;
}

export default function CampaignRichFields({ block, change }: { block: CampaignRichBlock; change: (value: CampaignRichBlock) => void }) {
  if (block.type === "card-group") return <>
    <label className="block text-sm">Título del grupo<input className={field} maxLength={120} value={block.title} onChange={e => change({ ...block, title: e.target.value })} /></label>
    {block.cards.map((card, i) => <fieldset key={i} className="space-y-2 rounded border p-2">
      <legend>Tarjeta {i + 1}</legend>
      <CardFields card={card} change={item => change({ ...block, cards: block.cards.map((current, j) => j === i ? item : current) })} />
      <button className={action} type="button" disabled={block.cards.length <= 1} onClick={() => change({ ...block, cards: block.cards.filter((_, j) => i !== j) })}>Quitar tarjeta</button>
    </fieldset>)}
    <button className={action} type="button" disabled={block.cards.length >= 8} onClick={() => change({ ...block, cards: [...block.cards, { title: "Tarjeta", text: "Descripción", icon: "info" }] })}>Agregar tarjeta</button>
  </>;
  if (block.type === "risk-scale") return <>
    <label className="block text-sm">Título<input className={field} maxLength={120} value={block.title} onChange={e => change({ ...block, title: e.target.value })} /></label>
    <label className="block text-sm">Nota descriptiva<textarea className={field} maxLength={600} value={block.text} onChange={e => change({ ...block, text: e.target.value })} /></label>
    {block.bands.map((band, i) => <fieldset key={i} className="space-y-2 rounded border p-2">
      <legend>Tramo {i + 1}</legend>
      <label className="block text-sm">Rango<input className={field} maxLength={20} value={band.range} onChange={e => change({ ...block, bands: block.bands.map((entry, j) => j === i ? { ...entry, range: e.target.value } : entry) })} /></label>
      <label className="block text-sm">Etiqueta<input className={field} maxLength={40} value={band.label} onChange={e => change({ ...block, bands: block.bands.map((entry, j) => j === i ? { ...entry, label: e.target.value } : entry) })} /></label>
      <label className="block text-sm">Color<select className={field} value={band.tone} onChange={e => change({ ...block, bands: block.bands.map((entry, j) => j === i ? { ...entry, tone: e.target.value as RiskTone } : entry) })}>{riskTones.map(tone => <option key={tone} value={tone}>{toneNames[tone]}</option>)}</select></label>
      <button className={action} type="button" disabled={block.bands.length <= 2} onClick={() => change({ ...block, bands: block.bands.filter((_, j) => i !== j) })}>Quitar tramo</button>
    </fieldset>)}
    <button className={action} type="button" disabled={block.bands.length >= 8} onClick={() => change({ ...block, bands: [...block.bands, { range: "3", label: "Nivel", tone: "orange" }] })}>Agregar tramo</button>
  </>;
  return <>
    <CardFields card={block} change={card => change({ ...block, ...card })} />
    {block.type === "indicator" && (block.action ? <>
      <label className="block text-sm">Texto del botón<input className={field} maxLength={120} value={block.action.label} onChange={e => change({ ...block, action: { href: block.action!.href, label: e.target.value } })} /></label>
      <label className="block text-sm">Destino HTTPS<input className={field} type="url" maxLength={2048} value={block.action.href} onChange={e => change({ ...block, action: { label: block.action!.label, href: e.target.value } })} /></label>
      <button className={action} type="button" onClick={() => { const next = { ...block }; delete next.action; change(next); }}>Quitar botón</button>
    </> : <button className={action} type="button" onClick={() => change({ ...block, action: { label: "Consultar", href: "" } })}>Agregar botón</button>)}
  </>;
}
