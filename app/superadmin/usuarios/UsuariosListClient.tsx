"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { resendInvitationAction, updateUserRoleAndStatusAction } from "../actions";

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  status: string;
  hasPassword: boolean;
  createdAt: string;
  companyId: string;
  company: { id: string; name: string };
}

interface CompanyItem {
  id: string;
  name: string;
}

interface UsuariosListClientProps {
  initialUsers: UserItem[];
  companies: CompanyItem[];
}

export default function UsuariosListClient({ initialUsers, companies }: UsuariosListClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");

  const filteredUsers = initialUsers.filter((user) => {
    const matchesSearch =
      (user.name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter ? user.role === roleFilter : true;
    const matchesCompany = companyFilter ? user.companyId === companyFilter : true;
    return matchesSearch && matchesRole && matchesCompany;
  });

  const openEditModal = (user: UserItem) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditIsActive(user.isActive);
    setError(null);
    setSuccess(null);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateUserRoleAndStatusAction(selectedUser.id, {
        isActive: editIsActive,
        role: editRole as "SUPERADMIN" | "COMPANY_OWNER" | "COMPANY_ADMIN" | "COLLABORATOR",
        // La empresa es inmutable. Nunca se permite mover una identidad entre tenants.
        companyId: selectedUser.companyId,
      });

      if (!result.success) throw new Error(result.error || "Error al actualizar el usuario.");

      setSuccess(
        result.enrollmentPending
          ? "Usuario actualizado. Aún debe aceptar una invitación para crear su contraseña."
          : "Usuario actualizado con éxito."
      );
      setSelectedUser(null);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al actualizar el usuario.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvitation = async (user: UserItem) => {
    if (!window.confirm(`Se invalidarán los enlaces anteriores y se enviará una invitación nueva a ${user.email}. ¿Continuar?`)) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await resendInvitationAction(user.id);
      setSuccess(`Invitación renovada y enviada a ${user.email}. El enlace será válido durante 48 horas.`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No fue posible reenviar la invitación.");
    } finally {
      setLoading(false);
    }
  };

  const triggerSaveConfirmation = () => {
    if (!selectedUser) return;
    const isStatusChanged = editIsActive !== selectedUser.isActive;
    let message = `¿Guardar los cambios para "${selectedUser.email}"?`;
    if (isStatusChanged && !editIsActive) {
      message += " El usuario será suspendido y perderá acceso inmediatamente.";
    }
    setConfirmMessage(message);
    setShowConfirmModal(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Gestión de Usuarios</h1>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          Administra roles y accesos. La empresa de origen de cada usuario es permanente para proteger el aislamiento multi-tenant.
        </p>
      </div>

      {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl">⚠️ {error}</div>}
      {success && <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-xl">🎉 {success}</div>}

      <div className="bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 p-4 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o correo..." className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white" />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-slate-300">
          <option value="">Todos los roles</option>
          <option value="SUPERADMIN">SuperAdmin</option>
          <option value="COMPANY_OWNER">Company Owner</option>
          <option value="COMPANY_ADMIN">Company Admin</option>
          <option value="COLLABORATOR">Colaborador</option>
        </select>
        <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-slate-300">
          <option value="">Todas las empresas</option>
          {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
        </select>
        <button onClick={() => { setSearch(""); setRoleFilter(""); setCompanyFilter(""); }} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold py-2.5 rounded-xl transition-all">Limpiar Filtros</button>
      </div>

      <div className="bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead><tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
              <th className="px-5 py-3.5 text-[9px]">Usuario</th><th className="px-5 py-3.5 text-[9px]">Empresa</th><th className="px-5 py-3.5 text-[9px]">Rol</th><th className="px-5 py-3.5 text-[9px]">Estado</th><th className="px-5 py-3.5 text-[9px]">Creación</th><th className="px-5 py-3.5 text-[9px] text-right">Acciones</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {filteredUsers.length === 0 ? <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">No hay usuarios que coincidan con los filtros.</td></tr> : filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 text-slate-700 dark:text-slate-300">
                  <td className="px-5 py-3.5"><div className="font-bold text-slate-900 dark:text-slate-100">{user.name || "Usuario"}</div><span className="text-[10px] text-slate-400">{user.email}</span></td>
                  <td className="px-5 py-3.5"><div className="font-semibold text-slate-800 dark:text-slate-200">{user.company.name}</div><span className="text-[9px] text-slate-400 font-mono">Tenant fijo · {user.companyId.slice(0, 8)}...</span></td>
                  <td className="px-5 py-3.5"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 font-extrabold text-[8px] uppercase border border-slate-200/50 dark:border-white/5">{user.role}</span></td>
                  <td className="px-5 py-3.5"><span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${user.status === "PENDING" ? "bg-amber-500/10 text-amber-600" : user.isActive ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>{user.status === "PENDING" ? "Invitación pendiente" : user.isActive ? "Activo" : "Suspendido"}</span></td>
                  <td className="px-5 py-3.5 text-slate-400">{new Date(user.createdAt).toLocaleDateString("es-CL")}</td>
                  <td className="px-5 py-3.5 text-right"><div className="flex justify-end gap-2">
                    {!user.hasPassword && user.status !== "SUSPENDED" && <button disabled={loading} onClick={() => handleResendInvitation(user)} className="inline-flex px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 text-[10px] font-extrabold disabled:opacity-50">Reenviar invitación</button>}
                    <button onClick={() => openEditModal(user)} className="inline-flex px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-extrabold">Modificar</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-45 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-left">
          <div><h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Modificar Usuario</h3><p className="text-[10px] text-slate-500 font-semibold mt-0.5">{selectedUser.email}</p></div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Empresa / tenant</div><div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{selectedUser.company.name}</div><p className="mt-1 text-[10px] text-slate-500">La empresa no puede modificarse. Si la persona trabaja posteriormente para otra empresa, debe crearse una cuenta nueva en ese tenant.</p></div>
          <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rol del Usuario</label><select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs dark:text-white"><option value="COLLABORATOR">COLLABORATOR (Miembro)</option><option value="COMPANY_ADMIN">COMPANY_ADMIN</option><option value="COMPANY_OWNER">COMPANY_OWNER</option>{selectedUser.role === "SUPERADMIN" && <option value="SUPERADMIN">SUPERADMIN</option>}</select></div>
          <div className="flex items-center justify-between border border-slate-200 dark:border-slate-800 p-3 rounded-xl"><span className="text-xs font-bold text-slate-800 dark:text-slate-200">Acceso habilitado</span><input type="checkbox" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} /></div>
          <div className="flex justify-end gap-3"><button onClick={() => setSelectedUser(null)} className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold px-5 py-2.5 rounded-xl">Cerrar</button><button onClick={triggerSaveConfirmation} disabled={loading} className="bg-blue-600 text-white text-xs font-extrabold px-6 py-2.5 rounded-xl">{loading ? "Guardando..." : "Guardar"}</button></div>
        </div>
      </div>}

      {showConfirmModal && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left"><h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">⚠️ Confirmar Acción Sensible</h3><p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{confirmMessage}</p><div className="flex justify-end gap-3"><button onClick={() => setShowConfirmModal(false)} className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold px-4 py-2 rounded-lg">Cancelar</button><button onClick={() => { setShowConfirmModal(false); handleSaveUser(); }} className="bg-blue-600 text-white text-xs font-extrabold px-5 py-2 rounded-lg">Proceder</button></div></div></div>}
    </div>
  );
}
