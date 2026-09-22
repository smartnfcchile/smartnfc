import { notFound } from "next/navigation";
import { requireLocalPage } from "../../../../../lib/local/access";
import { prisma } from "../../../../../lib/prisma";
import type { ReportSnapshot } from "../../../../../lib/local/report-data";
import ReportSummary from "../../../../../components/local/ReportSummary";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{reportId:string}>}) {
  const {company}=await requireLocalPage("LOCAL_REPORTS");
  const {reportId}=await params;

  const report=await prisma.localReport.findFirst({where:{id:reportId,companyId:company.id,status:"READY"}});
  if (!report?.snapshot) notFound();
  return <ReportSummary report={report.snapshot as unknown as ReportSnapshot}/>;
}
