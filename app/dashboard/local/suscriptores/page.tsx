import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../../../lib/prisma";
import Link from "next/link";

function maskWhatsApp(phone: string) {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d]/g, "");
  if (cleaned.length < 6) return "****";
  // Mostrar código de país y los últimos 4 dígitos enmascarados (Requisito Parte H)
  return `+${cleaned.substring(0, cleaned.length - 4)} ****`;
}

export default async function SubscribersPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const user = session.user as { id: string; role: string; companyId: string };
  const isAdmin = user.role === "SUPERADMIN" || user.role === "COMPANY_OWNER" || user.role === "COMPANY_ADMIN";

  if (!isAdmin) {
    redirect("/dashboard");
  }

  // 1. Obtener campañas locales de la empresa
  const campaigns = await prisma.localCampaign.findMany({
    where: { companyId: user.companyId }
  });
  const campaignIds = campaigns.map(c => c.id);

  // 2. Obtener suscriptores filtrados (Requisito Parte H)
  const subscribers = await prisma.localSubscriber.findMany({
    where: {
      campaignId: { in: campaignIds }
    },
    include: {
      campaign: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return (
    <div className="space-y-6">
      
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <Link href="/dashboard/local" className="text-[10px] font-bold text-slate-500 hover:text-slate-350 uppercase tracking-widest block">
            ← Volver a Smart Local
          </Link>
          <h1 className="text-3xl font-black text-white tracking-tight">Suscriptores del Club</h1>
          <p className="text-slate-400 text-sm font-medium">
            Listado completo de clientes registrados en tus campañas
          </p>
        </div>
      </div>

      {/* Listado / Tabla */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">WhatsApp</th>
                <th className="py-3.5 px-4">Campaña</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4">Fecha Inscripción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-200">
              {subscribers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                    Aún no tienes ningún suscriptor registrado en tu club.
                  </td>
                </tr>
              ) : (
                subscribers.map((sub) => {
                  let statusBadge = "Activo";
                  let statusClass = "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20";
                  
                  if (sub.status === "BLOCKED") {
                    statusBadge = "Bloqueado";
                    statusClass = "bg-rose-500/10 text-rose-450 border border-rose-500/20";
                  } else if (sub.status === "OPTED_OUT") {
                    statusBadge = "Cancelado";
                    statusClass = "bg-amber-500/10 text-amber-450 border border-amber-500/20";
                  }

                  return (
                    <tr key={sub.id} className="hover:bg-slate-950/20 transition">
                      <td className="py-3.5 px-4 font-bold text-white">{sub.name}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {maskWhatsApp(sub.whatsapp)}
                      </td>
                      <td className="py-3.5 px-4">{sub.campaign.name}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${statusClass}`}>
                          {statusBadge}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-450">
                        {new Date(sub.createdAt).toLocaleDateString("es-CL", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
