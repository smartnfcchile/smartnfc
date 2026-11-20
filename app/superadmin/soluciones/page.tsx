import Link from "next/link";
import { prisma } from "../../../lib/prisma";
import { requireSuperAdmin } from "../../../lib/permissions";
import { listSolutionProjects } from "../../../lib/soluciones/access";
import { BUILT_IN_TEMPLATES } from "../../../lib/soluciones/core";
import { createSolutionProject } from "./actions";

export const dynamic = "force-dynamic";
export default async function SolucionesAdminPage({ searchParams }: {
  searchParams: Promise<{ companyId?: string }>
}) {
  await requireSuperAdmin();
  const { companyId } = await searchParams;
  const companies = await prisma.company.findMany({
    where: { isActive: true }, select: { id: true, name: true },
    orderBy: { name: "asc" }, take: 200
  });
  const selected = companies.find(c => c.id === companyId);
  const projects = selected ? await listSolutionProjects(selected.id) : [];
  return <div className="space-y-8">
    <div className="space-y-2">
      <Link href="/superadmin" className="text-sm text-blue-600 underline">Volver a superadministración</Link>
      <h1 className="text-3xl font-black">SmartNFC Soluciones</h1>
      <p className="text-sm text-slate-500">Gestión interna de proyectos en preparación. No hay activaciones ni cobros automáticos.</p>
    </div>
    <form method="GET" className="space-y-2 max-w-xl">
      <label htmlFor="companyId" className="block font-semibold">Seleccionar organización</label>
      <select id="companyId" name="companyId" defaultValue={selected?.id ?? ""} required
        className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900">
        <option value="">Seleccionar…</option>
        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <button type="submit" className="rounded-lg bg-blue-600 text-white px-4 py-2">Ver proyectos</button>
    </form>
    {selected && <>
      <section className="rounded-xl border p-5 space-y-4">
        <h2 className="text-xl font-bold">Crear proyecto para {selected.name}</h2>
        <form action={createSolutionProject} className="grid gap-4 max-w-xl">
          <input type="hidden" name="companyId" value={selected.id}/>
          <label className="grid gap-1">Nombre del proyecto
            <input name="name" minLength={3} maxLength={120} required className="p-3 border rounded-lg bg-white text-slate-900" placeholder="Control de extintores · Planta 1"/>
          </label>
          <label className="grid gap-1">Modalidad
            <select name="mode" defaultValue="ASSETS" className="p-3 border rounded-lg bg-white text-slate-900">
              <option value="ASSETS">Activos individuales</option><option value="CAMPAIGN">Campaña masiva</option>
            </select>
          </label>
          <label className="grid gap-1">Plantilla inicial
            <select name="templateCode" defaultValue="extintores" className="p-3 border rounded-lg bg-white text-slate-900">
              {BUILT_IN_TEMPLATES.map(t => <option key={t.code} value={t.code}>{t.name} ({t.mode === "ASSETS" ? "Activos" : "Campaña"})</option>)}
            </select>
          </label>
          <p className="text-xs text-slate-500">La modalidad debe coincidir con la plantilla. Todos los proyectos nacen en borrador.</p>
          <button className="rounded-lg bg-blue-600 text-white px-4 py-3 font-semibold" type="submit">Crear proyecto en borrador</button>
        </form>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Proyectos ({projects.length})</h2>
        {projects.length === 0 ? <p className="text-slate-500">Esta empresa todavía no tiene proyectos.</p> :
          <div className="grid gap-3">{projects.map(p => <div key={p.id} className="rounded-xl border p-4 flex flex-wrap justify-between gap-3">
            <div><b>{p.name}</b><p className="text-xs text-slate-500">{p.mode === "ASSETS" ? "Activos" : "Campaña"} · {p.status}</p></div>
            <div className="text-sm text-slate-500">{p._count.records} fichas · {p._count.tags} etiquetas · {p._count.batches} lotes</div>
          </div>)}</div>}
      </section>
    </>}
  </div>;
}