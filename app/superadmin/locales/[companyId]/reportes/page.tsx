import ReportCenter from "../../../../../components/local/ReportCenter";
import { requireSuperAdmin } from "../../../../../lib/permissions";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{companyId:string}>}) {
  await requireSuperAdmin();
  return <ReportCenter companyId={(await params).companyId} superadmin/>;
}
