// app/dashboard/leads/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import LeadsClient from "./LeadsClient";

export default async function LeadsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = session.user as any;
  const isAdmin = user.role === "SUPERADMIN" || user.role === "CLIENT_ADMIN";

  // 1. Consultar todos los leads de la empresa o del usuario
  const leads = await prisma.lead.findMany({
    where: isAdmin
      ? { card: { companyId: user.companyId } }
      : { card: { userId: user.id } },
    include: {
      card: {
        select: {
          name: true,
          id: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Obtener la lista de IDs de tarjetas asociadas
  const cardsList = await prisma.card.findMany({
    where: isAdmin ? { companyId: user.companyId } : { userId: user.id },
    select: { id: true },
  });
  const cardIds = cardsList.map((c) => c.id);

  // 3. Consultar los eventos de interacción de estas tarjetas para armar la línea de tiempo
  const events = await prisma.event.findMany({
    where: {
      cardId: { in: cardIds },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight font-sans">CRM y Prospectos</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Gestión y seguimiento comercial de contactos registrados.
          </p>
        </div>
      </div>

      <LeadsClient initialLeads={leads} allEvents={events} isAdmin={isAdmin} />
    </div>
  );
}
