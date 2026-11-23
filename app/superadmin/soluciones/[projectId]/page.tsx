import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/prisma";
import { requireSuperAdmin } from "../../../../lib/permissions";
import { solutionCsvHeader } from "../../../../lib/soluciones/csv";
import QRCode from "qrcode";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { updateSolution } from "../project-actions";
import CsvImportForm from "./CsvImportForm";

  function Editor({ project, operation, targetId, children }: {
    project: { id: string; companyId: string; revision: number };
    operation: string;
    targetId?: string;
    children: ReactNode;
  }) {
    return <form action={updateSolution} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="companyId" value={project.companyId}/>
      <input type="hidden" name="projectId" value={project.id}/>
      <input type="hidden" name="revision" value={project.revision}/>
      <input type="hidden" name="operation" value={operation}/>
      <input type="hidden" name="targetId" value={targetId}/>
      {children}
    </form>;
  }
  const button = "rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white";
  const fieldClass = "rounded border bg-transparent px-2 py-1.5 text-sm";

  function AssetFields({ record, templates, templateId, fields }: {
    record?: { externalCode: string; location: string | null; templateId: string; data: unknown };
    templates: { id: string; name: string; version: number }[];
    templateId?: string;
    fields: string[];
  }) {
    return <>
      <input aria-label="Código" name="code" required maxLength={100} defaultValue={record?.externalCode} placeholder="Código del activo" className={fieldClass}/>
      <input aria-label="Ubicación" name="location" maxLength={120} defaultValue={record?.location ?? ""} placeholder="Sede o ubicación" className={fieldClass}/>
      <select aria-label="Plantilla" name="templateId" defaultValue={record?.templateId ?? templateId} className={fieldClass}>
        {templates.map(item => <option key={item.id} value={item.id}>{item.name} · v{item.version}</option>)}
      </select>
      <textarea aria-label="Valores de la ficha en JSON" name="fields" required className={fieldClass}
        defaultValue={JSON.stringify(record?.data ?? Object.fromEntries(fields.map(key => [key, ""])), null, 2)}/>
      <button className={button}>{record ? "Guardar ficha" : "Crear ficha"}</button>
    </>;
  }

