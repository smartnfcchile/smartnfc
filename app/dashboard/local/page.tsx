import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import Link from "next/link";
import { getProductLicense } from "../../../lib/product-access";

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

  // Verificar la licencia de Smart NFC Local para la empresa (Requisito Parte G)
  const license = await getProductLicense(user.companyId, "LOCAL");

  if (!license || license.status !== "ACTIVE") {
    const estadoText = license
      ? license.status === "SUSPENDED"
        ? "suspendida"
        : license.status === "PENDING"
          ? "en preparación"
          : license.status === "EXPIRED"
            ? "vencida"
            : "cancelada"
      : "no contratada";

    return (
      <div className="space-y-6">
        <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-2xl text-center space-y-4 max-w-xl mx-auto mt-12 shadow-xl">
          <div className="text-4xl">🏪</div>
          <h2 className="text-xl font-black text-white">Smart NFC Local no disponible</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            La licencia de Smart NFC Local para tu empresa se encuentra actualmente <strong className="text-amber-400 font-bold">{estadoText}</strong>.
          </p>
          <p className="text-slate-450 text-xs">
            Si crees que esto es un error o deseas activar esta solución, por favor ponte en contacto con nuestro equipo comercial o con soporte técnico.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-block bg-slate-800 hover:bg-slate-750 text-white font-extrabold py-2.5 px-6 rounded-xl text-xs transition active:scale-95 border border-slate-750"
            >
              Ir al Panel General B2B
            </Link>
          </div>
        </div>
      </div>
    );
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

  const campaignIds = campaigns.map(c => c.id);

  // Rangos de tiempo para la actividad
  const now = new Date();
  const date7DaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const date30DaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Inicializar métricas a cero
  let totalViews = 0;
  let totalNfc = 0;
  let totalQr = 0;
  let totalSubscribers = 0;
  let totalWhatsappRedirects = 0;
  let conversionRate = 0;

  let views7Days = 0;
  let subscribers7Days = 0;
  let conversion7Days = 0;

  let views30Days = 0;
  let subscribers30Days = 0;
  let conversion30Days = 0;

  let touchpointPerformance: any[] = [];

  if (campaignIds.length > 0) {
    const [
      viewsCount,
      nfcCount,
      qrCount,
      subscribersCount,
      whatsappCount,
      v7,
      s7,
      v30,
      s30,
      tps
    ] = await Promise.all([
      prisma.localEvent.count({ where: { campaignId: { in: campaignIds }, eventType: "VIEW" } }),
      prisma.localEvent.count({ where: { campaignId: { in: campaignIds }, eventType: "NFC_SCAN" } }),
      prisma.localEvent.count({ where: { campaignId: { in: campaignIds }, eventType: "QR_SCAN" } }),
      prisma.localSubscriber.count({ where: { campaignId: { in: campaignIds }, status: "ACTIVE" } }),
      prisma.localEvent.count({ where: { campaignId: { in: campaignIds }, eventType: "WHATSAPP_REDIRECT" } }),

      prisma.localEvent.count({ where: { campaignId: { in: campaignIds }, eventType: "VIEW", createdAt: { gte: date7DaysAgo } } }),
      prisma.localSubscriber.count({ where: { campaignId: { in: campaignIds }, status: "ACTIVE", createdAt: { gte: date7DaysAgo } } }),

      prisma.localEvent.count({ where: { campaignId: { in: campaignIds }, eventType: "VIEW", createdAt: { gte: date30DaysAgo } } }),
      prisma.localSubscriber.count({ where: { campaignId: { in: campaignIds }, status: "ACTIVE", createdAt: { gte: date30DaysAgo } } }),

      prisma.localTouchpoint.findMany({
        where: { campaignId: { in: campaignIds } },
        include: {
          campaign: true,
          _count: {
            select: {
              localEvents: true
            }
          }
        }
      })
    ]);

    totalViews = viewsCount;
    totalNfc = nfcCount;
    totalQr = qrCount;
    totalSubscribers = subscribersCount;
    totalWhatsappRedirects = whatsappCount;
    conversionRate = totalViews > 0 ? (totalSubscribers / totalViews) * 100 : 0;

    views7Days = v7;
    subscribers7Days = s7;
    conversion7Days = views7Days > 0 ? (subscribers7Days / views7Days) * 100 : 0;

    views30Days = v30;
    subscribers30Days = s30;
    conversion30Days = views30Days > 0 ? (subscribers30Days / views30Days) * 100 : 0;

    touchpointPerformance = tps;
  }

  return (
    <div className="space-y-6">
      
      {/* Cabecera del Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Smart NFC Local</h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">
            Métricas globales y fidelización de clientes presenciales
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/local/suscriptores"
            className="bg-slate-800 hover:bg-slate-750 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition border border-slate-750 active:scale-95 cursor-pointer"
          >
            👥 Ver Suscriptores
          </Link>
          <Link
            href="/dashboard/local/campanas/nueva"
            className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition active:scale-95 shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 cursor-pointer"
          >
            ➕ Crear Campaña
          </Link>
        </div>
      </div>

      {/* Tarjetas de Métricas Globales (Requisito Parte G) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Visitas */}
        <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">Visitas Web (View)</span>
          <h3 className="text-2xl font-black text-white mt-2">{totalViews}</h3>
          <p className="text-[9px] text-slate-500 mt-1">Cargas de landing page</p>
        </div>

        {/* Escaneos NFC */}
        <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">Escaneos NFC</span>
          <h3 className="text-2xl font-black text-blue-400 mt-2">{totalNfc}</h3>
          <p className="text-[9px] text-slate-500 mt-1">Visitas por tarjetas NFC</p>
        </div>

        {/* Escaneos QR */}
        <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">Escaneos QR</span>
          <h3 className="text-2xl font-black text-indigo-400 mt-2">{totalQr}</h3>
          <p className="text-[9px] text-slate-500 mt-1">Visitas por códigos QR</p>
        </div>

        {/* Inscritos Activos */}
        <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">Inscritos Activos</span>
          <h3 className="text-2xl font-black text-emerald-400 mt-2">{totalSubscribers}</h3>
          <p className="text-[9px] text-slate-500 mt-1">Suscripciones confirmadas</p>
        </div>

        {/* Conversión */}
        <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">Tasa de Conversión</span>
          <h3 className="text-2xl font-black text-amber-400 mt-2">
            {conversionRate.toFixed(1)}%
          </h3>
          <p className="text-[9px] text-slate-500 mt-1">Inscritos / Visitas totales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Columna Izquierda: Actividad Reciente y Touchpoints */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Actividad Temporal Reciente */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4">Actividad Temporal</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Últimos 7 Días */}
              <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Últimos 7 Días</h4>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-500">Nuevos Inscritos:</span>
                  <span className="text-sm font-black text-white">{subscribers7Days}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-500">Conversión:</span>
                  <span className="text-sm font-black text-amber-400">{conversion7Days.toFixed(1)}%</span>
                </div>
              </div>

              {/* Últimos 30 Días */}
              <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Últimos 30 Días</h4>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-500">Nuevos Inscritos:</span>
                  <span className="text-sm font-black text-white">{subscribers30Days}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-500">Conversión:</span>
                  <span className="text-sm font-black text-amber-400">{conversion30Days.toFixed(1)}%</span>
                </div>
              </div>

            </div>
          </div>

          {/* Rendimiento por Touchpoint (Puntos QR/NFC) */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4">Rendimiento por Punto de Contacto</h3>
            {touchpointPerformance.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Crea o publica una campaña para registrar escaneos en tus puntos físicos.</p>
            ) : (
              <div className="divide-y divide-slate-850">
                {touchpointPerformance.map((tp) => (
                  <div key={tp.id} className="py-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-white">{tp.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">Código: {tp.code} | Campaña: {tp.campaign.name}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-300 font-mono">{tp._count.localEvents}</span>
                      <span className="text-[9px] text-slate-500 block">escaneos totales</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Columna Derecha: Campañas Recientes */}
        <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Tus Campañas</h3>
              <Link
                href="/dashboard/local/campanas"
                className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider"
              >
                Ver Todas
              </Link>
            </div>

            {campaigns.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-slate-500">No tienes campañas locales creadas.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.slice(0, 4).map((c) => {
                  return (
                    <div key={c.id} className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-white line-clamp-1">{c.name}</h4>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">/club/{c.slug}</p>
                      </div>
                      <Link
                        href={`/dashboard/local/campanas/${c.id}`}
                        className="text-[10px] font-bold text-blue-400 hover:text-blue-350"
                      >
                        Editar
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
