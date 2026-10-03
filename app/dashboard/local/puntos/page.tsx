import Link from "next/link";
import { prisma } from "../../../../lib/prisma";
import { requireLocalPage } from "../../../../lib/local/access";
import { effectivePresentationLabel, effectivePresentationMode, mediumLabels, objectiveLabels } from "../../../../lib/local/point-config";
import { promotionStatus, readObjectiveConfig } from "../../../../lib/local/objective-config";
import type { LocalPointObjective, LocalPointPresentationMode } from "@prisma/client";

const promotionLabels = { scheduled: "programada", active: "vigente", ended: "terminada" } as const;
export const dynamic = "force-dynamic";
export default async function PointsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { company } = await requireLocalPage("LOCAL_TOUCHPOINTS");

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
      <p>{objectiveLabels[point.objective]}{point.objective === "PROMOTION" && ` (${promotionLabels[promotionStatus(readObjectiveConfig(point.objectiveConfig).promotion)]})`} · {mediumLabels[point.medium]} · {effectivePresentationLabel(point.objective, point.presentationMode)} · {point.isActive ? "Activo" : "Pausado"}</p>
      {point.medium !== "QR" && <p className="text-sm">{point.physicalNfcCard ? "Tarjeta NFC vinculada" : "Tarjeta NFC pendiente: SmartNFC realiza la vinculación antes de la entrega"}</p>}
      <div className="flex flex-wrap gap-4 text-blue-600 dark:text-blue-400">
        <Link className="underline" href={`/dashboard/local/puntos/${point.id}`}>Editar punto</Link>
        <PreviewLink point={point}/>
        {point.medium !== "NFC" && <a className="underline" href={`/api/local/points/${point.id}/qr`}>Descargar QR</a>}
      </div>
    </article>)}</div>
    <nav className="flex gap-4">{page > 1 && <Link href={`?page=${Math.floor(page) - 1}`}>Anterior</Link>}{points.length > 25 && <Link href={`?page=${Math.floor(page) + 1}`}>Siguiente</Link>}</nav>
    <p className="text-sm text-slate-500">La vista previa y la prueba de destino no registran visitas: tus métricas solo cuentan los accesos reales por NFC, QR o enlace. Las reseñas publicadas, seguidores y mensajes enviados dependen de cada plataforma; un acceso no los confirma.</p>
  </div>;
}

type PreviewPoint = { code: string; objective: LocalPointObjective; presentationMode: LocalPointPresentationMode; destinationUrl: string | null; campaignId: string; objectiveConfig: unknown };

// Vista previa para el administrador sin registrar eventos analíticos (decisión D7):
// - Club: el editor de la campaña tiene su propia vista previa móvil.
// - Página del local (o promoción fuera de vigencia): /l/<código> sin visita (?v) no registra visitas, vistas ni clics.
// - Abrir directamente: se abre el destino configurado tal cual, sin pasar por /p (que sí registra un acceso).
function PreviewLink({ point }: { point: PreviewPoint }) {
  if (point.objective === "CLUB") return <Link className="underline" href={`/dashboard/local/campanas/${point.campaignId}`}>Ver Club y su vista previa</Link>;
  const promo = point.objective === "PROMOTION" ? readObjectiveConfig(point.objectiveConfig).promotion : null;
  const showsLanding = effectivePresentationMode(point.objective, point.presentationMode) === "LANDING" || (promo && promotionStatus(promo) !== "active");
  if (showsLanding) return <a className="underline" href={`/l/${point.code}`} target="_blank" rel="noopener noreferrer">Vista previa de la página</a>;
  if (!point.destinationUrl) return <span className="text-slate-500">Destino sin configurar</span>;
  return <a className="underline" href={point.destinationUrl} target="_blank" rel="noopener noreferrer">Probar destino</a>;
}
