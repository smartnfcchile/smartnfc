import Link from "next/link";
import { requireLocalAdmin } from "../../../lib/local/access";
import { prisma } from "../../../lib/prisma";
import { generateReportSnapshot } from "../../../lib/local/report-data";
import { periodStart, previousPeriod } from "../../../lib/local/report-period";
import ReportSummary from "../../../components/local/ReportSummary";
export const dynamic="force-dynamic";
export default async function LocalDashboardPage() {
  const {company}=await requireLocalAdmin();
  const setting=await prisma.localReportSetting.findUnique({where:{companyId:company.id}});
  const end=periodStart(new Date(),"WEEKLY"),start=previousPeriod(end,"WEEKLY");
  return <div className="space-y-6">
    <header className="flex flex-wrap justify-between gap-3"><h1 className="text-2xl font-black">SmartNFC Local</h1>
      <div className="flex flex-wrap gap-4">
        <Link className="text-blue-600 underline" href="/dashboard/local/campanas">Campañas y puntos</Link>
        <Link className="text-blue-600 underline" href="/dashboard/local/suscriptores">Suscriptores</Link>
        <Link className="text-blue-600 underline" href="/dashboard/local/reportes">Reportes automáticos</Link>
      </div></header>
    <p className="text-slate-500">Resultados de la última semana completa, de lunes a domingo en Chile.</p>
    {setting?<ReportSummary report={await generateReportSnapshot(company.id,start,end,"WEEKLY")}/>:
      <p>Configura los reportes del local para comenzar. Los datos históricos de campañas se conservan.</p>}
  </div>;
}
