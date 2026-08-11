import React from "react";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { prisma } from "../../lib/prisma";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false, noarchive: true, nosnippet: true } };

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Verificar estado activo del usuario y empresa en la BD (Requisito 6 y 10)
  const dbUser = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    include: { company: true },
  });

  if (!dbUser || !dbUser.isActive || (!dbUser.company.isActive && dbUser.role !== "SUPERADMIN")) {
    redirect("/login?error=suspended");
  }

  // Consultar licencias de la empresa del usuario
  const licenses = await prisma.companyProductLicense.findMany({
    where: {
      companyId: dbUser.companyId
    }
  });
  const activeProducts = dbUser.role === "SUPERADMIN"
    ? ["EMPRESAS", "LOCAL"]
    : licenses.filter(l => {
        // Validación de estado y fechas en UTC
        const now = new Date();
        const isExpired = l.expiresAt && l.expiresAt <= now;
        const isFuture = l.startsAt && l.startsAt > now;
        return l.status === "ACTIVE" && !isExpired && !isFuture;
      }).map(l => l.product);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07101F] text-slate-900 dark:text-white flex flex-col lg:flex-row transition-colors duration-200">
      {/* Barra lateral de navegación con control de roles y productos */}
      <Sidebar user={session.user as any} activeProducts={activeProducts} />
      
      {/* Contenedor principal de contenido */}
      <div className="flex-1 lg:pl-64 min-w-0 flex flex-col">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