export const dynamic = "force-dynamic";
export default async function SolutionProjectAdmin({ params, searchParams }: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string; qr?: string; location?: string; template?: string }>
}) {
  await requireSuperAdmin();
  const { projectId } = await params;
  const filters = await searchParams;
  const location = typeof filters.location === "string" ? filters.location.slice(0,120) : "";
  const project = await prisma.solutionProject.findFirst({
    where: { id: projectId, company: { isActive: true } },
    select: {
      id:true, name:true, companyId:true, mode:true, status:true, revision:true, destinationUrl:true,
      batches: { orderBy:{createdAt:"desc"}, take:50 },
      tags: { select:{ id:true, publicToken:true, status:true, batchId:true, record:{ select:{ externalCode:true } } }, orderBy:[{createdAt:"desc"}, {id:"asc"}], take:500 },
      templates: { select: { id:true, code:true, name:true, version:true, fields:true }, orderBy:{ createdAt:"desc" }, take:50 },
      records: { where: location ? { location } : undefined, select: { id:true, externalCode:true, status:true, location:true, templateId:true, data:true }, orderBy:{createdAt:"desc"}, take:50 },
      _count:{ select: { records:true, tags:true }}
    }
  });
  if (!project) notFound();
  const { error } = filters;
  const qrTag = project.tags.find(tag => tag.id === filters.qr);
  const previewHost = process.env.VERCEL_ENV === "preview" ? process.env.VERCEL_BRANCH_URL : undefined;
  const requestHost = (await headers()).get("host");
  const origin = previewHost ? `https://${previewHost}`
    : process.env.NODE_ENV === "development" && requestHost && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestHost)
      ? `http://${requestHost}` : "https://www.smartnfc.cl";
  const qrUrl = qrTag ? `${origin}/s/${qrTag.publicToken}` : null;
  const qrImage = qrUrl ? await QRCode.toDataURL(qrUrl, { width: 320, margin: 4 }) : null;
  const template = project.templates.find(item => item.id === filters.template) ?? project.templates[0];
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
    {error && <p role="alert" className="rounded border border-red-500 p-3">{error}</p>}
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="font-bold">Configuración del proyecto</h2>
      <Editor project={project} operation="settings">
        <input aria-label="Nombre" name="name" required maxLength={120} defaultValue={project.name} className={fieldClass}/>
        <select aria-label="Estado del proyecto" name="status" defaultValue={project.status} className={fieldClass}>
          <option value="DRAFT">Borrador</option><option value="ACTIVE">Activo</option><option value="INACTIVE">Suspendido</option>
        </select>
        {project.mode === "CAMPAIGN" && <input aria-label="Destino HTTPS" type="url" name="destination" placeholder="https://…" defaultValue={project.destinationUrl ?? ""} className={fieldClass}/>}
        <button className={button}>Guardar proyecto</button>
      </Editor>
    </section>
    {project.mode === "CAMPAIGN" && <section className="space-y-3 rounded-lg border p-4">
      <h2 className="font-bold">Lotes de campaña</h2>
      <Editor project={project} operation="batch">
        <input aria-label="Nombre del lote" name="name" placeholder="Nombre del lote" required maxLength={120} className={fieldClass}/>
        <input aria-label="Cantidad de etiquetas" name="quantity" type="number" min={1} max={200} required className={fieldClass}/>
        <button className={button}>Generar lote</button>
      </Editor>
      {project.batches.map(batch => <Editor project={project} key={batch.id} operation="batch-state" targetId={batch.id}>
        <span>{batch.name} · {batch.quantity} soportes</span>
        <button className={button} name="activate" value="yes">Activar lote</button>
        <button className={button} name="activate" value="no">Suspender lote</button>
      </Editor>)}
    </section>}
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="font-bold">Etiquetas NFC y QR</h2>
      {qrImage && qrUrl && <div className="space-y-2">
        {/* The generated PNG can be downloaded directly for printing. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width={240} height={240} src={qrImage} alt="Código QR de la etiqueta"/>
        <p className="break-all font-mono text-sm">{qrUrl}</p>
        <a href={qrImage} download="smartnfc-qr.png" className="text-blue-600 underline">Descargar QR</a>
      </div>}
      {project.tags.map(tag => <Editor project={project} key={tag.id} operation="tag" targetId={tag.id}>
        <a className="text-blue-600 underline" href={`/s/${tag.publicToken}`} target="_blank" rel="noreferrer">{tag.publicToken.slice(0, 10)} · Abrir enlace</a>
        <Link href={`?qr=${encodeURIComponent(tag.id)}`} className="text-blue-600 underline">Ver QR y URL NFC</Link>
        {tag.record && <span>{tag.record.externalCode}</span>}
        {tag.batchId && <span>{project.batches.find(batch => batch.id === tag.batchId)?.name}</span>}
        <span>{tag.status}</span>
        {tag.status !== "REPLACED" && <>
          <button className={button} name="status" value="ACTIVE">Activar</button>
          <button className={button} name="status" value="DISABLED">Suspender</button>
          <button className={button} name="status" value="REPLACED">Reemplazar</button>
        </>}
      </Editor>)}
    </section>
    {project.mode === "ASSETS" && <section className="space-y-3 rounded-lg border p-4">
      <h2 className="font-bold">Plantillas y activos</h2>
      <form className="flex flex-wrap gap-2">
        <select aria-label="Filtrar plantilla de importación" name="template" defaultValue={template?.id} className={fieldClass}>
          {project.templates.map(item => <option key={item.id} value={item.id}>{item.name} · v{item.version}</option>)}
        </select>
        <input aria-label="Filtrar por ubicación exacta" name="location" defaultValue={location} placeholder="Filtrar por ubicación" className={fieldClass}/>
        <button className={button}>Aplicar filtros</button>
      </form>
      <details><summary>Crear versión de plantilla</summary>
        <Editor project={project} operation="template">
          <input aria-label="Código de plantilla" name="code" required placeholder="codigo_plantilla" className={fieldClass}/>
          <input aria-label="Nombre de plantilla" name="name" required placeholder="Nombre" className={fieldClass}/>
          <textarea aria-label="Definición de campos en JSON" name="fields" required className={fieldClass}
            defaultValue={JSON.stringify(template?.fields ?? [{ key: "nombre", label: "Nombre", kind: "text", public: true }], null, 2)}/>
          <button className={button}>Guardar nueva versión</button>
        </Editor>
      </details>
      {template && <details><summary>Crear activo individual</summary><Editor project={project} operation="asset-save"><AssetFields templates={project.templates} templateId={template?.id} fields={fields}/></Editor></details>}
    </section>}
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
            {record.status !== "ARCHIVED" && <>
              <details><summary>Editar ficha</summary><Editor project={project} operation="asset-save" targetId={record.id}><AssetFields templates={project.templates} templateId={template?.id} fields={fields} record={record}/></Editor></details>
              <Editor project={project} operation="asset-state" targetId={record.id}>
                <button className={button} name="status" value="ACTIVE">Activar</button>
                <button className={button} name="status" value="INACTIVE">Suspender</button>
                <button className={button} name="status" value="ARCHIVED">Dar de baja</button>
              </Editor>
              <Editor project={project} operation="asset-tag" targetId={record.id}><button className={button}>Generar etiqueta</button></Editor>
            </>}
          </div>)}
      </div>
      {project._count.records>50 && <p className="text-xs text-slate-500">Se muestran los últimos 50 registros.</p>}
    </section>
  </main>;
}