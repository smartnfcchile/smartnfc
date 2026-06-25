"use client";

import React, { useState, useTransition } from "react";
import { updateLeadCRM } from "./actions";

type LeadWithCard = {
  id: string;
  name: string;
  company: string | null;
  position: string | null;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  notes: string | null;
  ipHash: string | null;
  cardId: string;
  createdAt: Date;
  card: {
    id: string;
    name: string;
  };
};

type EventRecord = {
  id: string;
  eventType: string;
  ipHash: string | null;
  userAgent: string | null;
  cardId: string;
  createdAt: Date;
};

type LeadsClientProps = {
  initialLeads: LeadWithCard[];
  allEvents: EventRecord[];
  isAdmin: boolean;
};

export default function LeadsClient({ initialLeads, allEvents, isAdmin }: LeadsClientProps) {
  const [leads, setLeads] = useState<LeadWithCard[]>(initialLeads);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [selectedLead, setSelectedLead] = useState<LeadWithCard | null>(null);

  // Estados de edición del Lead seleccionado
  const [notesInput, setNotesInput] = useState("");
  const [statusInput, setStatusInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSelectLead = (lead: LeadWithCard) => {
    setSelectedLead(lead);
    setNotesInput(lead.notes || "");
    setStatusInput(lead.status);
    setSaveSuccess(false);
  };

  const handleSaveCRM = async () => {
    if (!selectedLead) return;
    
    startTransition(async () => {
      try {
        await updateLeadCRM(selectedLead.id, statusInput, notesInput);
        
        // Actualizamos localmente el estado de la lista
        const updatedLeads = leads.map((l) =>
          l.id === selectedLead.id ? { ...l, status: statusInput, notes: notesInput } : l
        );
        setLeads(updatedLeads);
        
        // Actualizamos el lead seleccionado
        setSelectedLead({ ...selectedLead, status: statusInput, notes: notesInput });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (err: any) {
        alert("Error al guardar: " + err.message);
      }
    });
  };

  // Filtrado de Leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.card.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "TODOS" || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Eventos asociados al Lead seleccionado por ipHash y cardId
  const leadEvents = selectedLead
    ? allEvents.filter(
        (event) => event.ipHash === selectedLead.ipHash && event.cardId === selectedLead.cardId
      )
    : [];

  const getEventLabel = (type: string) => {
    switch (type) {
      case "VIEW":
        return "👁️ Vista de tarjeta";
      case "NFC_SCAN":
        return "⚡ Escaneo NFC";
      case "WHATSAPP_CLICK":
        return "💬 Clic WhatsApp";
      case "PHONE_CLICK":
        return "📞 Clic Teléfono";
      case "EMAIL_CLICK":
        return "📧 Clic Correo";
      case "LINK_CLICK":
        return "🔗 Clic Enlace";
      case "VCARD_DOWNLOAD":
        return "📥 Descarga vCard";
      default:
        return "📍 Interacción";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "NUEVO":
        return "bg-blue-500/10 border-blue-500/30 text-blue-400";
      case "CONTACTADO":
        return "bg-amber-500/10 border-amber-500/30 text-amber-400";
      case "NEGOCIACION":
        return "bg-purple-500/10 border-purple-500/30 text-purple-400";
      case "GANADO":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "PERDIDO":
        return "bg-rose-500/10 border-rose-500/30 text-rose-400";
      default:
        return "bg-slate-500/10 border-slate-500/30 text-slate-400";
    }
  };

  const formatUserAgent = (ua: string | null): string => {
    if (!ua) return "Dispositivo";
    if (ua.includes("Windows")) return "Windows / PC";
    if (ua.includes("Android")) return "Android / Móvil";
    if (ua.includes("iPhone")) return "iPhone / Móvil";
    if (ua.includes("Macintosh")) return "Mac / Safari";
    return "Móvil";
  };

  // Función de Exportación CSV
  const handleExportCSV = () => {
    const csvRows = [];
    // Encabezados
    csvRows.push([
      "Prospecto",
      "Empresa",
      "Cargo",
      "Email",
      "Telefono",
      "Tarjeta",
      "Estado CRM",
      "Notas Seguimiento",
      "Fecha Creacion",
    ].join(";"));

    filteredLeads.forEach((lead) => {
      const row = [
        `"${lead.name.replace(/"/g, '""')}"`,
        `"${(lead.company || "").replace(/"/g, '""')}"`,
        `"${(lead.position || "").replace(/"/g, '""')}"`,
        `"${lead.email}"`,
        `"${lead.phone || ""}"`,
        `"${lead.card.name}"`,
        `"${lead.status}"`,
        `"${(lead.notes || "").replace(/\n/g, " ").replace(/"/g, '""')}"`,
        `"${new Date(lead.createdAt).toLocaleDateString("es-CL")}"`,
      ];
      csvRows.push(row.join(";"));
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `prospectos_smartnfc_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      
      {/* SECCIÓN IZQUIERDA: Filtros y Lista de Leads */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Barra de Filtros */}
        <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-stretch sm:items-center shadow-sm">
          <input
            type="text"
            placeholder="Buscar por nombre, email o tarjeta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-xs sm:text-sm text-white transition-all"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="NUEVO">Nuevos</option>
            <option value="CONTACTADO">Contactados</option>
            <option value="NEGOCIACION">En Negociación</option>
            <option value="GANADO">Ganados (Cerrados)</option>
            <option value="PERDIDO">Perdidos</option>
          </select>
          <button
            onClick={handleExportCSV}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-blue-600/10 active:scale-95 cursor-pointer shrink-0"
          >
            📥 Exportar CSV
          </button>
        </div>

        {/* Tabla / Lista de Prospectos */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden shadow-sm">
          {filteredLeads.length === 0 ? (
            <div className="text-center py-20 text-slate-500 space-y-2">
              <span className="text-4xl block">👤</span>
              <p className="text-xs italic">No se encontraron prospectos que coincidan con la búsqueda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-950/40 text-slate-400 uppercase text-[9px] tracking-widest border-b border-slate-850">
                  <tr>
                    <th className="py-3 px-4">Prospecto</th>
                    <th className="py-3 px-4">Tarjeta Asociada</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Registrado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/30">
                  {filteredLeads.map((lead) => {
                    const isSelected = selectedLead?.id === lead.id;
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => handleSelectLead(lead)}
                        className={`hover:bg-slate-900/40 cursor-pointer transition-colors ${
                          isSelected ? "bg-slate-900/60 border-l-4 border-l-blue-600" : ""
                        }`}
                      >
                        <td className="py-4 px-4">
                          <div className="font-bold text-white text-sm sm:text-base">{lead.name}</div>
                          <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                            {lead.company && (
                              <span>🏢 {lead.company} {lead.position ? `(${lead.position})` : ""}</span>
                            )}
                            <div className="truncate">📧 {lead.email}</div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-400 font-medium text-xs sm:text-sm">
                          {lead.card.name}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${getStatusBadgeClass(
                              lead.status
                            )}`}
                          >
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right text-xs text-slate-500 font-medium">
                          {new Date(lead.createdAt).toLocaleDateString("es-CL")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* SECCIÓN DERECHA: Ficha CRM del Lead */}
      <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 shadow-sm min-h-[400px]">
        {!selectedLead ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-16 space-y-3">
            <span className="text-4xl">🗂️</span>
            <h3 className="font-bold text-slate-400 text-sm">Ficha del Prospecto</h3>
            <p className="text-xs max-w-[200px] leading-relaxed">
              Selecciona un prospecto de la lista para ver su historial, cambiar su estado o escribir notas.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Cabecera Ficha */}
            <div className="border-b border-slate-850 pb-4">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Ficha de CRM</span>
              <h2 className="text-xl font-black text-white truncate mt-1">{selectedLead.name}</h2>
              {selectedLead.company && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedLead.position} en <strong className="text-slate-300">{selectedLead.company}</strong>
                </p>
              )}
            </div>

            {/* Formulario CRM */}
            <div className="space-y-4">
              
              {/* Cambiar Estado */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Estado del Lead
                </label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer font-semibold"
                >
                  <option value="NUEVO">🔵 Nuevo</option>
                  <option value="CONTACTADO">🟡 Contactado</option>
                  <option value="NEGOCIACION">🟣 En Negociación</option>
                  <option value="GANADO">🟢 Ganado (Cliente)</option>
                  <option value="PERDIDO">🔴 Perdido</option>
                </select>
              </div>

              {/* Editar Notas */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Notas de Seguimiento
                </label>
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  rows={4}
                  placeholder="Añade notas del cliente, llamadas, acuerdos..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-300 transition-all resize-none"
                />
              </div>

              {/* Botón Guardar */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleSaveCRM}
                  disabled={isPending}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {isPending ? "Guardando..." : "💾 Guardar Ficha"}
                </button>
                {saveSuccess && (
                  <span className="text-xs text-emerald-400 font-bold animate-pulse">
                    ¡Cambios guardados!
                  </span>
                )}
              </div>

            </div>

            {/* Historial Analítico (Timeline) */}
            <div className="space-y-3 pt-4 border-t border-slate-850">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Línea de Tiempo (Por IP)
              </label>

              {leadEvents.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic py-4">
                  No hay interacciones analíticas anteriores detectadas bajo el mismo dispositivo IP.
                </p>
              ) : (
                <div className="relative border-l border-slate-800 pl-4 space-y-4 ml-1 pt-1">
                  {leadEvents.slice(0, 8).map((event) => (
                    <div key={event.id} className="relative">
                      {/* Círculo indicador */}
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-slate-950" />
                      
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200">
                          {getEventLabel(event.eventType)}
                        </span>
                        <span className="text-[9px] text-slate-500 mt-0.5">
                          {formatUserAgent(event.userAgent)} ·{" "}
                          {new Date(event.createdAt).toLocaleTimeString("es-CL", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
