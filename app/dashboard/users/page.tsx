// app/dashboard/users/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = session.user as any;
  const isAdmin = user.role === "SUPERADMIN" || user.role === "CLIENT_ADMIN";

  if (!isAdmin) {
    redirect("/dashboard");
  }

  // Consultar todos los usuarios de la empresa
  const users = await prisma.user.findMany({
    where: { companyId: user.companyId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: { cards: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Gestionar Vendedores</h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          Crea perfiles para tus vendedores, genera claves de acceso y administra sus cuentas.
        </p>
      </div>

      <UsersClient initialUsers={users} currentUserId={user.id} />
    </div>
  );
}
