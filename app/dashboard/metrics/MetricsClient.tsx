"use client";

import React, { useState } from "react";
import Link from "next/link";

type MetricDetail = {
  id: string;
  cardName: string;
  name: string;
  email: string | null;
  phone: string | null;
  device: string;
  date: string;
};

type MetricsClientProps = {
  initialData: {
    totalVisitas: number;
    totalNfcScans: number;
    tasaConversion: number;
    visitantesUnicos: number;
    totalLeads: number;
    totalWhatsapp: number;
    totalContactos: number;
    totalEmails: number;
    totalPhones: number;
    conversacionesGeneradas: number;
    tasaContacto: number;
    topCards: any[];
    cardsRanking: any[];
    deviceRanking: any[];
  };
  isAdmin: boolean;
};

export default function MetricsClient({ initialData, isAdmin }: MetricsClientProps) {
  const {
    totalVisitas,
    totalNfcScans,
    tasaConversion,
    visitantesUnicos,
    totalLeads,
    totalWhatsapp,
    totalContactos,
    conversacionesGeneradas,
    tasaContacto,
    topCards,
    cardsRanking,
    deviceRanking,
  } = initialData;

  // Estados del modal de interacción
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<MetricDetail[]>([]);
  const [error, setError] = useState("");

  const handleMetricClick = async (type: string, title: string) => {
    // Si la métrica es Leads, podemos redirigir directamente a la pestaña de CRM / Prospectos
    if (type === "lead") {
      window.location.href = "/dashboard/leads";
      return;
    }

    setModalTitle(title);
    setModalOpen(true);
    setLoading(true);
    setError("");
    setDetails([]);

    try {
      const res = await fetch(`/api/metrics/details?type=${type}`);
      const json = await res.json();
      if (json.success) {
        setDetails(json.data);
      } else {
        setError(json.error || "No se pudieron obtener los detalles.");
      }
    } catch (err) {
      setError("Error de red al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const metricCards = [
    {
      type: "view",
      title: "Visitas Totales",
      value: totalVisitas,
      icon: "👁️",
      colorClass: "bg-blue-500/10 border-blue-500/20 text-blue-400",
      description: "Clic para ver quiénes visitaron las tarjetas",
    },
    {
      type: "nfc",
      title: "Lecturas NFC",
      value: totalNfcScans,
      icon: "⚡",
      colorClass: "bg-orange-500/10 border-orange-500/20 text-orange-400",
      description: "Clic para ver escaneos físicos de tarjetas",
    },
    {
      type: "lead",
      title: "Leads Capturados",
      value: totalLeads,
      icon: "💰",
      colorClass: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
      description: "Ver todos los leads en la pestaña CRM",
    },
    {
      type: "whatsapp",
      title: "Clics WhatsApp",
      value: totalWhatsapp,
      icon: "💬",
      colorClass: "bg-green-500/10 border-green-500/20 text-green-400",
      description: "Clic para ver quiénes abrieron WhatsApp",
    },
    {
      type: "vcard",
      title: "Contactos Guardados",
      value: totalContactos,
      icon: "📥",
      colorClass: "bg-amber-500/10 border-amber-500/20 text-amber-400",
      description: "Clic para ver descargas de tarjeta de contacto",
    },
    {
      type: "conversiones",
      title: "Conversión",
      value: `${tasaConversion}%`,
      icon: "🎯",
      colorClass: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
      description: "Tasa de interacción por visita (No clickable)",
      disabled: true,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Grilla de Tarjetas Interactivas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricCards.map((card) => {
          const isClickable = !card.disabled && card.value !== 0 && card.value !== "0%";
          return (
            <button
              key={card.title}
              disabled={!isClickable}
              onClick={() => handleMetricClick(card.type, card.title)}
              className={`bg-slate-900/40 p-6 rounded-2xl border border-slate-900 text-left flex flex-col justify-between shadow-sm select-none ${
                isClickable
                  ? "hover:border-slate-800 hover:bg-slate-900 transition-all cursor-pointer group active:scale-[0.99]"
                  : "cursor-default opacity-85"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${card.colorClass}`}>
                    <span className="text-xl">{card.icon}</span>
                  </div>
                  <h3 className="text-slate-400 font-bold text-sm tracking-wide">{card.title}</h3>
                </div>
                {isClickable && (
                  <span className="text-xs font-semibold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                    Detalle 🔍
                  </span>
                )}
              </div>
              <div className="mt-4">
                <p className="text-3xl sm:text-4xl font-black text-white">{card.value}</p>
                <p className="text-[10px] text-slate-500 mt-1 font-medium italic">
                  {card.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Secciones de Dashboard Secundarias */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Tabla Global de Tarjetas (Rank) */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 lg:col-span-2 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-200">Rendimiento por Tarjeta</h2>
            <p className="text-xs text-slate-500">Métricas analíticas desglosadas por perfil virtual.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-950/40 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-850">
                <tr>
                  <th className="py-3 px-4 font-bold text-center">Rank</th>
                  <th className="py-3 px-4 font-bold">Tarjeta</th>
                  <th className="py-3 px-4 font-bold text-center">Visitas (NFC)</th>
                  <th className="py-3 px-4 font-bold text-center">WSP</th>
                  <th className="py-3 px-4 font-bold text-center">Leads</th>
                  <th className="py-3 px-4 font-bold text-center">Conv.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50">
                {cardsRanking.map((card: any, index: number) => (
                  <tr key={card.id} className="hover:bg-slate-900/20">
                    <td className="py-3 px-4 text-center text-base">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}°`}
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-semibold">{card.name}</td>
                    <td className="py-3 px-4 text-center text-slate-400">
                      {card.visitas} <span className="text-[10px] text-orange-400 font-bold ml-0.5">(⚡{card.nfcScans})</span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-400">{card.whatsapp}</td>
                    <td className="py-3 px-4 text-center text-slate-400 font-medium">{card.leads}</td>
                    <td className="py-3 px-4 text-center text-blue-400 font-bold">{card.conversion}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Análisis de Dispositivos */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-200">Dispositivos</h2>
            <p className="text-xs text-slate-500">Sistemas operativos de los clientes.</p>
          </div>
          <div className="space-y-3">
            {deviceRanking.length === 0 ? (
              <p className="text-slate-500 text-xs italic py-4 text-center">Sin interacciones registradas</p>
            ) : (
              deviceRanking.map((device) => {
                const percentage = totalVisitas > 0 ? Math.round((device.count / totalVisitas) * 100) : 0;
                return (
                  <div key={device.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                      <span>{device.name}</span>
                      <span>
                        {device.count} <span className="text-[10px] text-slate-500 ml-1">({percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* MODAL INTERACTIVO DE DETALLES */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col z-10 shadow-2xl relative">
            
            {/* Cabecera del Modal */}
            <div className="p-6 border-b border-slate-850 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-extrabold text-white">Detalle de {modalTitle}</h3>
                <p className="text-xs text-slate-500">Últimos registros de interacciones mapeados por IP.</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 overflow-y-auto flex-1 min-h-[250px]">
              {loading ? (
                <div className="space-y-4 py-8">
                  <div className="h-6 bg-slate-850 rounded-lg animate-pulse w-3/4" />
                  <div className="h-10 bg-slate-850 rounded-lg animate-pulse" />
                  <div className="h-10 bg-slate-850 rounded-lg animate-pulse" />
                  <div className="h-10 bg-slate-850 rounded-lg animate-pulse" />
                </div>
              ) : error ? (
                <div className="text-center py-12 space-y-3">
                  <span className="text-3xl">⚠️</span>
                  <p className="text-red-400 text-sm font-semibold">{error}</p>
                </div>
              ) : details.length === 0 ? (
                <div className="text-center py-16 text-slate-500 space-y-2">
                  <span className="text-3xl block">🔍</span>
                  <p className="text-xs italic">No hay interacciones registradas para este tipo en este periodo.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-950/60 text-slate-400 uppercase text-[9px] tracking-widest border-b border-slate-850">
                      <tr>
                        <th className="py-2.5 px-4">Tarjeta</th>
                        <th className="py-2.5 px-4">Usuario / Contacto</th>
                        <th className="py-2.5 px-4">Dispositivo</th>
                        <th className="py-2.5 px-4 text-right">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/50 text-slate-300">
                      {details.map((item) => {
                        const isRegistered = item.name !== "Visitante Anónimo";
                        return (
                          <tr key={item.id} className="hover:bg-slate-850/30">
                            <td className="py-3 px-4 font-medium text-slate-400">{item.cardName}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`font-semibold ${
                                  isRegistered ? "text-emerald-400" : "text-slate-300"
                                }`}
                              >
                                {item.name}
                              </span>
                              {isRegistered && (
                                <div className="text-[10px] text-slate-500 mt-0.5 space-y-0.5">
                                  {item.email && <div className="truncate">📧 {item.email}</div>}
                                  {item.phone && <div>📞 {item.phone}</div>}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs font-mono text-slate-400">{item.device}</td>
                            <td className="py-3 px-4 text-right text-xs text-slate-500">
                              {new Date(item.date).toLocaleDateString("es-CL", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pie del Modal */}
            <div className="p-4 border-t border-slate-850 bg-slate-950/20 flex justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-750 text-white font-semibold py-2 px-4 rounded-xl text-xs transition"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
