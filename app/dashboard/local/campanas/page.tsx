import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../../../lib/prisma";
import CampanasClient from "./CampanasClient";

import { hasActiveProduct } from "../../../../lib/product-access";

export default async function LocalCampaignsPage() {
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

  // Obtener todas las campañas locales de la empresa
  const campaigns = await prisma.localCampaign.findMany({
    where: {
      companyId: user.companyId
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Campañas Smart NFC Local</h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          Crea, edita y publica los clubes de fidelización presenciales de tus locales.
        </p>
      </div>

      <CampanasClient initialCampaigns={campaigns} />
    </div>
  );
}
