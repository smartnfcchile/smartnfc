import { requireCompanyAdmin } from "../../../lib/permissions";
import { hasCapability } from "../../../lib/entitlements";
import Link from "next/link";
import { requireLocalAdmin } from "../../../lib/local/access";
import { localAnalytics } from "../../../lib/local/analytics";
import { resolveAnalyticsPeriod } from "../../../lib/local/analytics-period";
import LocalAnalyticsView from "../../../components/local/analytics/LocalAnalyticsView";
export const dynamic="force-dynamic";

export default async function LocalDashboardPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const actor = await requireCompanyAdmin();
  if (!(await hasCapability(actor.companyId, "LOCAL_ACCESS"))) return <div className="space-y-3"><h1 className="text-2xl font-black">SmartNFC Local</h1><p>Local no disponible. Los datos se conservan.</p><Link className="text-blue-600 underline" href="/dashboard">Volver al inicio</Link></div>;
  const {company}=await requireLocalAdmin();
  const canReports = await hasCapability(company.id, "LOCAL_REPORTS");
  const period = resolveAnalyticsPeriod(await searchParams);
  const data = canReports ? await localAnalytics(company.id, period, period.compare) : null;
  const nav = <nav aria-label="Secciones de SmartNFC Local" className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
    <Link className="text-blue-600 underline dark:text-blue-400" href="/dashboard/local/locales">Mis locales</Link>
    <Link className="text-blue-600 underline dark:text-blue-400" href="/dashboard/local/puntos">Puntos Inteligentes</Link>
    <Link className="text-blue-600 underline dark:text-blue-400" href="/dashboard/local/campanas">Campañas</Link>
    <Link className="text-blue-600 underline dark:text-blue-400" href="/dashboard/local/suscriptores">Suscriptores</Link>
    <Link className="text-blue-600 underline dark:text-blue-400" href="/dashboard/local/reportes">Reportes automáticos</Link>
  </nav>;
  if (!data) return <div className="space-y-6">
    <header className="space-y-3"><h1 className="text-2xl font-black">SmartNFC Local</h1>{nav}</header>
    <p className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">Las métricas del local están disponibles con Reportes Local. Tus puntos siguen funcionando y los datos se conservan.</p>
  </div>;

  return <div className="space-y-8">
    <header className="space-y-3"><h1 className="text-2xl font-black">SmartNFC Local</h1>{nav}</header>

    <LocalAnalyticsView data={data} period={period} basePath="/dashboard/local"/>
  </div>;
}
