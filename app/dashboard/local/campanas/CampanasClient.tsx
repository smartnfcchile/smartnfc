"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { archiveLocalCampaignAction } from "../actions";

type LocalCampaignRecord = {
  id: string;
  name: string;
  slug: string;
  status: string;
  template: string;
  updatedAt: Date;
};

type CampanasClientProps = {
  initialCampaigns: LocalCampaignRecord[];
};

export default function CampanasClient({ initialCampaigns }: CampanasClientProps) {
  const [campaigns, setCampaigns] = useState<LocalCampaignRecord[]>(initialCampaigns);
  const [isPending, startTransition] = useTransition();

  const handleArchive = async (campaignId: string, campaignName: string) => {
    const confirmArchive = window.confirm(
      `¿Estás seguro de que deseas archivar la campaña "${campaignName}"?\n\nLa campaña dejará de estar disponible públicamente para tus clientes.`
    );

    if (!confirmArchive) return;

    startTransition(async () => {
      try {
        const res = await archiveLocalCampaignAction(campaignId);
        if (res.success) {
          setCampaigns(prev =>
            prev.map(c => (c.id === campaignId ? { ...c, status: "ARCHIVED" } : c))
          );
          alert(`Campaña "${campaignName}" archivada correctamente.`);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "No se pudo archivar la campaña.";
        alert(errorMsg);
      }
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Botón superior de creación */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <div>
          <span className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider block">Total Campañas</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white">{campaigns.length}</span>
        </div>
        <Link
          href="/dashboard/local/campanas/nueva"
          className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition active:scale-95 shadow-md shadow-blue-600/20 cursor-pointer"
        >
          ➕ Registrar Nueva Campaña
        </Link>
      </div>

      {/* Tabla del listado */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 font-black">
                <th className="py-3.5 px-4">Campaña</th>
                <th className="py-3.5 px-4">Enlace del Club</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-center">Plantilla</th>
                <th className="py-3.5 px-4 text-right">Última Modificación</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs font-semibold">
                    No se encontraron campañas. Haz clic en "Registrar Nueva Campaña" para empezar.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => {
                  let statusLabel = "Borrador";
                  let statusClass = "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300";
                  if (c.status === "PUBLISHED") {
                    statusLabel = "Publicada";
                    statusClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400";
                  } else if (c.status === "PAUSED") {
                    statusLabel = "Pausada";
                    statusClass = "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300";
                  } else if (c.status === "ARCHIVED") {
                    statusLabel = "Archivada";
                    statusClass = "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400";
                  }

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-950/40 transition">
                      <td className="py-4 px-4 font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                        {c.name}
                      </td>
                      <td className="py-4 px-4 text-slate-700 dark:text-slate-300 font-medium font-mono text-xs">
                        /club/{c.slug}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                        {c.template}
                      </td>
                      <td className="py-4 px-4 text-right text-xs text-slate-600 dark:text-slate-400 font-medium font-mono">
                        {new Date(c.updatedAt).toLocaleDateString("es-CL")} {new Date(c.updatedAt).toLocaleTimeString("es-CL", { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/dashboard/local/campanas/${c.id}`}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 transition cursor-pointer"
                          >
                            📝 Editar
                          </Link>
                          {c.status !== "ARCHIVED" && (
                            <button
                              disabled={isPending}
                              onClick={() => handleArchive(c.id, c.name)}
                              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold py-1.5 px-3 rounded-lg border border-rose-500/30 transition active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                              📦 Archivar
                            </button>
                          )}
                        </div>
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
