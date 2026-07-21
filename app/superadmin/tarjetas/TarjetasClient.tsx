"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  registerPhysicalCardSuperadminAction,
  assignPhysicalCardSuperadminAction,
  disassociatePhysicalCardSuperadminAction
} from "../actions";

type PhysicalCardItem = {
  id: string;
  token: string;
  uid: string | null;
  status: string;
  batchCode: string | null;
  createdAt: Date;
  companyId: string;
  cardId: string | null;
  localTouchpointId: string | null;
  company: {
    id: string;
    name: string;
    slug: string | null;
  };
  card: {
    id: string;
    slug: string;
    name: string | null;
  } | null;
  localTouchpoint: {
    id: string;
    code: string;
    name: string;
    campaign: {
      id: string;
      name: string;
      slug: string;
    };
  } | null;
};

type CompanyItem = {
  id: string;
  name: string;
  slug: string | null;
};

type TarjetasClientProps = {
  cards: PhysicalCardItem[];
  companies: CompanyItem[];
  originHost: string;
};

export default function TarjetasClient({ cards: initialCards, companies, originHost }: TarjetasClientProps) {
  const [cards, setCards] = useState<PhysicalCardItem[]>(initialCards);
  const [isPending, startTransition] = useTransition();

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [destinationFilter, setDestinationFilter] = useState("");

  // Modal de registro
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newToken, setNewToken] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState(companies[0]?.id || "");
  const [selectedStatus, setSelectedStatus] = useState<any>("ENTREGADA");
  const [batchCode, setBatchCode] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reasignación rápida
  const [reassigningCardId, setReassigningCardId] = useState<string | null>(null);
  const [targetCompanyId, setTargetCompanyId] = useState("");

  // Registrar nueva tarjeta
  const handleRegisterCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedCompanyId) {
      setErrorMsg("Debes seleccionar una empresa propietaria.");
      return;
    }

    startTransition(async () => {
      const res = await registerPhysicalCardSuperadminAction({
        token: newToken || undefined,
        companyId: selectedCompanyId,
        status: selectedStatus,
        batchCode: batchCode || undefined
      });

      if (res.success) {
        setSuccessMsg(`¡Tarjeta registrada con éxito! Token: ${res.token}`);
        setNewToken("");
        setBatchCode("");
        setShowRegisterModal(false);
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(res.error || "Error al registrar la tarjeta física.");
      }
    });
  };

  // Desvincular destino
  const handleDisassociate = async (cardId: string, token: string) => {
    const confirmDisassociate = window.confirm(
      `¿Estás seguro de desvincular el destino de la tarjeta "${token.substring(0, 12)}..."?\n\nLa tarjeta continuará asignada a su empresa pero quedará en estado "Libre" para vincular a otra identidad B2B o punto Local.`
    );
    if (!confirmDisassociate) return;

    startTransition(async () => {
      const res = await disassociatePhysicalCardSuperadminAction(cardId);
      if (res.success) {
        setSuccessMsg("¡Destino desvinculado con éxito!");
        setTimeout(() => setSuccessMsg(null), 3000);
        setCards(prev =>
          prev.map(c => (c.id === cardId ? { ...c, cardId: null, localTouchpointId: null, card: null, localTouchpoint: null } : c))
        );
      } else {
        setErrorMsg(res.error || "Error al desvincular la tarjeta.");
      }
    });
  };

  // Reasignar empresa
  const handleReassignCompany = async (cardId: string) => {
    if (!targetCompanyId) return;
    startTransition(async () => {
      const res = await assignPhysicalCardSuperadminAction({
        cardPhysicalId: cardId,
        targetCompanyId
      });

      if (res.success) {
        setSuccessMsg("Empresa reasignada correctamente.");
        setReassigningCardId(null);
        setTargetCompanyId("");
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(res.error || "No se pudo reasignar la empresa.");
      }
    });
  };

  // Copiar URL grabada en chip
  const copyChipUrl = (token: string) => {
    const protocol = originHost.includes("localhost") ? "http" : "https";
    const chipUrl = `${protocol}://${originHost}/t/${token}`;
    navigator.clipboard.writeText(chipUrl);
    alert(`¡URL copiada al portapapeles!\n\n${chipUrl}`);
  };

  // Filtrado local
  const filteredCards = cards.filter(card => {
    const matchesSearch =
      card.token.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (card.batchCode && card.batchCode.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCompany = !companyFilter || card.company.id === companyFilter;

    let matchesDestination = true;
    if (destinationFilter === "FREE") {
      matchesDestination = !card.cardId && !card.localTouchpointId;
    } else if (destinationFilter === "B2B") {
      matchesDestination = !!card.cardId;
    } else if (destinationFilter === "LOCAL") {
      matchesDestination = !!card.localTouchpointId;
    }

    return matchesSearch && matchesCompany && matchesDestination;
  });

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-bold rounded-xl flex justify-between items-center">
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-xl flex justify-between items-center">
          <span>🎉 {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>
      )}

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Inventario de Tarjetas Físicas NFC
          </h1>
          <p className="mt-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
            Registro, asignación por empresa, desvinculación segura y consulta de tokens físicos.
          </p>
        </div>
        <button
          onClick={() => setShowRegisterModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md transition-all text-center cursor-pointer active:scale-95"
        >
          ➕ Registrar Nueva Tarjeta
        </button>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest block">Total Tarjetas</span>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{cards.length}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest block">Libres (Sin Destino)</span>
          <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {cards.filter(c => !c.cardId && !c.localTouchpointId).length}
          </h3>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest block">Vinculadas B2B</span>
          <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {cards.filter(c => !!c.cardId).length}
          </h3>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest block">Vinculadas Local</span>
          <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {cards.filter(c => !!c.localTouchpointId).length}
          </h3>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por token, lote o empresa..."
          className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 text-slate-900 dark:text-white"
        />
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 text-slate-900 dark:text-slate-300"
        >
          <option value="">Todas las empresas</option>
          {companies.map(comp => (
            <option key={comp.id} value={comp.id}>{comp.name}</option>
          ))}
        </select>
        <select
          value={destinationFilter}
          onChange={(e) => setDestinationFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 text-slate-900 dark:text-slate-300"
        >
          <option value="">Todos los destinos</option>
          <option value="FREE">Libres (Sin vincular)</option>
          <option value="B2B">Vinculadas a B2B</option>
          <option value="LOCAL">Vinculadas a Local</option>
        </select>
      </div>

      {/* Tabla de Inventario */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="px-5 py-3.5">Token / Chip URL</th>
                <th className="px-5 py-3.5">Empresa Propietaria</th>
                <th className="px-5 py-3.5">Destino Actual</th>
                <th className="px-5 py-3.5">Estado Hardware</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {filteredCards.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400 italic">
                    No se encontraron tarjetas físicas con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredCards.map((card) => {
                  let destBadge = { text: "Libre", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30" };
                  let destDetail = "Disponible para asignación interna";

                  if (card.cardId && card.card) {
                    destBadge = { text: "B2B", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30" };
                    destDetail = `Tarjeta B2B: /c/${card.card.slug}`;
                  } else if (card.localTouchpointId && card.localTouchpoint) {
                    destBadge = { text: "Smart Local", className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/30" };
                    destDetail = `Punto: ${card.localTouchpoint.name} (/club/${card.localTouchpoint.campaign.slug})`;
                  }

                  const isBlocked = !!card.cardId || !!card.localTouchpointId;

                  return (
                    <tr key={card.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-950/40 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{card.token}</span>
                          <button
                            onClick={() => copyChipUrl(card.token)}
                            title="Copiar URL grabada en chip (/t/token)"
                            className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            📋 Copiar Link
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-mono mt-0.5">
                          Lote: {card.batchCode || "Sin lote"} | ID: {card.id.substring(0, 10)}...
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/superadmin/empresas/${card.company.id}`}
                          className="font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                        >
                          {card.company.name}
                        </Link>
                        {reassigningCardId === card.id ? (
                          <div className="flex items-center gap-2 mt-2">
                            <select
                              value={targetCompanyId}
                              onChange={(e) => setTargetCompanyId(e.target.value)}
                              className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-[10px] text-slate-900 dark:text-slate-200"
                            >
                              <option value="">-- Seleccionar nueva empresa --</option>
                              {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleReassignCompany(card.id)}
                              disabled={isPending || !targetCompanyId}
                              className="bg-blue-600 text-white text-[9px] font-bold px-2 py-1 rounded hover:bg-blue-500 cursor-pointer disabled:opacity-50"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => setReassigningCardId(null)}
                              className="text-[9px] text-slate-600 dark:text-slate-400 hover:text-slate-900 font-bold"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="mt-0.5">
                            {!isBlocked ? (
                              <button
                                onClick={() => {
                                  setReassigningCardId(card.id);
                                  setTargetCompanyId(card.company.id);
                                }}
                                className="text-[9.5px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                              >
                                Reasignar empresa
                              </button>
                            ) : (
                              <span className="text-[9.5px] text-slate-500 dark:text-slate-400 italic">
                                Desvincula el destino para reasignar empresa
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${destBadge.className}`}>
                          {destBadge.text}
                        </span>
                        <span className="text-[10px] text-slate-700 dark:text-slate-300 block mt-1 font-medium">
                          {destDetail}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-[10px] uppercase text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                          {card.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {isBlocked ? (
                          <button
                            onClick={() => handleDisassociate(card.id, card.token)}
                            disabled={isPending}
                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 text-[10px] font-extrabold py-1.5 px-3 rounded-lg border border-rose-500/30 transition cursor-pointer disabled:opacity-50"
                          >
                            Desvincular Destino
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                            ✓ Tarjeta Libre
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Registro de Tarjeta */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Registrar Nueva Tarjeta Física</h3>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterCard} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block tracking-wider">
                  Empresa Propietaria *
                </label>
                <select
                  required
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-blue-500"
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block tracking-wider">
                  Token del Chip (Dejar vacío para autogenerar hex seguro)
                </label>
                <input
                  type="text"
                  placeholder="ej. a1b2c3d4e5f67890"
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-200 font-mono outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block tracking-wider">
                    Estado Inicial
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-blue-500"
                  >
                    <option value="PENDIENTE_GRABACION">Pendiente Grabación</option>
                    <option value="GRABADA">Grabada</option>
                    <option value="ENVIADA">Enviada</option>
                    <option value="ENTREGADA">Entregada</option>
                    <option value="ACTIVA">Activa</option>
                    <option value="SUSPENDIDA">Suspendida</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block tracking-wider">
                    Lote / Código Control
                  </label>
                  <input
                    type="text"
                    placeholder="ej. LOTE-2026-07"
                    value={batchCode}
                    onChange={(e) => setBatchCode(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-200 font-mono outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold transition disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? "Guardando..." : "Registrar Tarjeta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
