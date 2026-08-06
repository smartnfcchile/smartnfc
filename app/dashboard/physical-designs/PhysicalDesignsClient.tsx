"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archivePhysicalDesignAction, createPhysicalDesignAction, duplicatePhysicalDesignAction } from "./actions";

type Card = { id: string; name: string; slug: string; profileName: string | null };
type Template = { id: string; name: string; slug: string; category: "PROFESSIONAL" | "LOCAL"; description: string | null; isPremium: boolean; frontSchema: object; backSchema: object; editableFields: object };
type Design = { id: string; name: string; status: string; updatedAt: string; version: number; card: { name: string; slug: string }; template: { name: string }; orderCount: number };

export default function PhysicalDesignsClient({ cards, templates, designs, initialCardId }: { cards: Card[]; templates: Template[]; designs: Design[]; initialCardId?: string }) {
  const router = useRouter();
  const [category, setCategory] = useState<"ALL" | "PROFESSIONAL" | "LOCAL">("ALL");
  const [cardId, setCardId] = useState(initialCardId && cards.some(c => c.id === initialCardId) ? initialCardId : cards[0]?.id || "");
  const [selected, setSelected] = useState(templates[0]?.id || "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const visible = useMemo(() => templates.filter(t => category === "ALL" || t.category === category), [templates, category]);
  const create = () => startTransition(async () => { try { setError(""); const card = cards.find(c => c.id === cardId); const result = await createPhysicalDesignAction({ cardId, templateId: selected, name: `${card?.profileName || card?.name || "Tarjeta"} · diseño físico` }); router.push(`/dashboard/physical-designs/${result.id}`); } catch (e) { setError(e instanceof Error ? e.message : "No fue posible crear el diseño."); } });
  const act = (fn: () => Promise<unknown>) => startTransition(async () => { try { setError(""); await fn(); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "No fue posible completar la acción."); } });
  return <div className="space-y-8">
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="space-y-4"><div><label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">1. Tarjeta digital</label><select value={cardId} onChange={e => setCardId(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white">{cards.map(card => <option key={card.id} value={card.id}>{card.profileName || card.name}</option>)}</select></div>
          <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">2. Categoría</p><div className="grid grid-cols-3 gap-2">{(["ALL", "PROFESSIONAL", "LOCAL"] as const).map(item => <button key={item} onClick={() => setCategory(item)} className={`rounded-lg px-2 py-2 text-[11px] font-bold ${category === item ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"}`}>{item === "ALL" ? "Todas" : item === "LOCAL" ? "Local" : "Profesional"}</button>)}</div></div>
          <button disabled={!cardId || !selected || pending} onClick={create} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50">{pending ? "Creando…" : "Crear con esta plantilla"}</button>{error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        </div>
        <div><p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">3. Plantilla</p><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visible.map(template => { const side = template.frontSchema as { background?: string; primary?: string; secondary?: string; layout?: string }; return <button key={template.id} onClick={() => setSelected(template.id)} className={`overflow-hidden rounded-xl border text-left transition ${selected === template.id ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-700 hover:border-slate-500"}`}><div className="relative aspect-[1.586] p-4" style={{ background: side.background || "#07101F" }}><div className="absolute inset-y-0 left-0 w-2" style={{ background: side.primary }} /><div className="h-2 w-20 rounded" style={{ background: side.secondary }} /><div className="mt-12 h-3 w-28 rounded bg-white/90"/><div className="mt-2 h-1.5 w-20 rounded bg-white/40"/><div className="absolute bottom-4 right-4 h-12 w-12 rounded-lg border-4 border-white bg-slate-950"/></div><div className="bg-slate-950 p-3"><div className="flex items-center justify-between"><span className="text-sm font-bold text-white">{template.name}</span>{template.isPremium && <span className="text-[9px] font-bold text-amber-400">PREMIUM</span>}</div><p className="mt-1 text-xs text-slate-500">{template.description}</p></div></button>; })}</div></div>
      </div>
    </section>
    <section><h2 className="mb-3 text-xl font-bold text-white">Mis diseños</h2>{designs.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-400">Aún no hay diseños. Elige una tarjeta y una plantilla para comenzar.</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{designs.map(design => <article key={design.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-white">{design.name}</h3><p className="mt-1 text-xs text-slate-400">{design.card.name} · {design.template.name}</p></div><span className="rounded-full bg-blue-500/10 px-2 py-1 text-[10px] font-bold text-blue-300">{design.status}</span></div><p className="mt-4 text-xs text-slate-500">Actualizado {new Date(design.updatedAt).toLocaleString("es-CL")} · {design.orderCount} pedidos</p><div className="mt-4 flex flex-wrap gap-2"><Link href={`/dashboard/physical-designs/${design.id}`} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white">Editar</Link><button disabled={pending} onClick={() => act(() => duplicatePhysicalDesignAction(design.id))} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white">Duplicar</button><button disabled={pending} onClick={() => confirm("¿Archivar este diseño?") && act(() => archivePhysicalDesignAction(design.id))} className="rounded-lg px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10">Archivar</button></div></article>)}</div>}</section>
  </div>;
}
