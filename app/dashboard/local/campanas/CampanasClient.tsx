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
          // Actualizar estado local
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
      <div className="flex justify-between items-center bg-slate-900/40 border border-slate-800 p-4 rounded-2xl">
        <div>
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Campañas</span>
          <span className="text-2xl font-black text-white">{campaigns.length}</span>
        </div>
        <Link
          href="/dashboard/local/campanas/nueva"
          className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition active:scale-95 shadow-md shadow-blue-600/10 cursor-pointer"
        >
          ➕ Registrar Nueva Campaña
        </Link>
      </div>

      {/* Tabla del listado */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-450 bg-slate-950/20 font-black">
                <th className="py-3.5 px-4">Campaña</th>
                <th className="py-3.5 px-4">Enlace del Club</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                <th className="py-3.5 px-4 text-center">Plantilla</th>
                <th className="py-3.5 px-4 text-right">Última Modificación</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/30">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs font-semibold">
                    No se encontraron campañas. Haz clic en "Registrar Nueva Campaña" para empezar.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => {
                  let statusLabel = "Borrador";
                  let statusClass = "bg-slate-500/10 border-slate-500/30 text-slate-400";
                  if (c.status === "PUBLISHED") {
                    statusLabel = "Publicada";
                    statusClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
                  } else if (c.status === "PAUSED") {
                    statusLabel = "Pausada";
                    statusClass = "bg-amber-500/10 border-amber-500/30 text-amber-400";
                  } else if (c.status === "ARCHIVED") {
                    statusLabel = "Archivada";
                    statusClass = "bg-rose-500/10 border-rose-500/30 text-rose-400";
                  }

                  return (
                    <tr key={c.id} className="hover:bg-slate-900/20">
                      <td className="py-4 px-4 font-bold text-white text-sm sm:text-base">
                        {c.name}
                      </td>
                      <td className="py-4 px-4 text-slate-300 font-medium font-mono text-xs">
                        /club/{c.slug}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[9px] font-bold ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center text-xs font-bold text-slate-400 uppercase">
                        {c.template}
                      </td>
                      <td className="py-4 px-4 text-right text-xs text-slate-500 font-medium font-mono">
                        {new Date(c.updatedAt).toLocaleDateString("es-CL")} {new Date(c.updatedAt).toLocaleTimeString("es-CL", { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/dashboard/local/campanas/${c.id}`}
                            className="bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-700 hover:border-slate-650 transition cursor-pointer"
                          >
                            📝 Editar
                          </Link>
                          {c.status !== "ARCHIVED" && (
                            <button
                              disabled={isPending}
                              onClick={() => handleArchive(c.id, c.name)}
                              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-455 text-xs font-semibold py-1.5 px-3 rounded-lg border border-rose-500/20 hover:border-rose-500/30 transition active:scale-95 cursor-pointer disabled:opacity-50"
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
