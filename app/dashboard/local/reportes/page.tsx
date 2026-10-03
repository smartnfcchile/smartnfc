import Link from "next/link";
import { requireLocalPage } from "../../../../lib/local/access";
export const dynamic="force-dynamic";

// Los reportes automáticos por correo todavía no están habilitados para clientes (sin programación ni envío).
// La configuración y el historial se conservan; Superadmin mantiene su vista interna en /superadmin/locales/[id]/reportes.
export default async function Page(){
  await requireLocalPage("LOCAL_REPORTS");
  return <div className="max-w-3xl space-y-6 text-slate-900 dark:text-slate-100">
    <header className="space-y-2">
      <span className="inline-block rounded-full bg-slate-200 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-700 dark:bg-slate-800 dark:text-slate-300">Próximamente</span>
      <h1 className="text-3xl font-black">Reportes automáticos</h1>
      <p className="text-slate-600 dark:text-slate-400">Muy pronto podrás recibir por correo un resumen semanal o mensual de tu local.</p>
    </header>
    <section className="rounded-2xl border border-slate-200 p-6 dark:border-slate-700 space-y-3">
      <h2 className="text-lg font-bold">Mientras tanto</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">Todas las métricas de tus Puntos Inteligentes están disponibles en el panel de SmartNFC Local, con períodos de hoy, esta semana, última semana, este mes o un rango personalizado.</p>
      <Link href="/dashboard/local" className="inline-block rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600">Ver métricas del local</Link>
    </section>
  </div>;
}
