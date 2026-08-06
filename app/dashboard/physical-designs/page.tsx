import Link from "next/link";
import { prisma } from "../../../lib/prisma";
import { ensurePhysicalTemplates } from "../../../lib/physical-card/catalog";
import { isCompanyAdmin, requirePhysicalDesignUser } from "../../../lib/physical-card/auth";
import PhysicalDesignsClient from "./PhysicalDesignsClient";

export default async function PhysicalDesignsPage({ searchParams }: { searchParams: Promise<{ cardId?: string }> }) {
  const user = await requirePhysicalDesignUser();
  await ensurePhysicalTemplates();
  const { cardId } = await searchParams;
  const ownScope = isCompanyAdmin(user.role) ? {} : { userId: user.id };
  const [cards, templates, designs] = await Promise.all([
    prisma.card.findMany({ where: { companyId: user.companyId, ...ownScope }, select: { id: true, name: true, slug: true, profileName: true }, orderBy: { name: "asc" } }),
    prisma.cardDesignTemplate.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.physicalCardDesign.findMany({ where: { companyId: user.companyId, status: { not: "ARCHIVED" }, ...(isCompanyAdmin(user.role) ? {} : { card: { userId: user.id } }) }, include: { card: { select: { name: true, slug: true } }, template: { select: { name: true } }, _count: { select: { orders: true } } }, orderBy: { updatedAt: "desc" } }),
  ]);
  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[.22em] text-blue-400">Producción SmartNFC</p><h1 className="mt-1 text-3xl font-bold text-white">Diseños físicos</h1><p className="mt-1 text-sm text-slate-400">Diseña anverso y reverso con parámetros seguros para impresión CR80.</p></div>
      <Link href="/dashboard/physical-designs/orders" className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:border-blue-500">Historial de pedidos</Link>
    </header>
    <PhysicalDesignsClient cards={cards} templates={templates.map(t => ({ ...t, frontSchema: t.frontSchema as object, backSchema: t.backSchema as object, editableFields: t.editableFields as object }))} designs={designs.map(d => ({ id: d.id, name: d.name, status: d.status, updatedAt: d.updatedAt.toISOString(), version: d.version, card: d.card, template: d.template, orderCount: d._count.orders }))} initialCardId={cardId} />
  </div>;
}
