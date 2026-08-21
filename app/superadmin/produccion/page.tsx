import { prisma } from "../../../lib/prisma";
import { requireSuperAdmin } from "../../../lib/permissions";
import ProduccionClient from "./ProduccionClient";

export const dynamic = "force-dynamic";

export default async function ProduccionPage() {
  await requireSuperAdmin();
  const cards = await prisma.card.findMany({
    orderBy: [{ company: { name: "asc" } }, { updatedAt: "desc" }],
    select: {
      id: true, name: true, slug: true, profileName: true, isActive: true, updatedAt: true,
      company: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, email: true } },
      physicalCardDesigns: {
        where: { status: { not: "ARCHIVED" } }, orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, status: true, version: true, updatedAt: true, template: { select: { name: true } } },
      },
    },
  });

  return <div className="space-y-6">
    <header>
      <p className="text-xs font-bold uppercase tracking-[.22em] text-blue-700 dark:text-blue-400">Centro de archivos</p>
      <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">Producción de tarjetas</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">QR y artes de impresión de todas las tarjetas, organizados por empresa y usuario. Los SVG son editables y los PDF están listos para revisión de imprenta.</p>
    </header>
    <ProduccionClient cards={cards.map(card => ({ ...card, updatedAt: card.updatedAt.toISOString(), physicalCardDesigns: card.physicalCardDesigns.map(design => ({ ...design, updatedAt: design.updatedAt.toISOString() })) }))} />
    <p className="text-xs text-slate-500">¿No aparece un arte? El usuario aún no ha creado un diseño físico para esa tarjeta. Puedes identificarlo aquí sin pedirle archivos por mensajería.</p>
  </div>;
}
