import { forecastForCenter } from "../../../lib/soluciones/met-uv-server";
import type { MetUvSeries } from "../../../lib/soluciones/met-uv";
import CampaignLandingContent from "../../../components/soluciones/CampaignLandingContent";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { resolvePublicSolutionTag } from "../../../lib/soluciones/public-record";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Ficha inteligente | SmartNFC",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true }
};

export default async function PublicSolutionPage({ params }: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params;
  const record = await resolvePublicSolutionTag(token);
  if (!record) notFound();
  if (record.kind === "campaign") redirect(record.destination);
  if (record.kind === "campaignLanding") {
    const forecasts: Record<string, MetUvSeries> = {};
    for (const block of record.blocks) {
      if (block.type !== "uv-forecast" || block.latitude === undefined || block.longitude === undefined) continue;
      const forecast = await forecastForCenter(block.latitude, block.longitude);
      if (forecast) forecasts[block.id] = forecast;
    }
    return <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
    <div className="mx-auto max-w-xl"><CampaignLandingContent design={record.design} blocks={record.blocks} forecasts={forecasts} forecastAt={new Date().toISOString()} /></div>
  </main>;
  }
  return <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8">
    <article className="mx-auto max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <header className="bg-blue-700 text-white p-6 space-y-2">
        <p className="uppercase tracking-widest text-xs text-blue-100">SmartNFC · Ficha inteligente</p>
        <h1 className="text-2xl font-black">{record.template}</h1>
        <p className="text-blue-100">{record.organization} · {record.project}</p>
      </header>
      <dl className="p-6 divide-y divide-slate-100 dark:divide-slate-800">
        <div className="py-3"><dt className="text-xs text-slate-500">Código de registro</dt><dd className="font-semibold">{record.code}</dd></div>
        {record.fields.map(f => <div key={f.key} className="py-3">
          <dt className="text-xs text-slate-500 dark:text-slate-400">{f.label}</dt>
          <dd className="break-words font-medium text-slate-900 dark:text-white">
            {typeof f.value === "boolean" ? (f.value ? "Sí" : "No") : String(f.value)}
          </dd>
        </div>)}
      </dl>
      <footer className="p-5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
        Esta ficha es informativa y no reemplaza inspecciones, certificaciones ni procedimientos de seguridad.
      </footer>
    </article>
  </main>;
}