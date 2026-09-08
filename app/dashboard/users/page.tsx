import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import UsersClient from "./UsersClient";
import { getProductLicense, isLicenseValid } from "../../../lib/product-access";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as any;
  if (user.role !== "SUPERADMIN") {
    const license = await getProductLicense(user.companyId, "EMPRESAS");
    if (!isLicenseValid(license)) redirect("/dashboard/local");
  }

  const isAdmin = user.role === "SUPERADMIN" || user.role === "COMPANY_OWNER" || user.role === "COMPANY_ADMIN";
  if (!isAdmin) redirect("/dashboard");

  const users = await prisma.user.findMany({
    where: { companyId: user.companyId },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, _count: { select: { cards: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950 dark:text-white tracking-tight">Gestionar Integrantes</h1>
        <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1">
          Administra a los integrantes de tu empresa. Al registrar un colaborador, SmartNFC crea su tarjeta, envía la invitación y genera la solicitud de producción.
        </p>
      </div>
      <UsersClient initialUsers={users} currentUserId={user.id} />
    </div>
  );
}
