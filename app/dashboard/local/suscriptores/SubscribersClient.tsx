"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createBroadcastExportBatchAction,
  confirmBroadcastExportBatchAction,
  cancelBroadcastExportBatchAction,
  registerSubscriberOptOutAction,
  blockSubscriberAction,
  confirmBroadcastRemovalAction
} from "../actions";

interface Subscriber {
  id: string;
  name: string;
  whatsapp: string;
  status: string;
  createdAt: string;
  firstSubscribedAt: string;
  lastSubscribedAt: string | null;
  campaign: {
    id: string;
    name: string;
  };
  consentRecords: Array<{
    id: string;
    acceptedAt: string;
  }>;
  exportItems: Array<{
    id: string;
    batchId: string;
    consentRecordId: string;
    batch: {
      id: string;
      status: string;
    };
  }>;
}

interface Batch {
  id: string;
  createdAt: string;
  status: string;
  campaignId: string | null;
  campaign: {
    name: string;
  } | null;
  createdByUser: {
    name: string;
  } | null;
  items: Array<{
    id: string;
    subscriber: {
      name: string;
      whatsapp: string;
    };
  }>;
}

interface Removal {
  id: string;
  createdAt: string;
  reason: string;
  completedAt: string | null;
  subscriber: {
    id: string;
    name: string;
    whatsapp: string;
    campaign: {
      name: string;
    };
  };
}

interface SubscribersClientProps {
  initialSubscribers: Subscriber[];
  initialBatches: Batch[];
  initialRemovals: Removal[];
  campaigns: Array<{ id: string; name: string }>;
}

function maskWhatsApp(phone: string) {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d]/g, "");
  if (cleaned.length < 6) return "****";
  return `+${cleaned.substring(0, cleaned.length - 4)} ****`;
}

// Helper para calcular el rango de hoy en Santiago de Chile
function getChileTodayRange() {
  const now = new Date();
  const chileStr = now.toLocaleString("en-US", { timeZone: "America/Santiago" });
  const chileDate = new Date(chileStr);
  
  const start = new Date(chileStr);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(chileStr);
  end.setHours(23, 59, 59, 999);
  
  const diffMs = chileDate.getTime() - now.getTime();
  const startUTC = new Date(start.getTime() - diffMs);
  const endUTC = new Date(end.getTime() - diffMs);
  
  return { start: startUTC, end: endUTC };
}

