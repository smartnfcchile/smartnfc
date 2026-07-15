import React from "react";
import { prisma } from "../../lib/prisma";
import { UserRole } from "@prisma/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SuperadminDashboard() {
  // 1. Obtener métricas globales de la BD (Requisito 5)
  const totalCompanies = await prisma.company.count();
  const activeCompanies = await prisma.company.count({ where: { isActive: true } });
  const suspendedCompanies = await prisma.company.count({ where: { isActive: false } });
  const totalUsers = await prisma.user.count();
  
  const adminUsers = await prisma.user.count({
    where: {
      role: { in: [UserRole.COMPANY_OWNER, UserRole.COMPANY_ADMIN] }
    }
  });

  const activeCards = await prisma.card.count({ where: { isActive: true } });
  const totalLeads = await prisma.lead.count();
  const totalEvents = await prisma.event.count();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCompaniesCount = await prisma.company.count({
    where: { createdAt: { gte: thirtyDaysAgo } }
  });

  // 2. Obtener empresas recientes
  const recentCompanies = await prisma.company.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      users: {
        where: { role: UserRole.COMPANY_OWNER },
        take: 1
      },
      _count: {
        select: { cards: true }
      }
    }
  });

  // 3. Obtener logs de auditoría recientes
  const recentLogs = await prisma.adminAuditLog.findMany({
    take: 8,
    orderBy: { createdAt: "desc" }
  });

  // KPI card helper
  const stats = [
    { title: "Empresas Totales", value: totalCompanies, icon: "🏢", color: "text-blue-600 dark:text-blue-400 bg-blue-500/10" },
    { title: "Empresas Activas", value: activeCompanies, icon: "🟢", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
    { title: "Empresas Suspendidas", value: suspendedCompanies, icon: "🔴", color: "text-rose-600 dark:text-rose-400 bg-rose-500/10" },
    { title: "Usuarios Totales", value: totalUsers, icon: "👥", color: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10" },
    { title: "Administradores de Empresa", value: adminUsers, icon: "👔", color: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
    { title: "Identidades Activas", value: activeCards, icon: "🎴", color: "text-sky-600 dark:text-sky-400 bg-sky-500/10" },
    { title: "Contactos Capturados", value: totalLeads, icon: "📥", color: "text-purple-600 dark:text-purple-400 bg-purple-500/10" },
    { title: "Escaneos Registrados", value: totalEvents, icon: "⚡", color: "text-teal-600 dark:text-teal-400 bg-teal-500/10" },
    { title: "Creadas (Últimos 30 días)", value: recentCompaniesCount, icon: "📅", color: "text-pink-600 dark:text-pink-400 bg-pink-500/10" },
  ];

  return (
    <div className="space-y-8">
      {/* Saludo */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Resumen Global de la Plataforma
        </h1>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          Métricas y auditoría general en tiempo real de Smart NFC Chile.
        </p>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:border-slate-350 dark:hover:border-slate-800 transition-colors"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                {stat.title}
              </span>
              <span className="text-2xl font-black text-slate-850 dark:text-slate-100 block">
                {stat.value}
              </span>
            </div>
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-lg ${stat.color} shrink-0`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Tabla de Empresas Recientes (7 de 12 col) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
              Empresas Recientes
            </h3>
            <Link
              href="/superadmin/empresas"
              className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline uppercase tracking-wider"
            >
              Ver todas
            </Link>
          </div>

          <div className="overflow-x-auto border border-slate-150 dark:border-white/5 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-150 dark:border-white/5 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-4 py-3 text-[9px]">Nombre</th>
                  <th className="px-4 py-3 text-[9px]">Estado</th>
                  <th className="px-4 py-3 text-[9px]">Identidades (Uso/Max)</th>
                  <th className="px-4 py-3 text-[9px]">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {recentCompanies.map((comp) => {
                  return (
                    <tr
                      key={comp.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 text-slate-700 dark:text-slate-350"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          <Link href={`/superadmin/empresas/${comp.id}`} className="hover:underline">
                            {comp.name}
                          </Link>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block">/{comp.slug}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[8px] font-extrabold uppercase leading-none ${
                            comp.isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {comp.isActive ? "Activa" : "Suspendida"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {comp._count.cards} / {comp.maxIdentities}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(comp.createdAt).toLocaleDateString("es-CL")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Auditoría / Actividad Reciente (5 de 12 col) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
            Actividad Reciente
          </h3>

          {recentLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 font-medium">
              Aún no se han registrado eventos de auditoría interna.
            </div>
          ) : (
            <div className="space-y-4">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-xs leading-relaxed">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-slate-800 dark:text-slate-350">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{log.action}</span> - afectó a{" "}
                      <span className="font-medium text-slate-500">{log.entityType}</span> (ID: {log.entityId.slice(0, 8)}...)
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">
                      {new Date(log.createdAt).toLocaleString("es-CL")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
