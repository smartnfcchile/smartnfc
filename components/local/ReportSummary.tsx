import type { ReportSnapshot } from "../../lib/local/report-data";
import { periodLabel } from "../../lib/local/report-period";
export default function ReportSummary({report}:{report:ReportSnapshot}) {
  const m=report.current;
  const cards=[["Accesos",m.visits],["NFC",m.nfc],["QR",m.qr],["Directos",m.direct],
    ["Nuevos registros",m.newSubscribers],["Visitas con registro",m.conversions],
    ["Conversión del Club",m.conversionRate.toFixed(1)+"%"],["Clics WhatsApp",m.whatsapp]];
  return <section className="space-y-6">
    <div><h1 className="text-3xl font-black">{report.companyName}</h1><p className="mt-2 text-slate-500">{periodLabel(report.periodStart,report.periodEnd)}</p></div>
    {report.partial && <p className="rounded-xl bg-amber-50 text-amber-900 p-4">Periodo con cobertura parcial. La medición corregida comenzó el {new Date(report.measurementSince).toLocaleDateString("es-CL",{timeZone:"America/Santiago"})}.</p>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{cards.map(([label,value])=><div key={label} className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 bg-white dark:bg-slate-900">
      <p className="text-sm text-slate-500">{label}</p><p className="text-3xl font-bold mt-2">{value}</p></div>)}</div>
    {report.measurementIssues>0 && <p className="rounded-xl bg-amber-50 text-amber-900 p-4">Se detectaron incidencias de medición. Las cifras pueden estar incompletas.</p>}
    {!m.visits && !report.measurementIssues && <p>No se registró actividad durante este periodo.</p>}
    <p>{report.comparisonAvailable
      ? "Periodo anterior: "+report.previous.visits+" accesos y "+report.previous.newSubscribers+" nuevos registros."
      : "La comparación estará disponible cuando ambos periodos tengan cobertura completa."}</p>
    {!!m.objectives?.length && <section><h2 className="text-xl font-bold">Accesos por objetivo</h2><ul className="mt-3 space-y-2">{m.objectives.map(item=><li key={item.objective}>{item.label}: {item.visits}</li>)}</ul><p className="mt-3">Salidas a destinos: {m.destinationRedirects || 0}. No confirman reseñas, seguidores ni compras.</p></section>}
    <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b"><th className="p-3">Punto</th><th>Accesos</th><th>Visitas con registro</th><th>Clics WhatsApp</th></tr></thead>
      <tbody>{m.points.map(p=><tr key={p.id} className="border-b border-slate-200 dark:border-slate-700"><td className="p-3">{p.name}</td><td>{p.visits}</td><td>{p.conversions}</td><td>{p.whatsapp}</td></tr>)}</tbody></table></div>
    <p className="text-sm text-slate-500">Un acceso es una visita, no una persona única. Conversión del Club: visitas del Club con registro ÷ accesos al Club del mismo periodo. Los clics no confirman mensajes enviados. Cero actividad registrada no acredita ausencia de visitantes. Estos informes usan la medición corregida; el historial anterior se conserva.</p>
  </section>;
}
