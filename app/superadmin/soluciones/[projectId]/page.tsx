import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/prisma";
import { requireSuperAdmin } from "../../../../lib/permissions";
import { solutionCsvHeader } from "../../../../lib/soluciones/csv";
import CsvImportForm from "./CsvImportForm";

export const dynamic = "force-dynamic";
export default async function SolutionProjectAdmin({ params }: {
  params: Promise<{ projectId: string }>
}) {
  await requireSuperAdmin();
  const { projectId } = await params;
  const project = await prisma.solutionProject.findFirst({
    where: { id: projectId, company: { isActive: true } },
    select: {
      id:true, name:true, companyId:true, mode:true, status:true,
      templates: { select: { id:true, code:true, name:true, fields:true }, orderBy:{ createdAt:"asc" }, take:1 },
      records: { select: { id:true, externalCode:true, status:true }, orderBy:{createdAt:"desc"}, take:50 },
      _count:{ select: { records:true, tags:true }}
    }
  });
  if (!project) notFound();
  const template = project.templates[0];
  const fields = Array.isArray(template?.fields)
    ? template.fields.filter((f): f is { key: string } =>
      !!f && typeof f==="object" && !Array.isArray(f) &&
      "key" in f && typeof f.key==="string").map(f=>f.key)
    : [];
  const header = solutionCsvHeader(fields);
  const downloadHref = "data:text/csv;charset=utf-8," + encodeURIComponent("\uFEFF" + header);
  return <main className="space-y-6">
    <Link href={`/superadmin/soluciones?companyId=${encodeURIComponent(project.companyId)}`}
      className="text-sm text-blue-600 underline">Volver a proyectos</Link>
    <h1 className="text-3xl font-black">{project.name}</h1>
    <p className="text-slate-500">{project.mode==="ASSETS"?"Activos individuales":"Campaña masiva"} · {project.status}</p>
    <div className="flex gap-4 text-sm">
      <span>{project._count.records} registros</span><span>{project._count.tags} etiquetas NFC</span>
    </div>
    {project.mode==="ASSETS" && template && project.status==="DRAFT" && <>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Plantilla: {template.name}</h2>
        <a download={template.code + ".csv"} href={downloadHref}
          className="text-blue-600 underline">Descargar plantilla CSV para Excel</a>
      </section>
      <CsvImportForm companyId={project.companyId} projectId={project.id} templateId={template.id}/>
    </>}
    <section className="space-y-2">
      <h2 className="text-xl font-bold">Fichas registradas</h2>
      <div className="rounded-lg border divide-y">
        {project.records.length===0 ? <p className="p-4 text-sm text-slate-500">Todavía no hay fichas</p> :
          project.records.map(record=><div key={record.id} className="p-3 flex justify-between gap-4">
            <span className="font-mono text-sm">{record.externalCode}</span>
            <span className="text-xs text-slate-500">{record.status}</span>
          </div>)}
      </div>
      {project._count.records>50 && <p className="text-xs text-slate-500">Se muestran los últimos 50 registros.</p>}
    </section>
  </main>;
}