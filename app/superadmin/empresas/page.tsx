import React from "react";
import { prisma } from "../../../lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
}

export default async function EmpresasListPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q || "";
  const statusFilter = params.status || "";

  // Consultar empresas con filtros aplicados (Requisito 6)
  const companies = await prisma.company.findMany({
    where: {
      AND: [
        q ? { name: { contains: q, mode: "insensitive" } } : {},
        statusFilter === "ACTIVE" ? { isActive: true } : {},
        statusFilter === "SUSPENDED" ? { isActive: false } : {},
      ]
    },
    orderBy: { createdAt: "desc" },
    include: {
      users: {
        where: { role: "COMPANY_OWNER" },
        take: 1
      },
      _count: {
        select: { cards: true }
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Gestión de Empresas
          </h1>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            Listar, buscar, activar/suspender y gestionar capacidad de inquilinos.
          </p>
        </div>
        <Link
          href="/superadmin/empresas/nueva"
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md transition-all text-center inline-block cursor-pointer"
        >
          ➕ Registrar Empresa
        </Link>
      </div>

      {/* Barra de Filtros */}
      <form method="GET" className="bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar empresa por nombre..."
          className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-slate-300"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activas</option>
          <option value="SUSPENDED">Suspendidas</option>
        </select>
        <button
          type="submit"
          className="bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
        >
          Filtrar
        </button>
        {(q || statusFilter) && (
          <Link
            href="/superadmin/empresas"
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold px-5 py-2.5 rounded-xl transition-all text-center flex items-center justify-center"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Listado */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-150 dark:border-white/5 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                <th className="px-5 py-3.5 text-[9px]">Empresa</th>
                <th className="px-5 py-3.5 text-[9px]">Estado</th>
                <th className="px-5 py-3.5 text-[9px]">Plan</th>
                <th className="px-5 py-3.5 text-[9px]">Identidades (Uso/Límite)</th>
                <th className="px-5 py-3.5 text-[9px]">Admin Principal</th>
                <th className="px-5 py-3.5 text-[9px]">Fecha Registro</th>
                <th className="px-5 py-3.5 text-[9px] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-white/5">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                    No se encontraron empresas con los criterios ingresados.
                  </td>
                </tr>
              ) : (
                companies.map((comp) => {
                  const ownerUser = comp.users[0];
                  const overLimit = comp._count.cards > comp.maxIdentities;
                  return (
                    <tr
                      key={comp.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 text-slate-700 dark:text-slate-300"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          <Link href={`/superadmin/empresas/${comp.id}`} className="hover:underline text-blue-600 dark:text-blue-400">
                            {comp.name}
                          </Link>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">/{comp.slug}</span>
                      </td>
                      <td className="px-5 py-3.5">
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
                      <td className="px-5 py-3.5 font-semibold text-[10px] uppercase">
                        {comp.plan}
                      </td>
                      <td className="px-5 py-3.5 font-medium">
                        <div className="flex items-center gap-2">
                          <span>
                            {comp._count.cards} / {comp.maxIdentities}
                          </span>
                          {overLimit && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[7px] font-black uppercase">
                              Excedido
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {ownerUser ? (
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{ownerUser.name}</div>
                            <span className="text-[10px] text-slate-400 block">{ownerUser.email}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No asignado</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">
                        {new Date(comp.createdAt).toLocaleDateString("es-CL")}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/superadmin/empresas/${comp.id}`}
                          className="inline-flex px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-350 text-[10px] font-extrabold transition-all"
                        >
                          Editar / Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
