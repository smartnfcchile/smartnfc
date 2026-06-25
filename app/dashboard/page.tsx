import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = session.user as any;
  const isAdmin = user.role === "SUPERADMIN" || user.role === "CLIENT_ADMIN";

  // Consultar tarjetas del usuario o de toda la empresa según rol
  const cards = await prisma.card.findMany({
    where: isAdmin ? { companyId: user.companyId } : { userId: user.id },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
    }
  });

  const usersCount = isAdmin
    ? await prisma.user.count({ where: { companyId: user.companyId } })
    : 1;

  const leadsCount = await prisma.lead.count({
    where: isAdmin
      ? { card: { companyId: user.companyId } }
      : { card: { userId: user.id } },
  });

  return (
    <div className="space-y-8">
      {/* Banner de Bienvenida */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/20 to-slate-900/50 border border-slate-800/80 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 space-y-2">
          <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">
            {isAdmin ? "Panel de Administración" : "Panel de Vendedor"}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ¡Hola, {user.name || "Usuario"}! 👋
          </h1>
          <p className="text-slate-400 max-w-2xl text-xs sm:text-sm leading-relaxed">
            {isAdmin
              ? "Bienvenido a la central corporativa de SmartNFC. Desde aquí puedes gestionar las tarjetas virtuales, administrar a tus vendedores, hacer seguimiento de prospectos en el CRM y exportar la analítica global."
              : "Bienvenido a tu portal SmartNFC. Revisa las interacciones que los clientes han tenido con tu perfil, descarga tu código QR dinámico y realiza el seguimiento de tus prospectos."}
          </p>
        </div>
      </div>

      {/* Grid de Resumen Rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tarjetas Virtuales</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-white">{cards.length}</span>
            <span className="text-xs text-slate-400">registradas</span>
          </div>
        </div>
        {isAdmin && (
          <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Vendedores Activos</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-white">{usersCount}</span>
              <span className="text-xs text-slate-400">perfiles</span>
            </div>
          </div>
        )}
        <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Prospectos (CRM)</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-white">{leadsCount}</span>
            <span className="text-xs text-slate-400">leads capturados</span>
          </div>
        </div>
      </div>

      {/* Menú Portal / Accesos Directos */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-300 tracking-wide">Accesos Directos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Tarjeta: Métricas */}
          <Link
            href="/dashboard/metrics"
            className="group bg-slate-900/50 hover:bg-slate-900 border border-slate-900 hover:border-blue-500/30 p-6 rounded-2xl flex gap-5 transition-all shadow-sm hover:shadow-blue-500/5"
          >
            <div className="bg-blue-600/10 border border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white text-blue-400 p-4 rounded-xl text-2xl h-14 w-14 flex items-center justify-center transition-all shrink-0">
              📊
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors text-sm sm:text-base">
                Métricas y Analíticas
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                {isAdmin
                  ? "Revisa las métricas consolidadas de visitas, lecturas NFC, clics a canales y rendimiento de todas las tarjetas."
                  : "Visualiza tus estadísticas individuales de visitas, lecturas NFC y descargas de tu perfil de contacto."}
              </p>
            </div>
          </Link>

          {/* Tarjeta: Leads / CRM */}
          <Link
            href="/dashboard/leads"
            className="group bg-slate-900/50 hover:bg-slate-900 border border-slate-900 hover:border-emerald-500/30 p-6 rounded-2xl flex gap-5 transition-all shadow-sm hover:shadow-emerald-500/5"
          >
            <div className="bg-emerald-600/10 border border-emerald-500/20 group-hover:bg-emerald-600 group-hover:text-white text-emerald-400 p-4 rounded-xl text-2xl h-14 w-14 flex items-center justify-center transition-all shrink-0">
              💰
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors text-sm sm:text-base">
                Prospectos (CRM)
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                {isAdmin
                  ? "Administra los leads de la empresa, cambia estados de contacto y añade notas de seguimiento a tus clientes potenciales."
                  : "Visualiza la lista de prospectos que han dejado sus datos en tu tarjeta virtual para darles seguimiento comercial."}
              </p>
            </div>
          </Link>

          {isAdmin ? (
            <>
              {/* Tarjeta: Gestionar Vendedores (Sólo Admin) */}
              <Link
                href="/dashboard/users"
                className="group bg-slate-900/50 hover:bg-slate-900 border border-slate-900 hover:border-purple-500/30 p-6 rounded-2xl flex gap-5 transition-all shadow-sm hover:shadow-purple-500/5"
              >
                <div className="bg-purple-600/10 border border-purple-500/20 group-hover:bg-purple-600 group-hover:text-white text-purple-400 p-4 rounded-xl text-2xl h-14 w-14 flex items-center justify-center transition-all shrink-0">
                  👥
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-white group-hover:text-purple-400 transition-colors text-sm sm:text-base">
                    Gestionar Vendedores
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Crea perfiles para tus vendedores, genera contraseñas seguras y elimina o gestiona sus credenciales de acceso de forma exclusiva.
                  </p>
                </div>
              </Link>

              {/* Tarjeta: Gestionar Tarjetas (Sólo Admin) */}
              <Link
                href="/dashboard/cards"
                className="group bg-slate-900/50 hover:bg-slate-900 border border-slate-900 hover:border-orange-500/30 p-6 rounded-2xl flex gap-5 transition-all shadow-sm hover:shadow-orange-500/5"
              >
                <div className="bg-orange-600/10 border border-orange-500/20 group-hover:bg-orange-600 group-hover:text-white text-orange-400 p-4 rounded-xl text-2xl h-14 w-14 flex items-center justify-center transition-all shrink-0">
                  🎴
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-white group-hover:text-orange-400 transition-colors text-sm sm:text-base">
                    Tarjetas Virtuales
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Configura y edita los perfiles de marca de las tarjetas, crea nuevas tarjetas de presentación e inhabilita perfiles temporales.
                  </p>
                </div>
              </Link>
            </>
          ) : (
            <>
              {/* Tarjeta: Mi Código QR (Sólo Vendedor) */}
              {cards[0] && (
                <Link
                  href={`/dashboard/qr/${cards[0].id}`}
                  className="group bg-slate-900/50 hover:bg-slate-900 border border-slate-900 hover:border-orange-500/30 p-6 rounded-2xl flex gap-5 transition-all shadow-sm hover:shadow-orange-500/5"
                >
                  <div className="bg-orange-600/10 border border-orange-500/20 group-hover:bg-orange-600 group-hover:text-white text-orange-400 p-4 rounded-xl text-2xl h-14 w-14 flex items-center justify-center transition-all shrink-0">
                    📷
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-white group-hover:text-orange-400 transition-colors text-sm sm:text-base">
                      Mi Código QR
                    </h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Visualiza y descarga tu código QR corporativo personalizado para compartir tu información de contacto de forma inmediata.
                    </p>
                  </div>
                </Link>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}