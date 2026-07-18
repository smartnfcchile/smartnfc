import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import Link from "next/link";

export default async function LocalDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const user = session.user as { id: string; role: string; companyId: string };
  const isAdmin = user.role === "SUPERADMIN" || user.role === "COMPANY_OWNER" || user.role === "COMPANY_ADMIN";

  if (!isAdmin) {
    redirect("/dashboard");
  }

  // Obtener campañas locales de la empresa
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Smart NFC Local</h1>
          <p className="text-slate-400 text-sm mt-1">
            Convierte cada visita en una próxima compra
          </p>
        </div>
        <Link
          href="/dashboard/local/campanas/nueva"
          className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition active:scale-95 shadow-md shadow-blue-600/10 hover:shadow-blue-600/20"
        >
          ➕ Crear Campaña
        </Link>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-base font-extrabold text-white">Tus Campañas Activas</h3>
          <Link
            href="/dashboard/local/campanas"
            className="text-xs text-blue-400 hover:text-blue-300 font-bold"
          >
            Ver todas →
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="text-4xl">🏪</div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">No tienes campañas locales creadas</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Crea tu primera campaña para captar clientes presenciales y construir tu club de fidelización.
              </p>
            </div>
            <Link
              href="/dashboard/local/campanas/nueva"
              className="inline-block bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold py-2 px-4 rounded-xl transition"
            >
              Comenzar ahora
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.slice(0, 6).map((c) => {
              let statusLabel = "Borrador";
              let statusClass = "bg-slate-500/10 border-slate-500/30 text-slate-400";
              if (c.status === "PUBLISHED") {
                statusLabel = "Publicada";
                statusClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
              } else if (c.status === "PAUSED") {
                statusLabel = "Pausada";
                statusClass = "bg-amber-500/10 border-amber-500/30 text-amber-400";
              } else if (c.status === "ARCHIVED") {
                statusLabel = "Archivada";
                statusClass = "bg-rose-500/10 border-rose-500/30 text-rose-400";
              }

              return (
                <div key={c.id} className="bg-slate-950/40 border border-slate-850 p-5 rounded-2xl hover:border-slate-800 transition flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[9px] font-bold ${statusClass}`}>
                        {statusLabel}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(c.updatedAt).toLocaleDateString("es-CL")}
                      </span>
                    </div>
                    <h4 className="text-base font-extrabold text-white line-clamp-1">{c.name}</h4>
                    <p className="text-xs text-slate-400 font-mono">/club/{c.slug}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-900 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Plantilla: {c.template}
                    </span>
                    <Link
                      href={`/dashboard/local/campanas/${c.id}`}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300"
                    >
                      Editar →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