export default function SubscribersClient({
  initialSubscribers,
  initialBatches,
  initialRemovals,
  campaigns
}: SubscribersClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"nuevos" | "pendientes" | "lotes" | "incorporados" | "bajas" | "todos">("nuevos");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("TODAS");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Rangos de Chile hoy para "Nuevos de hoy"
  const { start: chileTodayStart, end: chileTodayEnd } = getChileTodayRange();

  // 1. Filtrar suscriptores de hoy
  const nuevosDeHoy = initialSubscribers.filter(sub => {
    const regDate = new Date(sub.firstSubscribedAt || sub.createdAt);
    return regDate >= chileTodayStart && regDate <= chileTodayEnd;
  });

  // 2. Filtrar pendientes de incorporar
  // ACTIVE y cuyo último consentimiento no esté en ningún lote CONFIRMED
  const pendientesDeIncorporar = initialSubscribers.filter(sub => {
    if (sub.status !== "ACTIVE") return false;
    const latestConsent = sub.consentRecords[0];
    if (!latestConsent) return false;
    const isConfirmed = sub.exportItems.some(item => 
      item.consentRecordId === latestConsent.id && 
      item.batch.status === "CONFIRMED"
    );
    return !isConfirmed;
  });

  // 3. Filtrar incorporados
  // ACTIVE y cuyo último consentimiento ya está en algún lote CONFIRMED
  const incorporados = initialSubscribers.filter(sub => {
    if (sub.status !== "ACTIVE") return false;
    const latestConsent = sub.consentRecords[0];
    if (!latestConsent) return false;
    return sub.exportItems.some(item => 
      item.consentRecordId === latestConsent.id && 
      item.batch.status === "CONFIRMED"
    );
  });

  // Acciones de Lotes
  const handleCreateBatch = async () => {
    setIsSubmitting(true);
    setActionMessage(null);
    try {
      const campId = selectedCampaignId === "TODAS" ? undefined : selectedCampaignId;
      const res = await createBroadcastExportBatchAction(campId);
      if (res.success && res.batchId) {
        setActionMessage({
          type: "success",
          text: res.alreadyActive 
            ? "Se ha detectado un lote EXPORTADO activo para este alcance. Redirigiendo a descargas." 
            : "Lote de exportación generado exitosamente."
        });
        
        // Iniciar descarga del VCF automáticamente
        window.location.href = `/api/local/broadcast-exports/${res.batchId}`;
        
        // Cambiar a pestaña de lotes
        setActiveTab("lotes");
        router.refresh();
      } else {
        setActionMessage({ type: "error", text: res.error || "No se pudo crear el lote de exportación." });
      }
    } catch (err) {
      setActionMessage({ type: "error", text: "Error inesperado al generar el lote." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmBatch = async (batchId: string) => {
    setIsSubmitting(true);
    setActionMessage(null);
    try {
      const res = await confirmBroadcastExportBatchAction(batchId);
      if (res.success) {
        setActionMessage({ type: "success", text: "Incorporación confirmada. Lote cerrado." });
        router.refresh();
      } else {
        setActionMessage({ type: "error", text: res.error || "Error al confirmar lote." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Error inesperado al confirmar." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBatch = async (batchId: string) => {
    if (!confirm("¿Está seguro de que desea cancelar este lote? Los contactos volverán a aparecer como pendientes de incorporar.")) return;
    setIsSubmitting(true);
    setActionMessage(null);
    try {
      const res = await cancelBroadcastExportBatchAction(batchId);
      if (res.success) {
        setActionMessage({ type: "success", text: "Lote cancelado correctamente." });
        router.refresh();
      } else {
        setActionMessage({ type: "error", text: res.error || "Error al cancelar." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Error inesperado al cancelar." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Acciones de Suscriptores
  const handleOptOut = async (subId: string) => {
    if (!confirm("¿Registrar solicitud de baja para este suscriptor?")) return;
    setIsSubmitting(true);
    setActionMessage(null);
    try {
      const res = await registerSubscriberOptOutAction(subId);
      if (res.success) {
        setActionMessage({ type: "success", text: "Baja registrada con éxito." });
        router.refresh();
      } else {
        setActionMessage({ type: "error", text: res.error || "Error al registrar la baja." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Error de red o permisos." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlock = async (subId: string) => {
    if (!confirm("¿Bloquear permanentemente a este suscriptor? No podrá volver a registrarse.")) return;
    setIsSubmitting(true);
    setActionMessage(null);
    try {
      const res = await blockSubscriberAction(subId);
      if (res.success) {
        setActionMessage({ type: "success", text: "Suscriptor bloqueado administrativamente." });
        router.refresh();
      } else {
        setActionMessage({ type: "error", text: res.error || "Error al bloquear." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Error de red." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Acciones de Remociones
  const handleConfirmRemoval = async (removalId: string) => {
    setIsSubmitting(true);
    setActionMessage(null);
    try {
      const res = await confirmBroadcastRemovalAction(removalId);
      if (res.success) {
        setActionMessage({ type: "success", text: "Remoción física de la lista confirmada." });
        router.refresh();
      } else {
        setActionMessage({ type: "error", text: res.error || "Error al completar la remoción." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Error inesperado." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtros aplicados a las listas
  const applyFilters = <T extends { name?: string; campaign?: { id: string } | null; subscriber?: { name: string } }>(items: T[]): T[] => {
    return items.filter(item => {
      // Filtrar por campaña
      if (selectedCampaignId !== "TODAS") {
        const itemCampId = item.campaign?.id || (item as any).subscriber?.campaign?.id;
        if (itemCampId !== selectedCampaignId) return false;
      }
      // Filtrar por buscador
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const itemName = (item.name || (item as any).subscriber?.name || "").toLowerCase();
        if (!itemName.includes(query)) return false;
      }
      return true;
    });
  };

  const currentTabSubscribers = (() => {
    switch (activeTab) {
      case "nuevos": return applyFilters(nuevosDeHoy);
      case "pendientes": return applyFilters(pendientesDeIncorporar);
      case "incorporados": return applyFilters(incorporados);
      case "todos": return applyFilters(initialSubscribers);
      default: return [];
    }
  })();

  const currentTabBatches = activeTab === "lotes" 
    ? initialBatches.filter(b => selectedCampaignId === "TODAS" || b.campaignId === selectedCampaignId)
    : [];

  const currentTabRemovals = activeTab === "bajas"
    ? applyFilters(initialRemovals)
    : [];

  return (
    <div className="space-y-6">
      
      {/* Mensajes de feedback */}
      {actionMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
          actionMessage.type === "success" 
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" 
            : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
        }`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="hover:opacity-60 text-sm">✕</button>
        </div>
      )}

      {/* Selector de campaña y buscador */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto">
          <div className="w-full sm:w-64">
            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Filtrar por Campaña</label>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="TODAS">Todas las campañas</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-64">
            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Buscar por Nombre</label>
            <input
              type="text"
              placeholder="Ej: Ariel Jara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
        </div>

        {activeTab === "pendientes" && (
          <div className="w-full md:w-auto self-end md:self-center">
            <button
              onClick={handleCreateBatch}
              disabled={isSubmitting || pendientesDeIncorporar.length === 0}
              className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>Generando...</>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  Exportar Lote VCF ({pendientesDeIncorporar.length})
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Tabs navegables premium */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex overflow-x-auto gap-2 no-scrollbar pb-1">
        {[
          { id: "nuevos", label: "Nuevos de hoy", count: nuevosDeHoy.length },
          { id: "pendientes", label: "Pendientes", count: pendientesDeIncorporar.length },
          { id: "lotes", label: "Lotes de Exportación", count: initialBatches.length },
          { id: "incorporados", label: "Incorporados", count: incorporados.length },
          { id: "bajas", label: "Bajas Pendientes", count: initialRemovals.length },
          { id: "todos", label: "Todos", count: initialSubscribers.length }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider border-b-2 transition whitespace-nowrap ${
                isActive
                  ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/50"
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                isActive ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Contenedor de Listas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm overflow-hidden">
        
        {/* VISTAS DE TABLA: SUSCRIPTORES */}
        {["nuevos", "pendientes", "incorporados", "todos"].includes(activeTab) && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-950">
                  <th className="py-3.5 px-4">Suscriptor</th>
                  <th className="py-3.5 px-4">WhatsApp</th>
                  <th className="py-3.5 px-4">Campaña</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4">Última Inscripción</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {currentTabSubscribers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400 italic">
                      No se encontraron registros en esta lista.
                    </td>
                  </tr>
                ) : (
                  currentTabSubscribers.map((sub) => {
                    let statusBadge = "Activo";
                    let statusClass = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30";
                    if (sub.status === "BLOCKED") {
                      statusBadge = "Bloqueado";
                      statusClass = "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30";
                    } else if (sub.status === "OPTED_OUT") {
                      statusBadge = "Baja";
                      statusClass = "bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30";
                    }

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{sub.name}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                          {maskWhatsApp(sub.whatsapp)}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-400">{sub.campaign.name}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase ${statusClass}`}>
                            {statusBadge}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {new Date(sub.lastSubscribedAt || sub.createdAt).toLocaleDateString("es-CL", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          {sub.status === "ACTIVE" && (
                            <button
                              onClick={() => handleOptOut(sub.id)}
                              disabled={isSubmitting}
                              className="text-[10px] font-black uppercase bg-slate-100 hover:bg-amber-100 hover:text-amber-800 dark:bg-slate-800 dark:hover:bg-amber-950/40 dark:hover:text-amber-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition"
                            >
                              Dar de Baja
                            </button>
                          )}
                          {sub.status !== "BLOCKED" && (
                            <button
                              onClick={() => handleBlock(sub.id)}
                              disabled={isSubmitting}
                              className="text-[10px] font-black uppercase bg-slate-100 hover:bg-rose-100 hover:text-rose-800 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition"
                            >
                              Bloquear
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VISTAS DE TABLA: LOTES */}
        {activeTab === "lotes" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-950">
                  <th className="py-3.5 px-4">Lote ID</th>
                  <th className="py-3.5 px-4">Fecha Creación</th>
                  <th className="py-3.5 px-4">Creado por</th>
                  <th className="py-3.5 px-4">Campaña</th>
                  <th className="py-3.5 px-4">Suscriptores</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {currentTabBatches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400 italic">
                      No hay lotes de exportación históricos creados.
                    </td>
                  </tr>
                ) : (
                  currentTabBatches.map((batch) => {
                    let statusBadge = "Exportado";
                    let statusClass = "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30";
                    if (batch.status === "CONFIRMED") {
                      statusBadge = "Confirmado";
                      statusClass = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30";
                    } else if (batch.status === "CANCELLED") {
                      statusBadge = "Cancelado";
                      statusClass = "bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/30";
                    }

                    return (
                      <tr key={batch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {batch.id.substring(0, 8)}...
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {new Date(batch.createdAt).toLocaleString("es-CL")}
                        </td>
                        <td className="py-3.5 px-4 font-medium">{batch.createdByUser?.name || "Sistema"}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                          {batch.campaign?.name || "Todas las campañas"}
                        </td>
                        <td className="py-3.5 px-4 font-bold">{batch.items.length}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase ${statusClass}`}>
                            {statusBadge}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <a
                            href={`/api/local/broadcast-exports/${batch.id}`}
                            className="inline-block text-[10px] font-black uppercase bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg border border-transparent transition"
                          >
                            Descargar VCF
                          </a>
                          {batch.status === "EXPORTED" && (
                            <>
                              <button
                                onClick={() => handleConfirmBatch(batch.id)}
                                disabled={isSubmitting}
                                className="text-[10px] font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg border border-transparent transition"
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={() => handleCancelBatch(batch.id)}
                                disabled={isSubmitting}
                                className="text-[10px] font-black uppercase bg-slate-100 hover:bg-rose-100 hover:text-rose-800 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VISTAS DE TABLA: BAJAS PENDIENTES */}
        {activeTab === "bajas" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-950">
                  <th className="py-3.5 px-4">Suscriptor</th>
                  <th className="py-3.5 px-4">WhatsApp</th>
                  <th className="py-3.5 px-4">Campaña</th>
                  <th className="py-3.5 px-4">Motivo</th>
                  <th className="py-3.5 px-4">Fecha Solicitud</th>
                  <th className="py-3.5 px-4 text-right">Acción Requerida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {currentTabRemovals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400 italic">
                      No hay solicitudes de baja pendientes de retirar del teléfono.
                    </td>
                  </tr>
                ) : (
                  currentTabRemovals.map((rem) => {
                    const isCompleted = rem.completedAt !== null;
                    return (
                      <tr key={rem.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {rem.subscriber.name}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                          {maskWhatsApp(rem.subscriber.whatsapp)}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                          {rem.subscriber.campaign.name}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase ${
                            rem.reason === "BLOCKED" 
                              ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20" 
                              : "bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/20"
                          }`}>
                            {rem.reason === "BLOCKED" ? "Bloqueo" : "Baja Voluntaria"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {new Date(rem.createdAt).toLocaleString("es-CL")}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isCompleted ? (
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                              ✓ Retirado del teléfono
                            </span>
                          ) : (
                            <button
                              onClick={() => handleConfirmRemoval(rem.id)}
                              disabled={isSubmitting}
                              className="text-[10px] font-black uppercase bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-lg border border-transparent transition shadow-sm"
                            >
                              Eliminado de Lista (WhatsApp)
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
