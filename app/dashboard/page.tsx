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
  
  const cards = await prisma.card.findMany({
 where: { userId },
    include: { 
      events: true,
      leads: {
        orderBy: { createdAt: 'desc' } // Trae los correos más nuevos primero
      }
    }
  });

  let totalVisitas = 0;
  let totalNfcScans = 0;
  let totalWhatsapp = 0;
  let totalContactos = 0;
  let visitantesUnicos = 0;
  let totalEmails = 0;
  let totalPhones = 0;
  let totalLinks = 0;
  let totalInteracciones = 0;
  let tasaConversion = 0;
  let totalLeads = 0;
  let visitasHoy = 0;
  let visitasAyer = 0;

  const deviceCounts: Record<string, number> = {};
  
const allEvents = cards.flatMap((card: any) => card.events);
const allLeads = cards.flatMap((card: any) => card.leads);
  const totalViews = allEvents.filter((e: any) => e.eventType === "VIEW").length;
  totalNfcScans = allEvents.filter((e: any) => e.eventType === "NFC_SCAN").length;
  totalVisitas = totalViews + totalNfcScans;
  totalWhatsapp = allEvents.filter((e:any) => e.eventType === "WHATSAPP_CLICK").length;
  totalContactos = allEvents.filter((e: any) => e.eventType === "VCARD_DOWNLOAD").length;
  totalEmails = allEvents.filter((e: any) => e.eventType === "EMAIL_CLICK").length;
  totalPhones = allEvents.filter((e: any) => e.eventType === "PHONE_CLICK").length;
  totalLinks = allEvents.filter((e: any) => e.eventType === "LINK_CLICK").length;
const hoy = new Date().toISOString().split("T")[0];

visitasHoy = allEvents.filter((e: any) => {
  if (e.eventType !== "VIEW" && e.eventType !== "NFC_SCAN") return false;

  const fechaEvento = new Date(e.createdAt)
    .toISOString()
    .split("T")[0];

  return fechaEvento === hoy;
}).length;
totalInteracciones =
  totalWhatsapp +
  totalEmails +
  totalPhones +
  totalContactos +
  totalLinks;

const conversacionesGeneradas =
  totalWhatsapp + totalContactos;

const tasaContacto =
  totalVisitas > 0
    ? Math.round((conversacionesGeneradas / totalVisitas) * 100)
    : 0;

  totalLeads = allLeads.length;
    
  tasaConversion =
     totalVisitas > 0
        ? Math.round((totalInteracciones / totalVisitas) * 100)
         : 0;
    const ipsUnicas = new Set(
  allEvents
    .filter((e:any) => (e.eventType === "VIEW" || e.eventType === "NFC_SCAN") && e.ipHash)
    .map((e:any) => e.ipHash)
);
    visitantesUnicos = ipsUnicas.size;
    const inicioHoy = new Date();
inicioHoy.setHours(0, 0, 0, 0);

const inicioAyer = new Date(inicioHoy);
inicioAyer.setDate(inicioAyer.getDate() - 1);

visitasHoy = allEvents.filter((e: any) => {
  const fecha = new Date(e.createdAt);
  return (
    (e.eventType === "VIEW" || e.eventType === "NFC_SCAN") &&
    fecha >= inicioHoy
  );
}).length;

