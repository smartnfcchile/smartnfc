import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { redirect } from "next/navigation";
import { hasActiveProduct, canCreateLocalCampaign } from "../../../../../lib/product-access";
import Link from "next/link";
import NuevaCampanaForm from "./NuevaCampanaForm";

export default async function NuevaCampanaPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const user = session.user as { id: string; role: string; companyId: string };
  const isAdmin = user.role === "SUPERADMIN" || user.role === "COMPANY_OWNER" || user.role === "COMPANY_ADMIN";

  if (!isAdmin) {
    redirect("/dashboard");
  }

  // 1. Verificar licencia activa de Smart NFC Local
  const hasLocal = await hasActiveProduct(user.companyId, "LOCAL");
  if (!hasLocal) {
    redirect("/dashboard/local");
  }

  // 2. Verificar límite de campañas del plan (Requisito R-9)
  const canCreate = await canCreateLocalCampaign(user.companyId);
  if (!canCreate) {
    return (
      <div className="max-w-xl mx-auto space-y-6 mt-12">
        <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-2xl text-center space-y-4 shadow-xl">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-black text-white">Límite de Campañas Alcanzado</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Tu empresa ha alcanzado el límite máximo de campañas locales permitidas por tu plan contratado.
          </p>
          <p className="text-slate-450 text-xs">
            Para habilitar campañas adicionales, por favor ponte en contacto con nuestro equipo comercial o soporte técnico para mejorar tu plan.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/dashboard/local"
              className="inline-block bg-slate-800 hover:bg-slate-750 text-white font-extrabold py-2.5 px-6 rounded-xl text-xs transition active:scale-95 border border-slate-750"
            >
              Volver al Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <NuevaCampanaForm />;
}
