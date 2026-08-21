"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Design = { id: string; name: string; status: string; version: number; updatedAt: string; template: { name: string } };
type Card = { id: string; name: string; slug: string; profileName: string | null; isActive: boolean; updatedAt: string; company: { id: string; name: string }; user: { id: string; name: string | null; email: string }; physicalCardDesigns: Design[] };

export default function ProduccionClient({ cards }: { cards: Card[] }) {
  const [query, setQuery] = useState("");
  const [companyId, setCompanyId] = useState("");
  const companies = useMemo(() => Array.from(new Map(cards.map(card => [card.company.id, card.company])).values()), [cards]);
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("es");
    return cards.filter(card => (!companyId || card.company.id === companyId) && (!term || [card.name, card.profileName, card.slug, card.company.name, card.user.name, card.user.email].some(value => value?.toLocaleLowerCase("es").includes(term))));
  }, [cards, companyId, query]);

  return <div className="space-y-4">
    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[1fr_260px]">
      <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar tarjeta, usuario, correo, slug o empresa…" className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
      <select value={companyId} onChange={event => setCompanyId(event.target.value)} className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="">Todas las empresas</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select>
    </section>
    <p className="text-xs font-semibold text-slate-500">{visible.length} de {cards.length} tarjetas</p>
    {visible.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700">No hay tarjetas que coincidan con la búsqueda.</div> : <div className="grid gap-4 xl:grid-cols-2">{visible.map(card => <article key={card.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/superadmin/cards/${card.id}/qr`} alt={`QR de ${card.profileName || card.name}`} className="h-24 w-24 shrink-0 rounded-xl border border-slate-200 bg-white p-2" />
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-lg font-black text-slate-950 dark:text-white">{card.profileName || card.name}</h2><span className={`rounded-full px-2 py-1 text-[9px] font-black ${card.isActive ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"}`}>{card.isActive ? "ACTIVA" : "INACTIVA"}</span></div><p className="mt-1 text-xs font-bold text-blue-600 dark:text-blue-400">{card.company.name}</p><p className="mt-1 truncate text-xs text-slate-500">{card.user.name || "Sin nombre"} · {card.user.email}</p><Link href={`/c/${card.slug}`} target="_blank" className="mt-2 block truncate text-xs text-slate-500 hover:text-blue-500">/c/{card.slug} ↗</Link></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2"><a href={`/api/superadmin/cards/${card.id}/qr?download=1`} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500">Descargar QR PNG</a><a href={`/api/superadmin/cards/${card.id}/qr?format=svg&download=1`} className="rounded-lg border border-blue-300 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950">QR SVG editable</a></div>
      <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800"><h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Diseños físicos ({card.physicalCardDesigns.length})</h3>{card.physicalCardDesigns.length === 0 ? <p className="mt-3 rounded-xl bg-amber-50 px-3 py-3 text-xs font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">Pendiente: el usuario aún no creó un arte físico.</p> : <div className="mt-3 space-y-3">{card.physicalCardDesigns.map(design => <div key={design.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-bold text-slate-900 dark:text-white">{design.name}</p><p className="mt-1 text-[11px] text-slate-500">{design.template.name} · v{design.version} · {design.status}</p></div><span className="text-[10px] text-slate-500">{new Date(design.updatedAt).toLocaleDateString("es-CL")}</span></div><div className="mt-3 flex flex-wrap gap-2"><a href={`/api/physical-designs/${design.id}/pdf`} className="rounded-lg bg-slate-800 px-3 py-2 text-[11px] font-bold text-white">PDF impresión</a><a href={`/api/physical-designs/${design.id}/svg?side=front`} className="rounded-lg border border-slate-300 px-3 py-2 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300">SVG anverso</a><a href={`/api/physical-designs/${design.id}/svg?side=back`} className="rounded-lg border border-slate-300 px-3 py-2 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300">SVG reverso</a></div></div>)}</div>}</div>
    </article>)}</div>}
  </div>;
}
