/* eslint-disable @typescript-eslint/no-explicit-any */
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import LeadsClient from "./LeadsClient";
import { getProductLicense, isLicenseValid } from "../../../lib/product-access";

export default async function LeadsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = session.user as any;

  if (user.role !== "SUPERADMIN") {
    const license = await getProductLicense(user.companyId, "EMPRESAS");
    if (!isLicenseValid(license)) {
      redirect("/dashboard/local");
    }
  }

  const isAdmin = user.role === "SUPERADMIN" || user.role === "COMPANY_OWNER" || user.role === "COMPANY_ADMIN";

  // 1. Consultar todos los leads de la empresa o del usuario con sus interacciones históricas
  const leads = await prisma.lead.findMany({
    where: isAdmin
      ? { companyId: user.companyId }
      : {
          OR: [
            { card: { userId: user.id } },
            { interactions: { some: { card: { userId: user.id } } } },
          ],
        },
    include: {
      card: {
        select: {
          name: true,
          id: true,
        },
      },
      interactions: {
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Obtener la lista de IDs de tarjetas asociadas
  const cardsList = await prisma.card.findMany({
    where: isAdmin ? { companyId: user.companyId } : { userId: user.id },
    select: { id: true },
  });
  const cardIds = cardsList.map((c) => c.id);

  // 3. Consultar los eventos de interacción de estas tarjetas para armar la línea de tiempo analítica
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
          <h1 className="text-3xl font-bold text-slate-950 dark:text-white tracking-tight font-sans">CRM y Prospectos</h1>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1">
            Gestión y seguimiento comercial de contactos registrados.
          </p>
        </div>
      </div>

      <LeadsClient initialLeads={leads as any} allEvents={events} isAdmin={isAdmin} />
    </div>
  );
}
