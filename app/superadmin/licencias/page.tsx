import React from "react";
import { prisma } from "../../../lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SuperadminLicenciasPage() {
  // Consultar todas las empresas con conteo de identidades creadas (Requisito 9)
  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { cards: true }
      }
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Administración de Licencias
        </h1>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          Control de consumo, límites contratados y sobreuso de Identidades Activas por empresa.
        </p>
      </div>

      {/* Listado de Licencias */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-150 dark:border-white/5 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                <th className="px-5 py-3.5 text-[9px]">Empresa</th>
                <th className="px-5 py-3.5 text-[9px]">Estado Contrato</th>
                <th className="px-5 py-3.5 text-[9px]">Capacidad Contratada</th>
                <th className="px-5 py-3.5 text-[9px]">Identidades Utilizadas</th>
                <th className="px-5 py-3.5 text-[9px]">Sobreuso</th>
                <th className="px-5 py-3.5 text-[9px]">Alertas Capacidad</th>
                <th className="px-5 py-3.5 text-[9px] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-white/5">
              {companies.map((comp) => {
                const used = comp._count.cards;
                const limit = comp.maxIdentities;
                const additional = Math.max(used - limit, 0);

                // Determinar el badge de alertas (Requisito 9)
                let statusBadge = {
                  text: "Dentro del límite",
                  className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                };

                if (!comp.isActive) {
                  statusBadge = {
                    text: "Suspendida",
                    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  };
                } else if (used > limit) {
                  statusBadge = {
                    text: "Sobre el límite",
                    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  };
                } else if (used === limit || used === limit - 1) {
                  statusBadge = {
                    text: "Cerca del límite",
                    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  };
                }

                return (
                  <tr
                    key={comp.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 text-slate-700 dark:text-slate-350"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{comp.name}</div>
                      <span className="text-[10px] text-slate-400 font-mono">/{comp.slug}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[9px] px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5">
                        {comp.licenseStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold">{limit}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200">{used}</td>
                    <td className="px-5 py-3.5">
                      {additional > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          +{additional}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">0</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase leading-none ${statusBadge.className}`}
                      >
                        {statusBadge.text}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium">
                      <Link
                        href={`/superadmin/empresas/${comp.id}`}
                        className="inline-flex px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-350 text-[10px] font-extrabold transition-all"
                      >
                        Ajustar Licencia
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
