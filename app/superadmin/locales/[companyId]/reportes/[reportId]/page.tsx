import { notFound } from "next/navigation";
import { requireSuperAdmin } from "../../../../../../lib/permissions";
import { requireLocalAdmin } from "../../../../../../lib/local/access";
import { prisma } from "../../../../../../lib/prisma";
import type { ReportSnapshot } from "../../../../../../lib/local/report-data";
import ReportSummary from "../../../../../../components/local/ReportSummary";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{companyId:string;reportId:string}>}) {
  await requireSuperAdmin();
  const {companyId,reportId}=await params;
  await requireLocalAdmin(companyId,true);
  const report=await prisma.localReport.findFirst({where:{id:reportId,companyId,status:"READY"}});
  if (!report?.snapshot) notFound();
  return <ReportSummary report={report.snapshot as unknown as ReportSnapshot}/>;
}
