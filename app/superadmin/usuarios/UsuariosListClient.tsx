"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUserRoleAndStatusAction } from "../actions";

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  companyId: string;
  company: {
    id: string;
    name: string;
  };
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

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");

  // Edit Modal State
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editCompanyId, setEditCompanyId] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  // Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");

  const filteredUsers = initialUsers.filter((user) => {
    const matchesSearch =
      (user.name && user.name.toLowerCase().includes(search.toLowerCase())) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter ? user.role === roleFilter : true;
    const matchesCompany = companyFilter ? user.companyId === companyFilter : true;
    return matchesSearch && matchesRole && matchesCompany;
  });

  const openEditModal = (user: UserItem) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditCompanyId(user.companyId);
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
      await updateUserRoleAndStatusAction(selectedUser.id, {
        isActive: editIsActive,
        role: editRole as "SUPERADMIN" | "COMPANY_OWNER" | "COMPANY_ADMIN" | "COLLABORATOR",
        companyId: editCompanyId,
      });

      setSuccess("Usuario actualizado con éxito.");
      setSelectedUser(null);
      router.refresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error al actualizar el usuario.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const triggerSaveConfirmation = () => {
    if (!selectedUser) return;
    const isCompanyChanged = editCompanyId !== selectedUser.companyId;
    const isStatusChanged = editIsActive !== selectedUser.isActive;
    
    let msg = `¿Estás seguro de que deseas guardar los cambios para el usuario "${selectedUser.email}"?`;
    if (isCompanyChanged) {
      msg += ` ADVERTENCIA: El usuario será transferido a una empresa diferente.`;
    }
    if (isStatusChanged && !editIsActive) {
      msg += ` ADVERTENCIA: El usuario será suspendido y perderá acceso inmediatamente.`;
    }

    setConfirmMessage(msg);
    setShowConfirmModal(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Gestión de Usuarios
        </h1>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          Administrar roles de plataforma, suspensión de accesos y asignaciones de inquilinos.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-xl">
          🎉 {success}
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 p-4 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o correo..."
          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-slate-300"
        >
          <option value="">Todos los roles</option>
          <option value="SUPERADMIN">SuperAdmin</option>
          <option value="COMPANY_OWNER">Company Owner</option>
          <option value="COMPANY_ADMIN">Company Admin</option>
          <option value="COLLABORATOR">Collaborator</option>
        </select>
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-slate-300"
        >
          <option value="">Todas las empresas</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            setSearch("");
            setRoleFilter("");
            setCompanyFilter("");
          }}
          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer"
        >
          Limpiar Filtros
        </button>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-150 dark:border-white/5 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                <th className="px-5 py-3.5 text-[9px]">Usuario</th>
                <th className="px-5 py-3.5 text-[9px]">Empresa</th>
                <th className="px-5 py-3.5 text-[9px]">Rol Global</th>
                <th className="px-5 py-3.5 text-[9px]">Estado</th>
                <th className="px-5 py-3.5 text-[9px]">Fecha Creación</th>
                <th className="px-5 py-3.5 text-[9px] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-white/5">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                    No hay usuarios que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 text-slate-700 dark:text-slate-350"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{user.name || "Usuario"}</div>
                      <span className="text-[10px] text-slate-400 block">{user.email}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{user.company.name}</div>
                      <span className="text-[9px] text-slate-400 font-mono">ID: {user.companyId.slice(0, 8)}...</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 font-extrabold text-[8px] uppercase tracking-wide border border-slate-200/50 dark:border-white/5">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[8px] font-extrabold uppercase leading-none ${
                          user.isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {user.isActive ? "Activo" : "Suspendido"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString("es-CL")}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => openEditModal(user)}
                        className="inline-flex px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 text-slate-650 dark:text-slate-350 text-[10px] font-extrabold transition-all cursor-pointer"
                      >
                        Modificar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Modificación de Usuario */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-45 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-left">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Modificar Usuario
              </h3>
              <p className="text-[10px] text-slate-450 block font-semibold mt-0.5">
                {selectedUser.email}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                  Rol del Usuario
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
                >
                  <option value="COLLABORATOR">COLLABORATOR (Vendedor/Miembro)</option>
                  <option value="COMPANY_ADMIN">COMPANY_ADMIN (Admin de empresa)</option>
                  <option value="COMPANY_OWNER">COMPANY_OWNER (Propietario de empresa)</option>
                  {selectedUser.role === "SUPERADMIN" && (
                    <option value="SUPERADMIN">SUPERADMIN (Acceso total)</option>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                  Asignar a Empresa Inquilina
                </label>
                <select
                  value={editCompanyId}
                  onChange={(e) => setEditCompanyId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between bg-slate-550/5 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800/80 p-3 rounded-xl">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Acceso habilitado (Habilitar inicio de sesión)
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedUser(null)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold px-5 py-2.5 rounded-xl transition-all"
              >
                Cerrar
              </button>
              <button
                onClick={triggerSaveConfirmation}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-6 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                {loading ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación explícita (Requisito 13) */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              ⚠️ Confirmar Acción Sensible
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
              {confirmMessage}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold px-4 py-2 rounded-lg transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  handleSaveUser();
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-5 py-2 rounded-lg shadow-md transition-all cursor-pointer"
              >
                Proceder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
