// Soporte SuperAdmin a un cliente SmartNFC Local — SOLO LECTURA (Bloque G, fase A).
// Sin suplantación, sin edición cross-tenant y sin acciones administrativas sobre datos del cliente.
// No enlaza a /p, /q ni /t del cliente: abrirlos registraría visitas en su analítica.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "../../../../lib/permissions";
import { loadLocalSupport, recordSupportView } from "../../../../lib/local/support";
import { localAnalytics } from "../../../../lib/local/analytics";
import { resolveAnalyticsPeriod } from "../../../../lib/local/analytics-period";
import { objectiveLabels, mediumLabels } from "../../../../lib/local/point-config";
import LocalAnalyticsView from "../../../../components/local/analytics/LocalAnalyticsView";

export const dynamic = "force-dynamic";

const licenseStatus: Record<string, string> = { PENDING: "Pendiente", ACTIVE: "Activa", SUSPENDED: "Suspendida", EXPIRED: "Vencida", CANCELLED: "Cancelada" };
const campaignStatus: Record<string, string> = { DRAFT: "Borrador", PUBLISHED: "Publicada", ARCHIVED: "Archivada" };
const date = (d: Date | null | undefined) => (d ? new Date(d).toLocaleDateString("es-CL", { timeZone: "America/Santiago" }) : "—");
const card = "rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-slate-900/60";

