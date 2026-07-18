import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "../../../../../lib/prisma";
import CampanaEditorClient from "./CampanaEditorClient";

type Params = {
  params: Promise<{
    campaignId: string;
  }>;
};

export default async function EditCampaignPage({ params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const user = session.user as { id: string; role: string; companyId: string };
  const isAdmin = user.role === "SUPERADMIN" || user.role === "COMPANY_OWNER" || user.role === "COMPANY_ADMIN";

  if (!isAdmin) {
    redirect("/dashboard");
  }

  const { campaignId } = await params;

  // Consultar campaña local garantizando aislamiento multiempresa (Requisito 3)
  const campaign = await prisma.localCampaign.findFirst({
    where: {
      id: campaignId,
      companyId: user.companyId
    }
  });

  if (!campaign) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <CampanaEditorClient campaign={campaign} />
    </div>
  );
}
