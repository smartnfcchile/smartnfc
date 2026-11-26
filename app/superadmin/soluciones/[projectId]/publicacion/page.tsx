import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../../../lib/prisma";
import { requireSuperAdmin } from "../../../../../lib/permissions";
import { transferableCampaignTag } from "../../../../../lib/soluciones/campaign-landing";
import { campaignPublication } from "../../../../../lib/soluciones/campaign-activation";
import { campaignDestination } from "../../../../../lib/soluciones/destination";
import CampaignStatus from "../CampaignStatus";
import { isPublicationExpired } from "../../../../../lib/soluciones/publication-expiry";
import { Operation, PointUrl } from "./Controls";

const lifecycle = ["landing-approve", "landing-publish", "landing-rollback", "landing-unpublish", "landing-tag-site", "landing-tag-transfer-in", "landing-tag-transfer-out"];
const labels: Record<string, string> = {
  "landing-approve": "Aprobación", "landing-publish": "Publicación", "landing-rollback": "Restauración",
  "landing-unpublish": "Retirada", "landing-tag-site": "Asignación de sede",
  "landing-tag-transfer-in": "Punto recibido", "landing-tag-transfer-out": "Punto trasladado",
};
const utc = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
const formatDate = (date: Date | null | undefined) => date ? utc.format(date) + " UTC" : "—";
const card = "min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-700";
const link = "text-sm font-semibold text-blue-700 underline dark:text-blue-300";