export default async function LocalSupportPage({ params, searchParams }: {
  params: Promise<{ companyId: string }>; searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const actor = await requireSuperAdmin();
  const { companyId } = await params;
  const support = await loadLocalSupport(companyId);
  if (!support) notFound();
  await recordSupportView(actor.id, support.company.id);
  const period = resolveAnalyticsPeriod(await searchParams);
  const analytics = await localAnalytics(support.company.id, period, period.compare);
  const { company, license, entitlements } = support;
  const localCaps = entitlements.capabilities.filter(c => c.startsWith("LOCAL_"));

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">Soporte SmartNFC Local</span>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{company.name}</h1>
        <p className="mt-1 font-mono text-[11px] text-slate-400">/{company.slug}</p>
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        <Link href="/superadmin/locales" className="rounded-lg border border-slate-200 px-3 py-2 font-bold dark:border-slate-700">Volver a locales</Link>
        <Link href={`/superadmin/empresas/${company.id}`} className="rounded-lg border border-slate-200 px-3 py-2 font-bold dark:border-slate-700">Ficha de empresa</Link>
        <Link href={`/superadmin/locales/${company.id}/reportes`} className="rounded-lg border border-slate-200 px-3 py-2 font-bold dark:border-slate-700">Reportes</Link>
      </div>
    </div>
    <p role="note" className="rounded-xl border border-amber-500/30 bg-amber-50 p-3 text-xs font-semibold text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
      Vista de solo lectura. No permite editar ni actuar como el cliente. Este acceso queda registrado en la auditoría.
    </p>

    <section aria-labelledby="lic" className={`${card} grid gap-4 md:grid-cols-3`}>
      <div><h2 id="lic" className="text-sm font-black text-slate-900 dark:text-white">Licencia Local</h2>
        {license ? <dl className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
          <div><dt className="inline font-semibold">Estado: </dt><dd className="inline">{licenseStatus[license.status] ?? license.status}</dd></div>
          <div><dt className="inline font-semibold">Plan: </dt><dd className="inline">{license.planCode}</dd></div>
          <div><dt className="inline font-semibold">Vigencia: </dt><dd className="inline">{date(license.startsAt)} → {date(license.expiresAt)}</dd></div>
          <div><dt className="inline font-semibold">Renovación: </dt><dd className="inline">{date(license.renewsAt)}</dd></div>
        </dl> : <p className="mt-2 text-xs text-slate-500">Sin licencia Local registrada.</p>}
      </div>
      <div><h2 className="text-sm font-black text-slate-900 dark:text-white">Operación</h2>
        <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
          <li>Empresa {company.isActive ? "activa" : "inactiva"}</li>
          <li>Local {entitlements.localOperational ? "operativo" : "no operativo (puntos en estado neutral)"}</li>
          <li>Límite de locales: {entitlements.limits.MAX_LOCATIONS ?? "sin límite"}</li>
          <li>Campañas: {support.campaigns.map(c => `${campaignStatus[c.status] ?? c.status} ${c.count}`).join(" · ") || "ninguna"}</li>
        </ul>
      </div>
      <div><h2 className="text-sm font-black text-slate-900 dark:text-white">Capacidades Local</h2>
        <ul className="mt-2 flex flex-wrap gap-1.5">{localCaps.length ? localCaps.map(c =>
          <li key={c} className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">{c}</li>)
          : <li className="text-xs text-slate-500">Sin capacidades Local vigentes.</li>}</ul>
      </div>
    </section>

    <section aria-labelledby="locs" className="space-y-3">
      <h2 id="locs" className="text-lg font-black text-slate-900 dark:text-white">Locales e identidad</h2>
      {!support.locations.length && <p className="text-sm text-slate-500">Sin locales registrados.</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{support.locations.map(l => <article key={l.id} className={card}>
        <div className="flex items-center gap-3">
          {l.brand.logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={l.brand.logoUrl} alt="" className="h-11 w-11 rounded-xl bg-white object-contain ring-1 ring-slate-200"/>
            : <span className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold" style={{ backgroundColor: l.brand.primaryColor, color: l.brand.onPrimary }}>{l.brand.initials}</span>}
          <div className="min-w-0">
            <p className="truncate font-bold text-slate-900 dark:text-white">{l.brand.displayName}</p>
            <p className="truncate text-[11px] text-slate-500">Nombre interno: {l.internalName || "sin definir"}{l.origin === "LEGACY_TECHNICAL" ? " · técnico" : ""}</p>
          </div>
        </div>
        <dl className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
          <div><dt className="inline font-semibold">Estado: </dt><dd className="inline">{l.isActive ? "activo" : "inactivo"} · identidad {l.hasIdentity ? "configurada" : "pendiente"}</dd></div>
          <div className="flex items-center gap-1.5"><dt className="font-semibold">Colores:</dt><dd className="flex items-center gap-1">
            <span aria-hidden className="h-3 w-3 rounded-full ring-1 ring-slate-300" style={{ backgroundColor: l.brand.primaryColor }}/>{l.brand.primaryColor}
            <span aria-hidden className="ml-1 h-3 w-3 rounded-full ring-1 ring-slate-300" style={{ backgroundColor: l.brand.secondaryColor }}/>{l.brand.secondaryColor}</dd></div>
          <div><dt className="inline font-semibold">Contacto: </dt><dd className="inline">{[l.brand.phone, l.brand.websiteUrl && "web", l.brand.mapsUrl && "mapa"].filter(Boolean).join(" · ") || "—"}</dd></div>
          <div><dt className="inline font-semibold">Identidad actualizada: </dt><dd className="inline">{date(l.brandUpdatedAt)}</dd></div>
        </dl>
      </article>)}</div>
    </section>

    <section aria-labelledby="pts" className="space-y-3">
      <h2 id="pts" className="text-lg font-black text-slate-900 dark:text-white">Puntos Inteligentes ({support.points.length})</h2>
      <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-white/5 dark:bg-slate-900/60"><div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-xs">
          <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-900/50"><tr>
            <th className="px-4 py-3">Punto</th><th className="px-4 py-3">Objetivo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Código</th><th className="px-4 py-3">NFC física</th><th className="px-4 py-3">Configuración</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">{support.points.length === 0
            ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Sin puntos.</td></tr>
            : support.points.map(p => <tr key={p.id} className="align-top text-slate-700 dark:text-slate-300">
              <td className="px-4 py-3"><span className="block font-bold">{p.name}</span><span className="block text-[11px] text-slate-500">{[p.localName, p.location].filter(Boolean).join(" · ")}</span><span className="block text-[11px] text-slate-400">Campaña: {p.campaign.name} ({campaignStatus[p.campaign.status] ?? p.campaign.status})</span></td>
              <td className="px-4 py-3"><span className="block">{objectiveLabels[p.objective as keyof typeof objectiveLabels] ?? p.objective}</span><span className="block text-[11px] text-slate-500">{p.presentation}</span>{p.destinationHost && <span className="block text-[11px] text-slate-400">Destino: {p.destinationHost}</span>}</td>
              <td className="px-4 py-3">{p.isActive && p.localActive ? "Activo" : p.isActive ? "Local inactivo" : "Pausado"}<span className="block text-[11px] text-slate-500">{mediumLabels[p.medium as keyof typeof mediumLabels] ?? p.medium}</span></td>
              <td className="px-4 py-3 font-mono text-[11px]">{p.code}</td>
              <td className="px-4 py-3">{p.nfc ? <><span className="block">{p.nfc.status}</span><span className="block font-mono text-[11px] text-slate-500">token {p.nfc.tokenHint}</span></> : <span className="text-slate-400">{p.medium === "QR" ? "No aplica (solo QR)" : "Sin vincular"}</span>}</td>
              <td className="px-4 py-3 text-[11px] text-slate-500"><span className="block">Versión {p.configurationVersion}</span><span className="block">{p.actions} acciones guardadas</span><span className="block">Actualizado {date(p.updatedAt)}</span></td>
            </tr>)}</tbody>
        </table>
      </div></div>
    </section>

    <section aria-labelledby="ana" className="space-y-3">
      <h2 id="ana" className="text-lg font-black text-slate-900 dark:text-white">Analítica del cliente</h2>
      <LocalAnalyticsView data={analytics} period={period} basePath={`/superadmin/locales/${company.id}`}/>
    </section>
  </div>;
}
