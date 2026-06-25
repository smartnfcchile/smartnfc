// app/dashboard/cards/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import CardsClient from "./CardsClient";

export default async function CardsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = session.user as any;
  const isAdmin = user.role === "SUPERADMIN" || user.role === "CLIENT_ADMIN";

  if (!isAdmin) {
    redirect("/dashboard");
  }

  // 1. Obtener todas las tarjetas de la empresa
  const cards = await prisma.card.findMany({
    where: { companyId: user.companyId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Obtener la lista de usuarios/vendedores disponibles de la empresa para asignación
  const companyUsers = await prisma.user.findMany({
    where: { companyId: user.companyId },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Tarjetas Virtuales</h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          Crea perfiles corporativos de marca y activa o inactiva las tarjetas virtuales de tu equipo.
        </p>
      </div>

      <CardsClient initialCards={cards} users={companyUsers} />
    </div>
  );
}
