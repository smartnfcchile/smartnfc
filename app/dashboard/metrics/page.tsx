// app/dashboard/metrics/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import MetricsClient from "./MetricsClient";

export default async function MetricsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = session.user as any;
  const isAdmin = user.role === "SUPERADMIN" || user.role === "CLIENT_ADMIN";

  // Consultar tarjetas del usuario o de toda la empresa según rol
  const cards = await prisma.card.findMany({
    where: isAdmin ? { companyId: user.companyId } : { userId: user.id },
    include: {
      events: true,
      leads: {
        orderBy: { createdAt: "desc" },
      },
    },
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

  const deviceCounts: Record<string, number> = {};
  const allEvents = cards.flatMap((card: any) => card.events);
  const allLeads = cards.flatMap((card: any) => card.leads);

  const totalViews = allEvents.filter((e: any) => e.eventType === "VIEW").length;
  totalNfcScans = allEvents.filter((e: any) => e.eventType === "NFC_SCAN").length;
  totalVisitas = totalViews + totalNfcScans;
  totalWhatsapp = allEvents.filter((e: any) => e.eventType === "WHATSAPP_CLICK").length;
  totalContactos = allEvents.filter((e: any) => e.eventType === "VCARD_DOWNLOAD").length;
  totalEmails = allEvents.filter((e: any) => e.eventType === "EMAIL_CLICK").length;
  totalPhones = allEvents.filter((e: any) => e.eventType === "PHONE_CLICK").length;
  totalLinks = allEvents.filter((e: any) => e.eventType === "LINK_CLICK").length;

  totalInteracciones = totalWhatsapp + totalEmails + totalPhones + totalContactos + totalLinks;
  const conversacionesGeneradas = totalWhatsapp + totalContactos;

  const tasaContacto =
    totalVisitas > 0 ? Math.round((conversacionesGeneradas / totalVisitas) * 100) : 0;

  totalLeads = allLeads.length;

  tasaConversion =
    totalVisitas > 0 ? Math.round((totalInteracciones / totalVisitas) * 100) : 0;

  const ipsUnicas = new Set(
    allEvents
      .filter((e: any) => (e.eventType === "VIEW" || e.eventType === "NFC_SCAN") && e.ipHash)
      .map((e: any) => e.ipHash)
  );
  visitantesUnicos = ipsUnicas.size;

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

  const cardsRanking = cards
    .map((card: any) => {
      const cardViews = card.events.filter((e: any) => e.eventType === "VIEW").length;
      const cardNfc = card.events.filter((e: any) => e.eventType === "NFC_SCAN").length;
      const visitas = cardViews + cardNfc;
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

      const conversion = visitas > 0 ? Math.round((interacciones / visitas) * 100) : 0;

      return {
        id: card.id,
        name: card.name || "Sin nombre",
        visitas,
        nfcScans: cardNfc,
        leads,
        whatsapp,
        contactos,
        conversion,
        ultimaActividad,
      };
    })
    .sort((a: any, b: any) => {
      if (b.contactos !== a.contactos) return b.contactos - a.contactos;
      if (b.leads !== a.leads) return b.leads - a.leads;
      if (b.whatsapp !== a.whatsapp) return b.whatsapp - a.whatsapp;
      if (b.conversion !== a.conversion) return b.conversion - a.conversion;
      return b.visitas - a.visitas;
    });

  const topCards = cardsRanking.slice(0, 5);

  const initialData = {
    totalVisitas,
    totalNfcScans,
    tasaConversion,
    visitantesUnicos,
    totalLeads,
    totalWhatsapp,
    totalContactos,
    totalEmails,
    totalPhones,
    conversacionesGeneradas,
    tasaContacto,
    topCards,
    cardsRanking,
    deviceRanking,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Métricas y Analíticas</h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          {isAdmin
            ? "Reporte en tiempo real de interacciones consolidadas de tu marca."
            : "Reporte en tiempo real de tu rendimiento e interacciones comerciales."}
        </p>
      </div>

      <MetricsClient initialData={initialData} isAdmin={isAdmin} />
    </div>
  );
}
