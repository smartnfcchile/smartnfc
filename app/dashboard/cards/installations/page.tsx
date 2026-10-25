import Link from "next/link";
import { requireCompanyAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
export default async function InstallationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const actor = await requireCompanyAdmin();
  const raw = Number((await searchParams).page);
  const page = Number.isInteger(raw) && raw > 0 && raw <= 10000 ? raw : 1;
  const cards = await prisma.physicalNfcCard.findMany({ where: { companyId: actor.companyId, localTouchpointId: null },
    select: { id: true, token: true, installation: { select: { id: true } }, card: { select: { name: true } } },
    orderBy: { id: "asc" }, take: 26, skip: (page - 1) * 25 });
  return <div className="space-y-5"><h1 className="text-3xl font-bold">Instalaciones NFC</h1>
    <p>Ubicación fija de los soportes de Personas y Empresas. Configúrala solo cuando el soporte tenga una instalación permanente.</p>
    <p>Los soportes vinculados a Locales comparten la ubicación del Punto Inteligente y se administran desde su editor.</p>
    {!cards.length && <p>No hay soportes disponibles en esta cuenta.</p>}
    <ul className="space-y-3">{cards.slice(0,25).map(card => <li key={card.id} className="rounded-xl border p-4"><p className="font-bold">{card.card?.name || card.token}</p>
      <p>{card.installation ? "Ubicación configurada (privada)" : "Sin ubicación configurada"}</p>
      <Link className="text-blue-600 underline" href={`/dashboard/cards/installations/${card.id}`}>Administrar ubicación</Link></li>)}</ul>
    <nav className="flex gap-4">{page > 1 && <Link href={`?page=${page-1}`}>Anterior</Link>}{cards.length > 25 && <Link href={`?page=${page+1}`}>Siguiente</Link>}</nav>
  </div>;
}
