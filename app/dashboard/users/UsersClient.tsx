"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCollaboratorWithCard, deleteVendorUser, resendInvitationFromDashboardAction } from "./actions";

type UserRecord = { id: string; name: string | null; email: string; role: string; createdAt: Date; status: string; _count: { cards: number } };
type Props = { initialUsers: UserRecord[]; currentUserId: string };

function roleLabel(role: string) {
  if (role === "SUPERADMIN") return "SuperAdmin";
  if (role === "COMPANY_OWNER" || role === "COMPANY_ADMIN") return "Administrador";
  return "Colaborador";
}

export default function UsersClient({ initialUsers, currentUserId }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [warningMsg, setWarningMsg] = useState("");

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setSuccessMsg(""); setWarningMsg("");
    if (!name.trim() || !email.trim()) { setError("Completa el nombre y correo del colaborador."); return; }
    startTransition(async () => {
      try {
        const result = await createCollaboratorWithCard(name, email);
        if (!result.success) return;
        setSuccessMsg("Colaborador y tarjeta creados. Enviamos la invitación de activación y la solicitud de producción a SmartNFC.");
        if (result.emailWarning) setWarningMsg(result.emailWarning);
        setName(""); setEmail(""); router.refresh();
      } catch (err: unknown) { setError(err instanceof Error ? err.message : "No fue posible crear el colaborador."); }
    });
  };

  const handleResend = (userId: string, userEmail: string) => startTransition(async () => {
    try { await resendInvitationFromDashboardAction(userId); alert(`Invitación reenviada a ${userEmail}`); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : "No fue posible reenviar la invitación."); }
  });

  const handleDelete = async (userId: string, userName: string) => {
    if (!window.confirm(`¿Eliminar al integrante "${userName}"?\n\nSe eliminarán su acceso y sus tarjetas asociadas.`)) return;
    try { await deleteVendorUser(userId); router.refresh(); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : "No fue posible eliminar el integrante."); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm"><div><span className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider block">Total Integrantes</span><span className="text-2xl font-black text-slate-950 dark:text-white">{initialUsers.length}</span></div><button onClick={() => { setError(""); setSuccessMsg(""); setWarningMsg(""); setModalOpen(true); }} className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs">➕ Nuevo Colaborador + Tarjeta</button></div>

    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-slate-700 dark:text-slate-300"><strong>¿Qué ocurre al crear un colaborador?</strong> SmartNFC crea su perfil y tarjeta, genera el enlace empresa-persona, deja la tarjeta física pendiente de grabación, envía la invitación al colaborador y avisa a producción.</div>

    <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead><tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-700 dark:text-slate-400 bg-slate-100 dark:bg-slate-950/20"><th className="py-3.5 px-4">Integrante</th><th className="py-3.5 px-4">Correo</th><th className="py-3.5 px-4 text-center">Rol</th><th className="py-3.5 px-4 text-center">Tarjetas</th><th className="py-3.5 px-4 text-center">Estado</th><th className="py-3.5 px-4 text-center">Acciones</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{initialUsers.map(item => { const isSelf = item.id === currentUserId; return <tr key={item.id}><td className="py-4 px-4 font-bold text-slate-950 dark:text-white">{item.name || "Sin nombre"}</td><td className="py-4 px-4 text-slate-700 dark:text-slate-300">{item.email}</td><td className="py-4 px-4 text-center"><span className="rounded-full border px-2.5 py-1 text-[9px] font-bold">{roleLabel(item.role)}</span></td><td className="py-4 px-4 text-center font-bold">{item._count.cards}</td><td className="py-4 px-4 text-center text-xs">{item.status === "PENDING" ? "Pendiente de activación" : item.status === "ACTIVE" ? "Activo" : item.status}</td><td className="py-4 px-4 text-center">{isSelf ? <span className="text-xs text-slate-500 italic">Tu cuenta</span> : <div className="flex justify-center gap-2">{item.status === "PENDING" && <button disabled={isPending} onClick={() => handleResend(item.id, item.email)} className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600">✉️ Reenviar</button>}<button disabled={isPending} onClick={() => handleDelete(item.id, item.name || "")} className="rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600">🗑️ Eliminar</button></div>}</td></tr>; })}</tbody></table></div></div>

    {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !isPending && setModalOpen(false)} /><form onSubmit={handleCreate} className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"><div className="p-6 border-b border-slate-800"><h3 className="text-lg font-extrabold text-white">Nuevo Colaborador + Tarjeta</h3><p className="mt-1 text-xs text-slate-400">El colaborador recibirá un correo para activar su cuenta y completar su perfil.</p></div><div className="p-6 space-y-4">{error && <div className="rounded-xl border border-red-500 bg-red-500/10 p-3 text-xs text-red-300">⚠️ {error}</div>}{successMsg && <div className="rounded-xl border border-emerald-500 bg-emerald-500/10 p-3 text-xs text-emerald-300">🎉 {successMsg}</div>}{warningMsg && <div className="rounded-xl border border-amber-500 bg-amber-500/10 p-3 text-xs text-amber-300">⚠️ {warningMsg}</div>}<div><label className="text-xs font-bold text-slate-400">Nombre completo</label><input required value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" placeholder="Ej. Juan Pérez" /></div><div><label className="text-xs font-bold text-slate-400">Correo electrónico</label><input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" placeholder="juan@empresa.cl" /></div><div className="rounded-xl bg-slate-950/70 p-3 text-[11px] text-slate-400">Rol: <strong className="text-white">Colaborador</strong>. Los administradores de empresa no pueden elevar privilegios desde este formulario.</div></div><div className="flex justify-end gap-3 border-t border-slate-800 p-4"><button type="button" onClick={() => setModalOpen(false)} disabled={isPending} className="rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white">Cerrar</button>{!successMsg && <button disabled={isPending} className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white">{isPending ? "Creando..." : "Crear colaborador y tarjeta"}</button>}</div></form></div>}
  </div>;
}
