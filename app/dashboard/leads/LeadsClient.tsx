"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useTransition } from "react";
import { updateLeadCRM } from "./actions";

type LeadInteractionRecord = {
  id: string;
  type: "CONTACT_CAPTURE" | "RE_ENGAGEMENT";
  source: "NFC" | "QR" | "DIRECT" | "UNKNOWN";
  message: string | null;
  consentAccepted: boolean;
  consentText: string | null;
  consentAt: Date | null;
  createdAt: Date;
};

type LeadWithCard = {
  id: string;
  name: string;
  company: string | null;
  position: string | null;
  email: string | null;
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
  interactions: LeadInteractionRecord[];
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

export default function LeadsClient({ initialLeads, allEvents }: LeadsClientProps) {
  const [leads, setLeads] = useState<LeadWithCard[]>(initialLeads);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [selectedLead, setSelectedLead] = useState<LeadWithCard | null>(null);

  // Estados de edición del Lead seleccionado
  const [notesInput, setNotesInput] = useState("");
  const [statusInput, setStatusInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const formatPhoneForDisplay = (phone: string | null): string => {
    if (!phone) return "";
    // Si empieza con 56 y tiene 11 dígitos (Chile internacional normalizado, ej. 56912345678)
    if (phone.startsWith("56") && phone.length === 11) {
      return `+56 9 ${phone.substring(3, 7)} ${phone.substring(7)}`;
    }
    // Si empieza con 9 y tiene 9 dígitos (Chile local)
    if (phone.startsWith("9") && phone.length === 9) {
      return `+56 9 ${phone.substring(1, 5)} ${phone.substring(5)}`;
    }
    // Si ya empieza con +, dejarlo tal cual
    if (phone.startsWith("+")) {
      return phone;
    }
    // En otros casos de números largos sin +, agregar + para presentación segura
    if (phone.length >= 10) {
      return `+${phone}`;
    }
    return phone;
  };

  const getTelUrl = (phone: string): string => {
    const digits = phone.replace(/[^\d]/g, "");
    if (digits.startsWith("56") || (digits.length >= 10 && !phone.startsWith("+"))) {
      return `tel:+${digits}`;
    }
    return `tel:${phone}`;
  };

  const handleCopy = async (text: string, type: "Teléfono" | "Correo") => {
    if (!navigator?.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(`${type} copiado`);
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

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
      (lead.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      case "CONTACT_SHARED":
        return "🤝 Contacto Compartido";
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
        `"${lead.email || ""}"`,
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

  // Escapa caracteres especiales según la especificación vCard (RFC 6350)
  const escapeVCardField = (value: string): string => {
    return value
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  };

  // Función de Exportación vCard (.vcf)
  const handleExportVCard = () => {
    const vCardBlocks = filteredLeads.map((lead) => {
      const name = escapeVCardField(lead.name || "Sin nombre");
      const org = lead.company ? escapeVCardField(lead.company) : "";
      const title = lead.position ? escapeVCardField(lead.position) : "";
      const phone = lead.phone ? lead.phone.replace(/[^\d+]/g, "") : "";

      const noteParts: string[] = [`Tarjeta: ${lead.card.name}`];
      if (lead.notes) noteParts.push(lead.notes);
      const note = escapeVCardField(noteParts.join(" | "));

      const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${name}`, `N:${name};;;;`];

      if (org) lines.push(`ORG:${org}`);
      if (title) lines.push(`TITLE:${title}`);
      if (phone) lines.push(`TEL;TYPE=CELL:${phone}`);
      if (lead.email) lines.push(`EMAIL:${lead.email}`);
      lines.push(`NOTE:${note}`);
      lines.push("END:VCARD");

      return lines.join("\r\n");
    });

    const vCardContent = vCardBlocks.join("\r\n");
    const blob = new Blob([vCardContent], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `prospectos_smartnfc_${Date.now()}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
          <button
            onClick={handleExportVCard}
            title="Descarga todos los prospectos como contactos listos para importar a tu celular"
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-emerald-600/10 active:scale-95 cursor-pointer shrink-0"
          >
            📇 Exportar vCard
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
                            {lead.phone ? (
                              <span>📱 {formatPhoneForDisplay(lead.phone)}</span>
                            ) : lead.email ? (
                              <span className="truncate block">📧 {lead.email}</span>
                            ) : lead.company ? (
                              <span>🏢 {lead.company} {lead.position ? `(${lead.position})` : ""}</span>
                            ) : (
                              <span className="italic text-slate-600">Sin datos de contacto</span>
                            )}
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

            {/* Datos del Prospecto */}
            <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-850 space-y-3.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Datos del Prospecto
                </span>
                {copyFeedback && (
                  <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 animate-pulse">
                    {copyFeedback}
                  </span>
                )}
              </div>

              {/* Teléfono */}
              {selectedLead.phone ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Teléfono:</span>
                    <span className="font-mono text-white font-semibold">
                      {formatPhoneForDisplay(selectedLead.phone)}
                    </span>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <a
                      href={`https://wa.me/${selectedLead.phone.replace(/[^\d]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20 px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      💬 WhatsApp
                    </a>
                    <a
                      href={getTelUrl(selectedLead.phone)}
                      className="bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600/20 px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      📞 Llamar
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopy(formatPhoneForDisplay(selectedLead.phone), "Teléfono")}
                      className="bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 px-2.5 py-1 rounded text-[10px] font-bold transition cursor-pointer"
                    >
                      📋 Copiar
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Correo */}
              {selectedLead.email ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Correo electrónico:</span>
                    <span className="text-white font-semibold truncate max-w-[200px]" title={selectedLead.email}>
                      {selectedLead.email}
                    </span>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <a
                      href={`mailto:${selectedLead.email}`}
                      className="bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600/20 px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      📧 Enviar correo
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedLead.email || "", "Correo")}
                      className="bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 px-2.5 py-1 rounded text-[10px] font-bold transition cursor-pointer"
                    >
                      📋 Copiar
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Si no hay teléfono ni correo */}
              {!selectedLead.phone && !selectedLead.email && (
                <p className="text-slate-500 italic text-center py-1">
                  Sin datos de contacto adicionales
                </p>
              )}

              {/* Mensaje inicial */}
              {selectedLead.message && (
                <div className="border-t border-slate-850/60 pt-2 space-y-1">
                  <span className="text-slate-550 block text-[10px] uppercase font-bold tracking-wider">Mensaje inicial:</span>
                  <p className="text-slate-300 italic bg-slate-950/60 p-2 rounded-lg border border-slate-850/80 leading-5">
                    &quot;{selectedLead.message}&quot;
                  </p>
                </div>
              )}

              {/* Metadatos (Fecha e Identidad) */}
              <div className="border-t border-slate-850/60 pt-2 flex flex-col gap-1 text-[10px] text-slate-500">
                <div className="flex justify-between">
                  <span>Registrado el:</span>
                  <span className="text-slate-400">
                    {new Date(selectedLead.createdAt).toLocaleDateString("es-CL")} a las {new Date(selectedLead.createdAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tarjeta asociada:</span>
                  <span className="text-slate-400 font-medium">{selectedLead.card.name}</span>
                </div>
              </div>
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

            {/* Bitácora de Interacciones de Contacto */}
            <div className="space-y-3 pt-4 border-t border-slate-850">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Bitácora de Prospecto (CRM Histórico)
              </label>

              {selectedLead.interactions && selectedLead.interactions.length > 0 ? (
                <div className="space-y-3">
                  {selectedLead.interactions.map((interaction) => {
                    // Mapeo amigable de orígenes
                    let friendlySource = "Origen no registrado";
                    if (interaction.source === "NFC") friendlySource = "Tarjeta NFC";
                    else if (interaction.source === "QR") friendlySource = "Código QR";
                    else if (interaction.source === "DIRECT") friendlySource = "Enlace directo";

                    return (
                      <div key={interaction.id} className="bg-slate-950/60 rounded-xl p-3 border border-slate-850 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            interaction.type === "CONTACT_CAPTURE"
                              ? "bg-blue-600/10 text-blue-400 border border-blue-600/20"
                              : "bg-purple-600/10 text-purple-400 border border-purple-600/20"
                          }`}>
                            {interaction.type === "CONTACT_CAPTURE" ? "Captura Inicial" : "Re-contacto"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Origen: <strong className="text-slate-200">{friendlySource}</strong>
                          </span>
                        </div>

                        <p className="text-slate-300 font-medium bg-slate-900/40 p-2 rounded-lg border border-slate-800">
                          {interaction.type === "CONTACT_CAPTURE"
                            ? `Datos compartidos desde ${friendlySource}`
                            : `Re-contacto registrado desde ${friendlySource}`}
                          {interaction.message && (
                            <span className="block mt-1 font-normal italic text-slate-400">
                              &quot;{interaction.message}&quot;
                            </span>
                          )}
                        </p>

                        <div className="text-[10px] text-slate-500 space-y-1">
                          <div className="flex items-center gap-1.5 text-emerald-400/90">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Consentimiento Aceptado el {new Date(interaction.createdAt).toLocaleDateString("es-CL")}</span>
                          </div>
                          {interaction.consentText && (
                            <div className="pl-3 border-l border-slate-800 text-[9px] text-slate-550 max-h-12 overflow-y-auto scrollbar-thin">
                              {interaction.consentText}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic py-2">
                  No hay interacciones registradas para este prospecto.
                </p>
              )}
            </div>

            {/* Historial Analítico (Timeline) */}
            <div className="space-y-3 pt-4 border-t border-slate-850">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Línea de Tiempo Analítica (Por IP)
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
