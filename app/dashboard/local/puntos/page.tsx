import Link from "next/link";
import { prisma } from "../../../../lib/prisma";
import { requireLocalAdmin } from "../../../../lib/local/access";
import { mediumLabels, objectiveLabels } from "../../../../lib/local/point-config";
export const dynamic = "force-dynamic";
export default async function PointsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { company } = await requireLocalAdmin();
  const page = Math.max(1, Math.min(10000, Number((await searchParams).page) || 1));
  const points = await prisma.localTouchpoint.findMany({ where: { campaign: { companyId: company.id, status: { not: "ARCHIVED" } } },
    include: { campaign: { select: { name: true } }, physicalNfcCard: { select: { id: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 26, skip: (Math.floor(page) - 1) * 25 });
  return <div className="space-y-6 text-slate-900 dark:text-slate-100">
    <header className="flex flex-wrap justify-between gap-4"><div><h1 className="text-3xl font-bold">Puntos Inteligentes</h1><p className="mt-2 text-slate-500">Un objetivo y un destino actualizable para cada ubicación de tu local.</p></div>
      <Link className="rounded-lg bg-blue-700 text-white px-5 py-3 self-start" href="/dashboard/local/puntos/nuevo">Crear punto</Link></header>
    {!points.length && <p>Todavía no tienes puntos en campañas disponibles.</p>}
    <div className="grid md:grid-cols-2 gap-4">{points.slice(0, 25).map(point => <article key={point.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
      <h2 className="font-bold text-xl">{point.name}</h2><p>{point.location || "Ubicación por completar"} · {point.campaign.name}</p>
      <p>{objectiveLabels[point.objective]} · {mediumLabels[point.medium]} · {point.isActive ? "Activo" : "Pausado"}</p>
      {point.medium !== "QR" && <p className="text-sm">{point.physicalNfcCard ? "Tarjeta NFC vinculada" : "Tarjeta NFC pendiente de vincular"}</p>}
      <div className="flex flex-wrap gap-4 text-blue-600 dark:text-blue-400">
        <Link className="underline" href={`/dashboard/local/puntos/${point.id}`}>Editar punto</Link>
        <a className="underline" href={`/p/${point.code}`} target="_blank" rel="noopener noreferrer">Abrir destino</a>
        {point.medium !== "NFC" && <a className="underline" href={`/api/local/points/${point.id}/qr`}>Descargar QR</a>}
        {point.medium !== "QR" && <Link className="underline" href={`/dashboard/local/campanas/${point.campaignId}`}>Vincular NFC</Link>}
      </div>
    </article>)}</div>
    <nav className="flex gap-4">{page > 1 && <Link href={`?page=${Math.floor(page) - 1}`}>Anterior</Link>}{points.length > 25 && <Link href={`?page=${Math.floor(page) + 1}`}>Siguiente</Link>}</nav>
    <p className="text-sm text-slate-500">Abrir el destino desde aquí registra un acceso directo. Las reseñas publicadas, seguidores y mensajes enviados dependen de cada plataforma; un acceso no los confirma.</p>
  </div>;
}
