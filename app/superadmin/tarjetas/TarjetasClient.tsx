"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  registerPhysicalCardSuperadminAction,
  assignPhysicalCardSuperadminAction,
  disassociatePhysicalCardSuperadminAction,
  associatePhysicalCardToB2BSuperadminAction
} from "../actions";
import CreateCardWizard from "./CreateCardWizard";

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
  company: { id: string; name: string; slug: string | null };
  card: { id: string; slug: string; name: string | null } | null;
  localTouchpoint: { id: string; code: string; name: string; campaign: { id: string; name: string; slug: string } } | null;
};

type CompanyItem = { id: string; name: string; slug: string | null };
type DigitalCardItem = { id: string; companyId: string; slug: string; name: string; profileName: string | null; isActive: boolean; user: { name: string | null; email: string } };
type CompanyUserItem = { id: string; companyId: string; name: string | null; email: string; status: string; role: string };
type NfcStatus = "PENDIENTE_GRABACION" | "GRABADA" | "ENVIADA" | "ENTREGADA" | "ACTIVA" | "SUSPENDIDA";
type TarjetasClientProps = { cards: PhysicalCardItem[]; companies: CompanyItem[]; digitalCards: DigitalCardItem[]; companyUsers: CompanyUserItem[]; originHost: string };

export default function TarjetasClient({ cards: initialCards, companies, digitalCards, companyUsers, originHost }: TarjetasClientProps) {
  const router = useRouter();
  const [cards, setCards] = useState<PhysicalCardItem[]>(initialCards);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [destinationFilter, setDestinationFilter] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newToken, setNewToken] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState(companies[0]?.id || "");
  const [selectedStatus, setSelectedStatus] = useState<NfcStatus>("ENTREGADA");
  const [batchCode, setBatchCode] = useState("");
  const [selectedDestinationCardId, setSelectedDestinationCardId] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [registrationMode, setRegistrationMode] = useState<"guided" | "technical">("guided");
  const [reassigningCardId, setReassigningCardId] = useState<string | null>(null);
  const [targetCompanyId, setTargetCompanyId] = useState("");
  const [linkingPhysicalCardId, setLinkingPhysicalCardId] = useState<string | null>(null);
  const [targetDigitalCardId, setTargetDigitalCardId] = useState("");

  const profilesForCompany = (companyId: string) => digitalCards.filter(card => card.companyId === companyId);
  const openRegisterModal = () => { setRegistrationMode("guided"); setErrorMsg(null); setShowRegisterModal(true); };

  const handleRegisterCard = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(null); setSuccessMsg(null);
    if (!selectedCompanyId) { setErrorMsg("Debes seleccionar una empresa propietaria."); return; }
    startTransition(async () => {
      const res = await registerPhysicalCardSuperadminAction({ token: newToken || undefined, companyId: selectedCompanyId, destinationCardId: selectedDestinationCardId || undefined, status: selectedStatus, batchCode: batchCode || undefined });
      if (res.success) { setSuccessMsg(`¡Tarjeta registrada con éxito! Token: ${res.token}`); setNewToken(""); setBatchCode(""); setSelectedDestinationCardId(""); setShowRegisterModal(false); router.refresh(); setTimeout(() => setSuccessMsg(null), 4000); }
      else setErrorMsg(res.error || "Error al registrar la tarjeta física.");
    });
  };

  const handleDisassociate = async (cardId: string, token: string) => {
    if (!window.confirm(`¿Estás seguro de desvincular el destino de la tarjeta "${token.substring(0, 12)}..."?\n\nLa tarjeta continuará asignada a su empresa pero quedará en estado "Libre" para vincular a otra identidad B2B o punto Local.`)) return;
    startTransition(async () => {
      const res = await disassociatePhysicalCardSuperadminAction(cardId);
      if (res.success) { setSuccessMsg("¡Destino desvinculado con éxito!"); setTimeout(() => setSuccessMsg(null), 3000); setCards(prev => prev.map(c => c.id === cardId ? { ...c, cardId: null, localTouchpointId: null, card: null, localTouchpoint: null } : c)); router.refresh(); }
      else setErrorMsg(res.error || "Error al desvincular la tarjeta.");
    });
  };

  const handleReassignCompany = async (cardId: string) => {
    if (!targetCompanyId) return;
    startTransition(async () => {
      const res = await assignPhysicalCardSuperadminAction({ cardPhysicalId: cardId, targetCompanyId });
      if (res.success) { setSuccessMsg("Empresa reasignada correctamente."); setReassigningCardId(null); setTargetCompanyId(""); router.refresh(); setTimeout(() => setSuccessMsg(null), 3000); }
      else setErrorMsg(res.error || "No se pudo reasignar la empresa.");
    });
  };

  const handleAssociateB2B = async (physicalCardId: string) => {
    if (!targetDigitalCardId) return; setErrorMsg(null);
    startTransition(async () => {
      const res = await associatePhysicalCardToB2BSuperadminAction({ physicalCardId, destinationCardId: targetDigitalCardId });
      if (res.success) { setSuccessMsg("Identidad B2B vinculada correctamente. El NFC y el QR ya redirigen al perfil."); setLinkingPhysicalCardId(null); setTargetDigitalCardId(""); router.refresh(); setTimeout(() => setSuccessMsg(null), 4000); }
      else setErrorMsg(res.error || "No se pudo vincular la identidad B2B.");
    });
  };

  const copyChipUrl = (token: string) => { const protocol = originHost.includes("localhost") ? "http" : "https"; const chipUrl = `${protocol}://${originHost}/t/${token}`; navigator.clipboard.writeText(chipUrl); alert(`¡URL copiada al portapapeles!\n\n${chipUrl}`); };

  const filteredCards = cards.filter(card => {
    const matchesSearch = card.token.toLowerCase().includes(searchQuery.toLowerCase()) || card.company.name.toLowerCase().includes(searchQuery.toLowerCase()) || (card.batchCode && card.batchCode.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCompany = !companyFilter || card.company.id === companyFilter;
    let matchesDestination = true;
    if (destinationFilter === "FREE") matchesDestination = !card.cardId && !card.localTouchpointId;
    else if (destinationFilter === "B2B") matchesDestination = !!card.cardId;
    else if (destinationFilter === "LOCAL") matchesDestination = !!card.localTouchpointId;
    return matchesSearch && matchesCompany && matchesDestination;
  });

  return <div className="space-y-6">
    {errorMsg && <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-bold rounded-xl flex justify-between items-center"><span>⚠️ {errorMsg}</span><button onClick={() => setErrorMsg(null)}>✕</button></div>}
    {successMsg && <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-xl flex justify-between items-center"><span>🎉 {successMsg}</span><button onClick={() => setSuccessMsg(null)}>✕</button></div>}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div><h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Inventario de Tarjetas Físicas NFC</h1><p className="mt-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">Registro, asignación por empresa, desvinculación segura y consulta de tokens físicos.</p></div><button onClick={openRegisterModal} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md">➕ Registrar Nueva Tarjeta</button></div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[["Total Tarjetas", cards.length], ["Libres (Sin Destino)", cards.filter(c => !c.cardId && !c.localTouchpointId).length], ["Vinculadas B2B", cards.filter(c => !!c.cardId).length], ["Vinculadas Local", cards.filter(c => !!c.localTouchpointId).length]].map(([label, value]) => <div key={String(label)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm"><span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest block">{label}</span><h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{value}</h3></div>)}</div>
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-3"><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar por token, lote o empresa..." className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs"/><select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs"><option value="">Todas las empresas</option>{companies.map(comp => <option key={comp.id} value={comp.id}>{comp.name}</option>)}</select><select value={destinationFilter} onChange={e => setDestinationFilter(e.target.value)} className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs"><option value="">Todos los destinos</option><option value="FREE">Libres</option><option value="B2B">B2B</option><option value="LOCAL">Local</option></select></div>
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800"><th className="px-5 py-3.5">Token / Chip URL</th><th className="px-5 py-3.5">Empresa</th><th className="px-5 py-3.5">Destino</th><th className="px-5 py-3.5">Estado</th><th className="px-5 py-3.5 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{filteredCards.map(card => <tr key={card.id}><td className="px-5 py-4"><div className="font-mono font-bold">{card.token}</div><button onClick={() => copyChipUrl(card.token)} className="mt-1 text-blue-600 underline">Copiar URL chip</button></td><td className="px-5 py-4 font-bold">{card.company.name}</td><td className="px-5 py-4">{card.card ? <Link href={`/c/${card.card.slug}`} target="_blank" className="text-blue-600 underline">{card.card.name}</Link> : card.localTouchpoint ? <span>Local · {card.localTouchpoint.name}</span> : <span className="text-slate-500">Libre</span>}</td><td className="px-5 py-4">{card.status.replaceAll("_", " ")}</td><td className="px-5 py-4 text-right"><div className="flex flex-wrap justify-end gap-2">{!card.cardId && !card.localTouchpointId && <button onClick={() => { setLinkingPhysicalCardId(card.id); setTargetDigitalCardId(""); }} className="rounded-lg bg-blue-500/10 px-2 py-1 text-blue-700">Vincular B2B</button>}<button onClick={() => { setReassigningCardId(card.id); setTargetCompanyId(card.companyId); }} className="rounded-lg bg-slate-500/10 px-2 py-1">Empresa</button>{(card.cardId || card.localTouchpointId) && <button onClick={() => handleDisassociate(card.id, card.token)} className="rounded-lg bg-rose-500/10 px-2 py-1 text-rose-700">Desvincular</button>}</div></td></tr>)}</tbody></table></div></div>
    {linkingPhysicalCardId && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"><div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-5"><h3 className="font-black">Vincular identidad B2B</h3><select value={targetDigitalCardId} onChange={e => setTargetDigitalCardId(e.target.value)} className="mt-4 w-full rounded-xl border p-3 dark:bg-slate-950"><option value="">Selecciona perfil</option>{profilesForCompany(cards.find(c => c.id === linkingPhysicalCardId)?.companyId || "").map(profile => <option key={profile.id} value={profile.id}>{profile.profileName || profile.name}</option>)}</select><div className="mt-4 flex justify-end gap-2"><button onClick={() => setLinkingPhysicalCardId(null)}>Cancelar</button><button disabled={isPending || !targetDigitalCardId} onClick={() => handleAssociateB2B(linkingPhysicalCardId)} className="rounded-xl bg-blue-600 px-4 py-2 text-white">Vincular</button></div></div></div>}
    {reassigningCardId && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"><div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-5"><h3 className="font-black">Reasignar empresa</h3><select value={targetCompanyId} onChange={e => setTargetCompanyId(e.target.value)} className="mt-4 w-full rounded-xl border p-3 dark:bg-slate-950">{companies.map(comp => <option key={comp.id} value={comp.id}>{comp.name}</option>)}</select><div className="mt-4 flex justify-end gap-2"><button onClick={() => setReassigningCardId(null)}>Cancelar</button><button disabled={isPending} onClick={() => handleReassignCompany(reassigningCardId)} className="rounded-xl bg-blue-600 px-4 py-2 text-white">Guardar</button></div></div></div>}
    {showRegisterModal && registrationMode === "guided" && <CreateCardWizard companies={companies} companyUsers={companyUsers} onClose={() => setShowRegisterModal(false)} onTechnicalMode={() => setRegistrationMode("technical")} />}
    {showRegisterModal && registrationMode === "technical" && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"><form onSubmit={handleRegisterCard} className="w-full max-w-lg space-y-4 rounded-2xl bg-white dark:bg-slate-900 p-6"><h3 className="text-lg font-black">Registrar solamente tarjeta física</h3><select value={selectedCompanyId} onChange={e => { setSelectedCompanyId(e.target.value); setSelectedDestinationCardId(""); }} className="w-full rounded-xl border p-3 dark:bg-slate-950">{companies.map(comp => <option key={comp.id} value={comp.id}>{comp.name}</option>)}</select><select value={selectedDestinationCardId} onChange={e => setSelectedDestinationCardId(e.target.value)} className="w-full rounded-xl border p-3 dark:bg-slate-950"><option value="">Sin destino</option>{profilesForCompany(selectedCompanyId).map(profile => <option key={profile.id} value={profile.id}>{profile.profileName || profile.name}</option>)}</select><input value={newToken} onChange={e => setNewToken(e.target.value)} placeholder="Token opcional" className="w-full rounded-xl border p-3 dark:bg-slate-950"/><input value={batchCode} onChange={e => setBatchCode(e.target.value)} placeholder="Lote opcional" className="w-full rounded-xl border p-3 dark:bg-slate-950"/><select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value as NfcStatus)} className="w-full rounded-xl border p-3 dark:bg-slate-950"><option value="PENDIENTE_GRABACION">Pendiente de grabación</option><option value="GRABADA">Grabada</option><option value="ENVIADA">Enviada</option><option value="ENTREGADA">Entregada</option><option value="ACTIVA">Activa</option><option value="SUSPENDIDA">Suspendida</option></select><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowRegisterModal(false)}>Cancelar</button><button disabled={isPending} className="rounded-xl bg-blue-600 px-4 py-2 text-white">Registrar</button></div></form></div>}
  </div>;
}