export default async function CampaignOperations({ params, searchParams }: {
  params: Promise<{ projectId: string }>; searchParams: Promise<{ page?: string; punto?: string }>;
}) {
  await requireSuperAdmin();
  const { projectId } = await params;
  const { page: rawPage, punto } = await searchParams;
  const query = typeof punto === "string" ? punto.trim().slice(0, 120) : "";
  const page = typeof rawPage === "string" && /^[1-9]\d{0,4}$/.test(rawPage) ? Number(rawPage) : 1;
  const pageSize = 20;
  const project = await prisma.solutionProject.findFirst({
    where: { id: projectId, mode: "CAMPAIGN", company: { isActive: true } },
    select: {
      id: true, name: true, companyId: true, revision: true, status: true, destinationUrl: true,
      company: { select: { name: true } },
      campaignSites: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      campaignLanding: { select: {
        revision: true, destination: true, expiresAt: true, publishedVersionId: true,
        publishedVersion: { select: { revision: true, content: true } },
        versions: { orderBy: { revision: "desc" }, take: 50, select: { id: true, revision: true, approvedAt: true } },
      } },
      tags: {
        where: { recordId: null }, orderBy: { id: "asc" }, skip: (page - 1) * pageSize, take: pageSize + 1,
        select: { id: true, publicToken: true, status: true, campaignSiteId: true, campaignSite: { select: { name: true } } },
      },
    },
  });
  if (!project) notFound();
  const scope = { projectId, companyId: project.companyId };
  const href = `/superadmin/soluciones/${projectId}`;
  const landing = project.campaignLanding;
  const publishedId = landing?.publishedVersionId;
  const recentVersions = landing?.versions ?? [];
  const [history, everPublished, publication, candidates, pointCount, activePoint] = await Promise.all([
    prisma.solutionOperation.findMany({ where: { ...scope, kind: { in: lifecycle } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 30 }),
    prisma.solutionOperation.findMany({ where: { ...scope, kind: "landing-publish", targetId: { in: recentVersions.map(v => v.id) } }, select: { targetId: true }, distinct: ["targetId"] }),
    publishedId ? prisma.solutionOperation.findFirst({
      where: { ...scope, targetId: publishedId, kind: { in: ["landing-publish", "landing-rollback"] } }, orderBy: { createdAt: "desc" }, select: { createdAt: true },
    }) : null,
    prisma.solutionTag.findMany({
      where: {
        ...transferableCampaignTag, companyId: project.companyId, projectId: { not: projectId },
        ...(query ? { OR: [
          { publicToken: { endsWith: query } },
          { project: { name: { contains: query, mode: "insensitive" } } },
          { batch: { name: { contains: query, mode: "insensitive" } } },
        ] } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 51,
      select: {
        id: true, publicToken: true, status: true, project: { select: { id: true, name: true, revision: true } },
        batch: { select: { name: true } }, campaignSite: { select: { name: true } },
      },
    }),
    prisma.solutionTag.count({ where: { ...scope, status: "ACTIVE", recordId: null } }),
    prisma.solutionTag.findFirst({
      where: { ...scope, status: "ACTIVE", recordId: null }, select: { publicToken: true },
    }),
  ]);
  const prior = new Set(everPublished.map(x => x.targetId));
  const approved = recentVersions.find(v => v.revision === landing?.revision);
  const expired = isPublicationExpired(landing?.expiresAt);
  const publicationState = campaignPublication(landing);
  const state = publicationState.state;
  const variants = new Set(state === "published" ? publicationState.content.variants.map(variant => variant.siteId) : []);
  const landingMode = state !== "external";
  const live = state === "published" && project.status === "ACTIVE";
  let externalAvailable = false;
  if (!landingMode) {
    try { externalAvailable = !!campaignDestination(project.destinationUrl ?? ""); } catch { /* Missing or invalid destination. */ }
  }
  const canPublish = !!approved && !prior.has(approved.id);
  const next = state === "published" && project.status !== "ACTIVE" ? {
    label: "Ir a la activación", href: href + "#configuracion",
    note: "La landing ya está publicada. Solo falta activar el proyecto para habilitar su acceso desde los puntos activos.",
  } : state === "published" ? undefined
    : !landing ? { label: "Preparar y guardar borrador", href: href + "/landing" }
    : canPublish ? { label: "Ir a publicar la versión", href: "#aprobar-publicar" }
    : !approved && !landingMode ? { label: "Ir a aprobar la versión", href: "#aprobar-publicar" }
    : { label: "Revisar versiones", href: "#versiones" };
  const origin = process.env.VERCEL_ENV === "preview" && process.env.VERCEL_BRANCH_URL
    ? `https://${process.env.VERCEL_BRANCH_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || "https://www.smartnfc.cl";
  const expiry = <label className="block text-sm">Vencimiento opcional (UTC)<input className="mt-1 block w-full rounded border bg-transparent p-2" type="datetime-local" name="expiry" /></label>;

  return <div className="space-y-5">
    <header className="space-y-2">
      <p className="text-sm text-slate-500">{project.company.name} / {project.name}</p>
      <h1 className="text-3xl font-bold">Publicación y puntos NFC/QR</h1>
      <div className="flex flex-wrap gap-4"><Link className={link} href={`/superadmin/soluciones?companyId=${encodeURIComponent(project.companyId)}`}>Ver proyectos</Link>
        <Link className={link} href={href}>Ver campaña</Link><Link className={link} href={href + "/landing"}>Editar landing</Link></div>
    </header>
    <CampaignStatus project={project.status} landing={state} version={landing?.publishedVersion?.revision}
      pointCount={pointCount} activeToken={activePoint?.publicToken} externalAvailable={externalAvailable} next={next} />
    <section id="aprobar-publicar" className={card} aria-label="Estado de publicación">
      <h2 className="text-lg font-semibold">Aprobación y publicación</h2>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt>Publicada o restaurada</dt><dd>{formatDate(publication?.createdAt)}</dd></div>
        <div><dt>Vencimiento</dt><dd>{formatDate(landing?.expiresAt)}</dd></div>
      </dl>
      {!landing && <p className="mt-3 text-sm">Guarda un borrador en el editor para habilitar la aprobación.</p>}
      {landing && <div className="mt-4 grid gap-3 md:grid-cols-2">
        {!approved && <Operation scope={scope} revision={landing.revision} action="approve" label="Aprobar borrador" />}
        {approved && !prior.has(approved.id) && <Operation scope={scope} revision={landing.revision} action="publish" target={approved.id} label="Publicar versión">
          <p className="text-sm">La versión v{approved.revision} sustituirá el destino de los puntos activos de esta campaña.</p>{expiry}
        </Operation>}
        {landingMode && publishedId && <Operation scope={scope} revision={landing.revision} action="unpublish" label="Retirar publicación">
          <p className="text-sm">Los puntos de esta landing mostrarán que el contenido no está disponible.</p>
        </Operation>}
      </div>}
    </section>
    <section id="versiones" className={card} aria-label="Historial de versiones">
      <h2 className="text-lg font-semibold">Versiones recientes</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">{recentVersions.map(version => <div key={version.id} className="space-y-2 rounded border p-3 text-sm">
        <p className="font-semibold">v{version.revision} · {version.id === publishedId ? "Seleccionada" : prior.has(version.id) ? "Publicada anteriormente" : "Aprobada"}</p>
        <p>Aprobación {formatDate(version.approvedAt)}</p>
        {landing && prior.has(version.id) && version.id !== publishedId && <Operation scope={scope} revision={landing.revision} action="restore" target={version.id} label={`Restaurar v${version.revision}`}>{expiry}
          <p className="text-sm">{expired ? "Indica un nuevo vencimiento futuro." : "En blanco conserva el vencimiento actual."}</p>
        </Operation>}
      </div>)}</div>
      <h3 className="mt-4 font-semibold">Actividad reciente</h3>
      {history.length ? <ul className="mt-2 space-y-1 text-sm">{history.map(event => <li key={event.id}>{formatDate(event.createdAt)} · {labels[event.kind] ?? event.kind}</li>)}</ul> : <p className="text-sm text-slate-500">Sin operaciones registradas.</p>}
    </section>
    <section className={card} aria-label="Asociar punto existente">
      <h2 className="text-lg font-semibold">Asociar punto existente</h2>
      <p className="mt-1 text-sm">Campaña de destino: {project.name}. Puedes trasladar puntos pendientes o deshabilitados de otras campañas de esta organización.</p>
      <form action={href + "/publicacion"} className="my-3 flex flex-wrap items-end gap-2">
        <label className="min-w-0 text-sm">Buscar por proyecto, lote o final del token
          <input name="punto" defaultValue={query} maxLength={120} className="mt-1 block w-full rounded border bg-transparent p-2" />
        </label>
        <button className="rounded border px-3 py-2 text-sm">Buscar puntos</button>
      </form>
      {candidates.length > 50 && <p className="mb-2 text-sm">Se muestran 50 puntos. Usa la búsqueda para afinar los resultados.</p>}
      {candidates.length ? <Operation scope={scope} revision={project.revision} action="transfer" label="Asociar punto existente">
        <label className="block text-sm">Punto de origen
          <select name="point" required defaultValue="" className="mt-1 block w-full rounded border bg-transparent p-2">
            <option value="" disabled>Seleccionar punto</option>
            {candidates.slice(0, 50).map(tag => <option key={tag.id} value={`${tag.id}:${tag.project.id}:${tag.project.revision}`}>
              {tag.project.name} · …{tag.publicToken.slice(-8)} · {tag.status === "PENDING" ? "Pendiente" : "Deshabilitado"} · {tag.campaignSite?.name ?? "Sin sede"} · {tag.batch?.name ?? "Sin lote"}
            </option>)}
          </select>
        </label>
        <label className="block text-sm">Sede de destino
          <select name="site" className="mt-1 block w-full rounded border bg-transparent p-2">
            <option value="">Plantilla corporativa</option>
            {project.campaignSites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
          </select>
        </label>
        <p className="text-sm">El punto saldrá de su campaña, sede y lote anteriores. Conservará su URL y su estado. El conteo original del lote corresponde a los soportes generados.</p>
      </Operation> : <p className="text-sm text-slate-500">No hay puntos elegibles para esta búsqueda.</p>}
    </section>
    <section className={card} aria-label="Puntos de la campaña">
      <h2 className="text-lg font-semibold">Puntos de la campaña</h2>
      <p className="mt-1 text-sm text-slate-500">Cada punto conserva su URL. La sede determina la variante de las landings vigentes.</p>
      {!project.tags.length && <p className="mt-3 text-sm">No hay puntos en esta página.</p>}
      <div className="mt-3 grid gap-3 xl:grid-cols-2">{project.tags.slice(0, pageSize).map((tag, index) => {
        const available = tag.status === "ACTIVE" && project.status === "ACTIVE";
        const destination = !available ? "No disponible" : landingMode
          ? live ? tag.campaignSiteId && variants.has(tag.campaignSiteId) ? `Variante · ${tag.campaignSite?.name}` : "Landing corporativa" : "Landing no disponible"
          : project.destinationUrl || "Sin destino";
        return <article key={tag.id} className="min-w-0 space-y-2 rounded-lg border p-3">
          <h3 className="font-semibold">Punto {(page - 1) * pageSize + index + 1}</h3>
          <p className="break-all text-sm">{destination}</p>
          <PointUrl url={`${origin.replace(/\/$/, "")}/s/${tag.publicToken}`} />
          {tag.status !== "REPLACED" && <Operation scope={scope} revision={project.revision} action="site" target={tag.id} label="Guardar sede">
            <label className="block text-sm">Sede del punto<select key={tag.campaignSiteId ?? "base"} name="site" defaultValue={tag.campaignSiteId ?? ""} className="mt-1 block w-full rounded border bg-transparent p-2">
              <option value="">Plantilla corporativa</option>
              {project.campaignSites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
            </select></label>
          </Operation>}
        </article>;
      })}</div>
      <nav className="mt-3 flex gap-4" aria-label="Páginas de puntos">
        {page > 1 && <Link className={link} href={`${href}/publicacion?page=${page - 1}`}>Anterior</Link>}
        {project.tags.length > pageSize && <Link className={link} href={`${href}/publicacion?page=${page + 1}`}>Siguiente</Link>}
      </nav>
    </section>
  </div>;
}
