import Link from "next/link";
import { prisma } from "../../lib/prisma";
import { requireLocalAdmin } from "../../lib/local/access";
import { deliveryMode } from "../../lib/local/report-transport";
import { periodLabel } from "../../lib/local/report-period";
import ReportSettingsForm from "./ReportSettingsForm";
export const reportStatus:Record<string,string>={PENDING:"Pendiente",READY:"Generado",FAILED:"Requiere atención",SENT:"Aceptado por correo",
  PREVIEW:"Vista de prueba",UNKNOWN:"Requiere conciliación",CANCELLED:"Cancelado"};
export default async function ReportCenter({companyId,superadmin=false}:{companyId?:string;superadmin?:boolean}) {
  const {actor,company}=await requireLocalAdmin(companyId,superadmin);
  if (superadmin && actor.role!=="SUPERADMIN") throw new Error("No autorizado.");
  const [setting,reports,users]=await Promise.all([
    prisma.localReportSetting.findUnique({where:{companyId:company.id}}),
    prisma.localReport.findMany({where:{companyId:company.id},orderBy:{periodStart:"desc"},take:52,
      include:{deliveries:{select:{id:true,recipient:true,status:true,kind:true,attempts:true,lastError:true}}}}),
    prisma.user.findMany({where:{companyId:company.id,isActive:true,status:"ACTIVE",role:{in:["COMPANY_ADMIN","COMPANY_OWNER"]}},
      select:{id:true,name:true,email:true}})
  ]);
  const base=superadmin?"/superadmin/locales/"+company.id+"/reportes":"/dashboard/local/reportes";
  return <div className="space-y-6 text-slate-900 dark:text-slate-100">
    <div><h1 className="text-3xl font-black">Reportes · {company.name}</h1><p className="mt-2 text-slate-500">Resultados del local y estado de las entregas automáticas.</p></div>
    {deliveryMode()!=="live" && <p className="rounded-xl bg-blue-50 text-blue-900 p-4">Preparación y pruebas: los envíos reales todavía no están activados.</p>}
    <ReportSettingsForm companyId={company.id} enabled={setting?.enabled || false} frequency={setting?.frequency || "MONTHLY"} recipientIds={setting?.recipientIds || []} users={users}/>
    <section className="rounded-2xl border p-6 space-y-4"><h2 className="text-xl font-bold">Historial · últimos 52 informes</h2>
      {!reports.length && <p>El primer informe aparecerá después de cerrar el periodo configurado.</p>}
      {reports.map(report=><article key={report.id} className="border-b pb-4 space-y-2">
        <div className="flex flex-wrap justify-between gap-3"><p className="font-semibold">{periodLabel(report.periodStart,report.periodEnd)}</p><span>{reportStatus[report.status] || report.status}</span></div>
        {report.status==="READY" && <Link className="text-blue-600 underline" href={base+"/"+report.id}>Ver informe completo</Link>}
        {report.lastError && <p className="text-amber-700">{report.lastError}</p>}
        <ul className="text-sm text-slate-500">{report.deliveries.filter(d=>superadmin || d.kind==="REPORT").map(d=><li key={d.id}>{d.kind==="ALERT"?"Soporte":d.recipient}: {reportStatus[d.status] || d.status}{superadmin && d.lastError?" · "+d.lastError:""}</li>)}</ul>
      </article>)}
    </section>
  </div>;
}
