import Link from "next/link";
import { ChevronRight, MapPin, Palette, Plus } from "lucide-react";
import { prisma } from "../../../../lib/prisma";
import { requireLocalPage } from "../../../../lib/local/access";
import { resolveLocalBrand } from "../../../../lib/local/brand";
import { saveLocationAction, moveCampaignLocationAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const { company } = await requireLocalPage("LOCAL_ACCESS");
  const locations = await prisma.localLocation.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "asc" } });
  const campaigns = await prisma.localCampaign.findMany({ where: { companyId: company.id }, select: { id: true, name: true, locationId: true } });
  const field = "block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
  const label = (l: { name: string | null }, i: number) => l.name || `Local pendiente de identificar ${i + 1}`;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Mis locales</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Cada local tiene su identidad digital: logo, portada, colores y datos de contacto que heredan sus experiencias.</p>
      </header>

      <section aria-label="Locales" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {locations.map((l, i) => {
          const brand = resolveLocalBrand({ location: l, company });
          const hasIdentity = !!(l.displayName || l.logoUrl || l.coverImageUrl || l.primaryColor);
          const card = (
            <>
              <div className="relative h-24 overflow-hidden rounded-t-2xl" style={l.coverImageUrl ? undefined : { background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {l.coverImageUrl && <img src={l.coverImageUrl} alt="" className="h-full w-full object-cover" />}
                {!l.isActive && <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">Inactivo</span>}
              </div>
              <div className="relative px-5 pb-5">
                <div className="-mt-7 h-14 w-14 rounded-2xl bg-white p-1 shadow-md ring-1 ring-slate-900/5">
                  {l.logoUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={l.logoUrl} alt="" className="h-full w-full rounded-xl object-contain" />
                    : <div className="flex h-full w-full items-center justify-center rounded-xl text-lg font-bold" style={{ backgroundColor: brand.primaryColor, color: brand.onPrimary }}>{brand.initials}</div>}
                </div>
                <h2 className="mt-3 truncate text-base font-semibold text-slate-900 dark:text-white">{l.displayName || label(l, i)}</h2>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{l.displayName ? label(l, i) : "Nombre comercial sin definir"}</p>
                {l.address && <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-slate-500 dark:text-slate-400"><MapPin aria-hidden className="h-3.5 w-3.5 shrink-0" />{l.address}</p>}
                {l.origin === "LEGACY_TECHNICAL" && !l.name && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Este registro agrupa campañas existentes. Completa sus datos para identificar el local.</p>}
                {l.isActive && (
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 dark:text-blue-400">
                    <Palette aria-hidden className="h-4 w-4" />{hasIdentity ? "Editar identidad" : "Configurar identidad"}<ChevronRight aria-hidden className="h-4 w-4" />
                  </span>
                )}
              </div>
            </>
          );
          const cls = "block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition dark:border-slate-800 dark:bg-slate-900";
          return l.isActive
            ? <Link key={l.id} href={`/dashboard/local/locales/${l.id}`} className={`${cls} hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500`}>{card}</Link>
            : <div key={l.id} className={`${cls} opacity-70`}>{card}</div>;
        })}
        {!locations.length && <p className="text-sm text-slate-500 dark:text-slate-400">Todavía no tienes locales. Crea el primero para configurar su identidad.</p>}
      </section>

      <form action={saveLocationAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white"><Plus aria-hidden className="h-4 w-4" />Agregar local</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">Nombre<input name="name" className={`${field} mt-2`} required minLength={2} maxLength={120}/></label>
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">Dirección<input name="address" className={`${field} mt-2`} maxLength={240}/></label>
        </div>
        <button className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">Crear local</button>
      </form>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Asignación de campañas</h2>
        {campaigns.map(c => (
          <form key={c.id} action={moveCampaignLocationAction} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end dark:border-slate-800 dark:bg-slate-900">
            <input type="hidden" name="campaignId" value={c.id}/>
            <label className="block flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{c.name}
              <select name="locationId" className={`${field} mt-2`} defaultValue={c.locationId || ""} required>
                <option value="" disabled>Seleccionar local</option>
                {locations.filter(l => l.isActive).map((l, i) => <option key={l.id} value={l.id}>{label(l, i)}</option>)}
              </select>
            </label>
            <button className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Asignar local</button>
          </form>
        ))}
      </section>
    </div>
  );
}
