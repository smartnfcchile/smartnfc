import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";
import LogoutButton from "../../components/LogoutButton";
import { prisma } from "../../lib/prisma";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userId = (session.user as any).id;
  
  const card = await prisma.card.findFirst({
    where: { userId: userId },
    include: { 
      events: true,
      leads: {
        orderBy: { createdAt: 'desc' } // Trae los correos más nuevos primero
      }
    }
  });

  let totalVisitas = 0;
  let totalWhatsapp = 0;
  let totalContactos = 0;
  let visitantesUnicos = 0;
  let totalEmails = 0;
  let totalPhones = 0;
  let totalLinks = 0;
  let totalInteracciones = 0;
  let tasaConversion = 0;
  let totalLeads = 0;

  const deviceCounts: Record<string, number> = {};

  if (card && card.events) {
    totalVisitas = card.events.filter(e => e.eventType === "VIEW").length;
    totalWhatsapp = card.events.filter(e => e.eventType === "WHATSAPP_CLICK").length;
    totalContactos = card.events.filter(e => e.eventType === "VCARD_DOWNLOAD").length;
    totalEmails = card.events.filter( e => e.eventType === "EMAIL_CLICK").length;
  totalPhones = card.events.filter(e => e.eventType === "PHONE_CLICK").length;
totalLinks = card.events.filter(e => e.eventType === "LINK_CLICK").length;


totalInteracciones =
  totalWhatsapp +
  totalEmails +
  totalPhones +
  totalContactos +
  totalLinks;

  totalLeads = card.leads?.length || 0;
    
  tasaConversion =
     totalVisitas > 0
        ? Math.round((totalInteracciones / totalVisitas) * 100)
         : 0;
    const ipsUnicas = new Set(
      card.events
        .filter(e => e.eventType === "VIEW" && e.ipHash)
        .map(e => e.ipHash)
    );
    visitantesUnicos = ipsUnicas.size;

    card.events.forEach(e => {
      if (e.eventType === "VIEW") {
       const ua = e.userAgent || "Desconocido";

let device = "Desconocido";

if (ua.includes("server-render")) {
  device = "Visitas antiguas";
} else if (ua.includes("Windows")) {
  device = "Windows / Chrome";
} else if (ua.includes("Android")) {
  device = "Android";
} else if (ua.includes("iPhone")) {
  device = "iPhone";
} else if (ua.includes("Macintosh")) {
  device = "Mac / Safari";
}

deviceCounts[device] = (deviceCounts[device] || 0) + 1;
      }
    });
  }

  const deviceRanking = Object.entries(deviceCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Cabecera */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
              Dashboard de Trazabilidad
            </h1>
            <p className="text-slate-400">
              Seguimiento de visitas y acciones de la tarjeta: <span className="text-blue-400 font-medium">{card?.name || "Sin tarjeta"}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
              <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">Usuario</span>
              <span className="font-medium text-slate-300">{session.user?.name}</span>
            </div>
            <LogoutButton />
          </div>
        </div>
        
        {/* Grilla de Métricas */}
   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
  <div className="flex items-center gap-3 mb-4">
    <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20">
      <span className="text-blue-400 text-xl">👁️</span>
    </div>
    <h3 className="text-slate-400 font-medium">Visitas Totales</h3>
  </div>
  <p className="text-4xl font-extrabold text-white">{totalVisitas}</p>
</div>
         <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
  <div className="flex items-center gap-3 mb-4">
    <div className="bg-cyan-500/10 p-2.5 rounded-xl border border-cyan-500/20">
      <span className="text-cyan-400 text-xl">🎯</span>
    </div>
    <h3 className="text-slate-400 font-medium">Conversión</h3>
  </div>

  <p className="text-4xl font-extrabold text-white">
    {tasaConversion}%
  </p>
</div>
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                <span className="text-emerald-400 text-xl">👤</span>
              </div>
              <h3 className="text-slate-400 font-medium">Visitantes Únicos</h3>
            </div>
            <p className="text-4xl font-extrabold text-white">{visitantesUnicos}</p>
          </div>
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
  <div className="flex items-center gap-3 mb-4">
    <div className="bg-yellow-500/10 p-2.5 rounded-xl border border-yellow-500/20">
      <span className="text-yellow-400 text-xl">💰</span>
    </div>
    <h3 className="text-slate-400 font-medium">Leads Capturados</h3>
  </div>
  <p className="text-4xl font-extrabold text-white">{totalLeads}</p>
</div>
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-500/10 p-2.5 rounded-xl border border-green-500/20">
                <span className="text-green-400 text-xl">💬</span>
              </div>
              <h3 className="text-slate-400 font-medium">Clics WhatsApp</h3>
            </div>
            <p className="text-4xl font-extrabold text-white">{totalWhatsapp}</p>
          </div>
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                <span className="text-amber-400 text-xl">📥</span>
              </div>
              <h3 className="text-slate-400 font-medium">Contactos Guardados</h3>
            </div>
            <p className="text-4xl font-extrabold text-white">{totalContactos}</p>
          </div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
  <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
    <div>
     <h2 className="text-xl font-bold text-white">
  Contactos Generados
</h2>

<p className="text-sm text-slate-400 mt-1">
  Personas que realizaron acciones de contacto desde tu tarjeta.
</p>
    </div>

    <div className="text-right">
      <p className="text-4xl font-extrabold text-white">{totalInteracciones}</p>
      <p className="text-xs uppercase tracking-wider text-slate-500">
  CONTACTOS
</p>
    </div>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
    <div className="p-5">
      <p className="text-sm text-slate-400">WhatsApp</p>
      <p className="mt-2 text-3xl font-black text-white">{totalWhatsapp}</p>
    </div>

    <div className="p-5">
      <p className="text-sm text-slate-400">Email</p>
      <p className="mt-2 text-3xl font-black text-white">{totalEmails}</p>
    </div>

    <div className="p-5">
      <p className="text-sm text-slate-400">Llamadas</p>
      <p className="mt-2 text-3xl font-black text-white">{totalPhones}</p>
    </div>

    <div className="p-5">
      <p className="text-sm text-slate-400">Contactos guardados</p>
      <p className="mt-2 text-3xl font-black text-white">{totalContactos}</p>
    </div>

    <div className="p-5">
      <p className="text-sm text-slate-400">Enlaces</p>
      <p className="mt-2 text-3xl font-black text-white">{totalLinks}</p>
    </div>
  </div>
</div>

        {/* Tablas Inferiores: Dispositivos y Leads */}
        <div className="grid grid-cols-1 gap-6">

          {/* Dispositivos */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-800 bg-slate-900/50">
              <h2 className="text-xl font-bold text-white">Análisis de Dispositivos</h2>
              <p className="text-sm text-slate-400 mt-1">Sistemas operativos de tus visitantes.</p>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-sm uppercase tracking-wider bg-slate-950/50">
                    <th className="py-4 px-6 font-medium">Sistema</th>
                    <th className="py-4 px-6 font-medium text-right">Visitas</th>
                  </tr>
                </thead>
                <tbody>
                  {deviceRanking.map((device, index) => (
                    <tr key={index} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 text-slate-300 font-medium">
                        {device.name === "iPhone" ? "📱 " : device.name === "Android" ? "🤖 " : "💻 "}
                        {device.name}
                      </td>
                      <td className="py-4 px-6 text-white font-bold text-right text-lg">{device.count}</td>
                    </tr>
                  ))}
                  {deviceRanking.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-slate-500">No hay datos suficientes.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Leads Capturados */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden flex flex-col">
           <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  <div>
    <h2 className="text-xl font-bold text-white">Prospectos Capturados</h2>
    <p className="text-sm text-slate-400 mt-1">
      Personas que dejaron sus datos desde tu tarjeta.
    </p>
  </div>

  <div className="flex items-center gap-3">
    <a
      href={`/api/leads/export?cardId=${card?.id}`}
      className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
    >
      Exportar CSV
    </a>

    <div className="bg-amber-500/10 text-amber-400 font-bold py-1 px-3 rounded-lg border border-amber-500/20 text-sm">
      {card?.leads?.length || 0} Leads
    </div>
  </div>
</div>  
            <div className="overflow-y-auto flex-1 max-h-[300px]">
              <table className="w-full text-left border-collapse">
                <thead>
             <tr className="border-b border-slate-800 text-slate-400 text-sm uppercase tracking-wider bg-slate-950/50">
  <th className="py-4 px-6 font-medium">Prospecto</th>
  <th className="py-4 px-6 font-medium">Empresa</th>
  <th className="py-4 px-6 font-medium">Cargo</th>
  <th className="py-4 px-6 font-medium">Teléfono</th>
  <th className="py-4 px-6 font-medium">Correo</th>
  <th className="py-4 px-6 font-medium text-right">Fecha</th>
  <th className="py-4 px-6 font-medium text-center">Acciones</th>
</tr>
                </thead>
            <tbody>
  {card?.leads?.map((lead) => (
    <tr
      key={lead.id}
      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
    >
      <td className="py-4 px-6 text-slate-300 font-bold">
        {lead.name}
      </td>

      <td className="py-4 px-6 text-slate-400">
        {lead.company || "—"}
      </td>

      <td className="py-4 px-6 text-slate-400">
        {lead.position || "—"}
      </td>

     <td className="py-4 px-6">
  {lead.phone ? (
    <a
      href={`tel:${lead.phone}`}
      className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-emerald-400 font-medium hover:bg-emerald-500/20 transition"
    >
      📞 {lead.phone}
    </a>
  ) : (
    <span className="text-slate-400">—</span>
  )}
</td>

<td className="py-4 px-6">
  {lead.email ? (
    <a
      href={`mailto:${lead.email}`}
      className="inline-flex items-center gap-2 rounded-lg bg-sky-500/10 border border-sky-500/20 px-3 py-1 text-sky-400 font-medium hover:bg-sky-500/20 transition"
    >
      ✉️ {lead.email}
    </a>
  ) : (
    <span className="text-slate-400">—</span>
  )}
</td>
      <td className="py-4 px-6 text-slate-400 text-sm text-right">
        {lead.createdAt.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </td>
      <td className="py-4 px-6 text-center">
  {lead.phone ? (
    <a
      href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-1 text-green-400 font-medium hover:bg-green-500/20 transition"
    >
      🟢 WhatsApp
    </a>
  ) : (
    <span className="text-slate-500">—</span>
  )}
</td>
    </tr>
  ))}


                  {(!card?.leads || card.leads.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        <span className="block text-2xl mb-2">📥</span>
                        Aún no has capturado ningún correo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}  