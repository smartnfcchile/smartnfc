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

import { hasActiveProduct } from "../../../../../lib/product-access";

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

  const hasLocal = await hasActiveProduct(user.companyId, "LOCAL");
  if (!hasLocal) {
    redirect("/dashboard/local");
  }

  const { campaignId } = await params;

  // Consultar campaña local garantizando aislamiento de empresa con sus touchpoints
  const campaign = await prisma.localCampaign.findFirst({
    where: {
      id: campaignId,
      companyId: user.companyId
    },
    include: {
      touchpoints: {
        include: {
          physicalNfcCard: true
        }
      }
    }
  });

  if (!campaign) {
    notFound();
  }

  // Consultar tarjetas NFC físicas disponibles para la empresa
  const availableNfcCards = await prisma.physicalNfcCard.findMany({
    where: {
      companyId: user.companyId,
      cardId: null,
      localTouchpointId: null
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <CampanaEditorClient
        campaign={campaign as any}
        initialTouchpoints={campaign.touchpoints as any}
        initialAvailableCards={availableNfcCards as any}
      />
    </div>
  );
}