visitasAyer = allEvents.filter((e: any) => {
  const fecha = new Date(e.createdAt);
  return (
    (e.eventType === "VIEW" || e.eventType === "NFC_SCAN") &&
    fecha >= inicioAyer &&
    fecha < inicioHoy
  );
}).length;

    allEvents.forEach((e: any) => {
      if (e.eventType === "VIEW" || e.eventType === "NFC_SCAN") {
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
  

  const deviceRanking = Object.entries(deviceCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
   const cardsRanking = cards.map((card: any) => {
     
  const totalViews = card.events.filter((e: any) => e.eventType === "VIEW").length;
  const nfcScans = card.events.filter((e: any) => e.eventType === "NFC_SCAN").length;
  const visitas = totalViews + nfcScans;
  const leads = card.leads.length;

  const whatsapp = card.events.filter((e: any) => e.eventType === "WHATSAPP_CLICK").length;
  const emails = card.events.filter((e: any) => e.eventType === "EMAIL_CLICK").length;
  const phones = card.events.filter((e: any) => e.eventType === "PHONE_CLICK").length;
  const contactos = card.events.filter((e: any) => e.eventType === "VCARD_DOWNLOAD").length;
  const links = card.events.filter((e: any) => e.eventType === "LINK_CLICK").length;

  const interacciones = whatsapp + emails + phones + contactos + links;
  const ultimoEvento = card.events
  .slice()
  .sort(
    (a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

const ultimaActividad = ultimoEvento
  ? new Date(ultimoEvento.createdAt).toLocaleDateString("es-CL")
  : "Sin actividad";

  const conversion =
    visitas > 0 ? Math.round((interacciones / visitas) * 100) : 0;

 return {
  id: card.id,
  name: card.name || "Sin nombre",
  visitas,
  nfcScans,
  leads,
  whatsapp,
  contactos,
  conversion,
  ultimaActividad,
};
}).sort((a: any, b: any) => {
  if (b.contactos !== a.contactos) return b.contactos - a.contactos;
  if (b.leads !== a.leads) return b.leads - a.leads;
  if (b.whatsapp !== a.whatsapp) return b.whatsapp - a.whatsapp;
  if (b.conversion !== a.conversion) return b.conversion - a.conversion;
  return b.visitas - a.visitas;
});
const topCards = cardsRanking.slice(0, 5);
console.log("cardsRanking", cardsRanking.length);
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
      la plataforma:{" "}
      <span className="text-blue-400 font-medium">
        {cards.length} tarjetas activas
      </span>
    </p>
  </div>

  <div className="flex items-center gap-4">
    <div className="text-right hidden sm:block">
      <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">
        Usuario
      </span>

      <span className="font-medium text-slate-300">
        {session.user?.name}
      </span>
    </div>

    <LogoutButton />
  </div>
</div>
    
        {/* Grilla de Métricas */}
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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
    <div className="bg-orange-500/10 p-2.5 rounded-xl border border-orange-500/20">
      <span className="text-orange-400 text-xl">⚡</span>
    </div>
    <h3 className="text-slate-400 font-medium">Lecturas NFC</h3>
  </div>
  <p className="text-4xl font-extrabold text-white">{totalNfcScans}</p>
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
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
  <div className="flex items-center gap-3 mb-4">
    <div className="bg-purple-500/10 p-2.5 rounded-xl border border-purple-500/20">
      <span className="text-purple-400 text-xl">🪪</span>
    </div>
    <h3 className="text-slate-400 font-medium">Tarjetas Activas</h3>
  </div>

  <p className="text-4xl font-extrabold text-white">
    {cards.length}
  </p>
</div>

<div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
  <div className="flex items-center gap-3 mb-4">
    <div className="bg-pink-500/10 p-2.5 rounded-xl border border-pink-500/20">
      <span className="text-pink-400 text-xl">📈</span>
    </div>

    <h3 className="text-slate-400 font-medium">
      Conversaciones
    </h3>
  </div>

  <p className="text-4xl font-extrabold text-white">
    {conversacionesGeneradas}
  </p>

  <p className="text-sm text-green-400 mt-2">
    {tasaContacto}% contacto
  </p>
</div>

</div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm p-6 mb-6">
  <h2 className="text-xl font-bold text-white mb-4">
    🏆 Top 5 Tarjetas
  </h2>

  <div className="space-y-3">
    {topCards.map((card: any, index: number) => (
     <div key={card.id} className="flex items-center justify-between bg-slate-950 rounded-xl p-4 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="text-2xl font-bold text-yellow-400">
            #{index + 1}
          </div>

          <div>
            <div className="font-semibold text-white">
              {card.name}
            </div>

            <div className="text-sm text-slate-400">
           {card.contactos} contactos · {card.leads} leads · {card.whatsapp} WhatsApp · {card.nfcScans} NFC
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-green-400 font-bold">
            {card.leads} leads
          </div>

          <div className="text-blue-400 text-sm">
            {card.conversion}%
          </div>
        </div>
      </div>
    ))}
  </div>
</div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
  <div className="p-6 border-b border-slate-800 bg-slate-900/50">

    <h2 className="text-xl font-bold text-white">Dashboard Global de Tarjetas</h2>
    <p className="text-sm text-slate-400 mt-1">
      Resumen consolidado de todas las tarjetas activas.
    </p>
  </div>

  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-950/60 text-slate-400 uppercase text-xs">
        <tr>
          <th className="py-4 px-6 font-medium text-center">Rank</th>
          <th className="py-4 px-6 font-medium">Tarjeta</th>
          <th className="py-4 px-6 font-medium text-center">Visitas</th>
        <th className="py-4 px-6 font-medium text-center">Leads</th>
        <th className="py-4 px-6 font-medium text-center">WhatsApp</th>
        <th className="py-4 px-6 font-medium text-center">Contactos</th>
<th className="py-4 px-6 font-medium text-center">Última actividad</th>
<th className="py-4 px-6 font-medium text-center">Conversión</th>
          <th className="py-4 px-6 font-medium text-center">Acciones</th>
        </tr>
      </thead>

      <tbody>
     {cardsRanking.map((card: any, index: number) => (
          <tr key={card.id} className="border-b border-slate-800/50">
            <td className="py-4 px-6 text-center text-xl">
  {index === 0 ? "🥇" :
   index === 1 ? "🥈" :
   index === 2 ? "🥉" :
   `${index + 1}°`}
</td>
            <td className="py-4 px-6 text-slate-200 font-medium">
              {card.name}
            </td>
             <td className="py-4 px-6 text-center text-slate-300">
              {card.visitas} <span className="text-xs text-amber-500 font-semibold block sm:inline ml-1" title="Lecturas de tarjetas NFC">(⚡ {card.nfcScans})</span>
            </td>
          <td className="py-4 px-6 text-center text-slate-300">
  {card.leads}
</td>

<td className="py-4 px-6 text-center text-green-400 font-bold">
  {card.whatsapp}
</td>

<td className="py-4 px-6 text-center text-cyan-400 font-bold">
  {card.contactos}
</td>

<td className="py-4 px-6 text-center text-slate-300">
  {card.ultimaActividad}
</td>

<td className="py-4 px-6 text-center">
              <span className="rounded-lg bg-blue-500/10 text-blue-400 px-3 py-1 font-bold">
                {card.conversion}%
              </span>
            </td>
            <td className="py-4 px-6 text-center">
              <div className="flex items-center justify-center gap-2">
                <a
                  href={`/dashboard/editor/${card.id}`}
                  className="inline-flex items-center rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition"
                >
                  ✏️ Editar
                </a>
                <a
                  href={`/dashboard/qr/${card.id}`}
                  className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-bold text-white transition"
                >
                  📷 QR
                </a>
              </div>
            </td>
          </tr>
        ))}

        {cardsRanking.length === 0 && (
          <tr>
            <td colSpan={9} className="py-8 text-center text-slate-500">
              Aún no hay tarjetas creadas.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">

  <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
    <div>
     <h2 className="text-xl font-bold text-white">
  🎯 Embudo Comercial
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

 <div className="space-y-4 p-6">
  <div className="flex justify-between items-center">
    <span className="text-slate-400">👀 Visitas</span>
    <span className="text-2xl font-bold text-white">{totalVisitas}</span>
  </div>

  <div className="flex justify-between items-center">
    <span className="text-slate-400">💬 Conversaciones</span>
    <span className="text-2xl font-bold text-cyan-400">{conversacionesGeneradas}</span>
  </div>

  <div className="flex justify-between items-center">
    <span className="text-slate-400">📇 Contactos guardados</span>
    <span className="text-2xl font-bold text-blue-400">{totalContactos}</span>
  </div>

  <div className="flex justify-between items-center">
    <span className="text-slate-400">🎯 Leads</span>
    <span className="text-2xl font-bold text-green-400">{totalLeads}</span>
  </div>

  <div className="flex justify-between items-center border-t border-slate-800 pt-4">
    <span className="text-slate-400">📈 Conversión</span>
    <span className="text-2xl font-bold text-yellow-400">{tasaConversion}%</span>
  </div>
</div>
       {/* Tablas Inferiores: Dispositivos y Leads */}
<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

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
     href="/api/leads/export"
      className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-slate-800"
    >
      Exportar CSV
    </a>

    <div className="bg-amber-500/10 text-amber-400 font-bold py-1 px-3 rounded-lg border border-amber-500/20 text-sm">
   {totalLeads} Leads
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
  
  <th className="py-4 px-6 font-medium text-right">Fecha</th>
  <th className="py-4 px-6 font-medium text-center">Acciones</th>
</tr>
                </thead>
            <tbody>
{allLeads.map((lead: any) => (
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


                  {allLeads.length === 0 && (
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
      </div>
    </main>
  );
}  