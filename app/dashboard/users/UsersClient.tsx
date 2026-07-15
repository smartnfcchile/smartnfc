"use client";

import React, { useState, useTransition } from "react";
import { createVendorUser, deleteVendorUser, resendInvitationFromDashboardAction } from "./actions";

type UserRecord = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: Date;
  status: string;
  _count: {
    cards: number;
  };
};

type UsersClientProps = {
  initialUsers: UserRecord[];
  currentUserId: string;
};

export default function UsersClient({ initialUsers, currentUserId }: UsersClientProps) {
  const [users, setUsers] = useState<UserRecord[]>(initialUsers);
  
  // Estados del modal de creación
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [warningMsg, setWarningMsg] = useState("");

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setWarningMsg("");

    if (!name || !email) {
      setError("Por favor, rellene todos los campos requeridos.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createVendorUser(name, email);
        if (res.success) {
          // Actualizamos la lista local
          const newUser: UserRecord = {
            id: Math.random().toString(), // Temporal para la interfaz
            name,
            email,
            role: "COLLABORATOR",
            createdAt: new Date(),
            status: "PENDING",
            _count: { cards: 0 },
          };
          setUsers([newUser, ...users]);
          
          if (res.emailWarning) {
            setWarningMsg(res.emailWarning);
            setName("");
            setEmail("");
            // No cerramos inmediatamente para que puedan ver la advertencia
          } else {
            setSuccessMsg("¡Vendedor invitado con éxito! Se ha enviado el correo.");
            setName("");
            setEmail("");
            setTimeout(() => {
              setModalOpen(false);
              setSuccessMsg("");
            }, 2000);
          }
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "No se pudo invitar al usuario.";
        setError(errorMsg);
      }
    });
  };

  const handleResend = async (userId: string, userEmail: string) => {
    setError("");
    setSuccessMsg("");
    setWarningMsg("");
    startTransition(async () => {
      try {
        await resendInvitationFromDashboardAction(userId);
        alert(`Invitación reenviada con éxito a ${userEmail}`);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Error al reenviar invitación.";
        alert(errorMsg);
      }
    });
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar al vendedor "${userName}"?\n\n¡IMPORTANTE!:\nSe eliminará su acceso y sus tarjetas virtuales asociadas de forma definitiva.\nTodos los contactos y leads comerciales que recopiló seguirán guardados en tu panel.`
    );

    if (!confirmDelete) return;

    try {
      await deleteVendorUser(userId);
      setUsers(users.filter((u) => u.id !== userId));
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error al eliminar vendedor.";
      alert("Error al eliminar vendedor: " + errorMsg);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Barra de Acciones */}
      <div className="flex justify-between items-center bg-slate-900/40 border border-slate-800 p-4 rounded-2xl">
        <div>
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Integrantes</span>
          <span className="text-2xl font-black text-white">{users.length}</span>
        </div>
        <button
          onClick={() => {
            setError("");
            setSuccessMsg("");
            setWarningMsg("");
            setModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition active:scale-95 shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 cursor-pointer"
        >
          ➕ Registrar Vendedor
        </button>
      </div>

      {/* LISTADO DE USUARIOS */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-450 bg-slate-950/20 font-black">
                <th className="py-3.5 px-4">Vendedor</th>
                <th className="py-3.5 px-4">Correo</th>
                <th className="py-3.5 px-4 text-center">Rol</th>
                <th className="py-3.5 px-4 text-center">Tarjetas</th>
                <th className="py-3.5 px-4 text-right">Creado el</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/30">
              {users.map((item) => {
                const isSelf = item.id === currentUserId;
                return (
                  <tr key={item.id} className="hover:bg-slate-900/20">
                    <td className="py-4 px-4 font-bold text-white text-sm sm:text-base">
                      {item.name || "Sin nombre"}
                    </td>
                    <td className="py-4 px-4 text-slate-300 font-medium">{item.email}</td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full border text-[9px] font-bold ${
                          item.role === "COMPANY_OWNER" || item.role === "COMPANY_ADMIN" || item.role === "SUPERADMIN"
                            ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                            : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        }`}
                      >
                        {item.role === "SUPERADMIN"
                          ? "SuperAdmin"
                          : (item.role === "COMPANY_OWNER" || item.role === "COMPANY_ADMIN"
                            ? "Administrador"
                            : "Vendedor")}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-slate-400">
                      {item._count.cards}
                    </td>
                    <td className="py-4 px-4 text-right text-xs text-slate-500 font-medium font-mono">
                      {new Date(item.createdAt).toLocaleDateString("es-CL")}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {isSelf ? (
                        <span className="text-xs text-slate-500 font-bold italic">Tú (Admin)</span>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          {item.status === "PENDING" && (
                            <button
                              disabled={isPending}
                              onClick={() => handleResend(item.id, item.email)}
                              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold py-1.5 px-3 rounded-lg border border-amber-500/20 hover:border-amber-500/30 transition cursor-pointer"
                            >
                              ✉️ Reenviar
                            </button>
                          )}
                          <button
                            disabled={isPending}
                            onClick={() => handleDeleteUser(item.id, item.name || "")}
                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 text-xs font-semibold py-1.5 px-3 rounded-lg border border-rose-500/20 hover:border-rose-500/30 transition active:scale-95 cursor-pointer"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CREACIÓN DE VENDEDOR */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !isPending && setModalOpen(false)} />
          <form
            onSubmit={handleCreateUser}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full flex flex-col z-10 shadow-2xl relative"
          >
            
            {/* Cabecera */}
            <div className="p-6 border-b border-slate-850 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-extrabold text-white">Nuevo Perfil de Vendedor</h3>
                <p className="text-xs text-slate-500">Registra sus datos y le enviaremos un correo de activación.</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={isPending}
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* Formulario */}
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-xl text-xs text-center font-semibold">
                  ⚠️ {error}
                </div>
              )}
              {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500 text-emerald-400 p-3 rounded-xl text-xs text-center font-semibold">
                  🎉 {successMsg}
                </div>
              )}
              {warningMsg && (
                <div className="bg-amber-500/10 border border-amber-500 text-amber-500 p-3 rounded-xl text-xs font-semibold text-center leading-relaxed">
                  ⚠️ {warningMsg}
                </div>
              )}

              {/* Nombre */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isPending}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-200 transition-all disabled:opacity-50"
                />
              </div>

              {/* Correo Electrónico */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  placeholder="ej. juan.perez@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isPending}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-200 transition-all disabled:opacity-50"
                />
              </div>

            </div>

            {/* Pie del modal */}
            <div className="p-4 border-t border-slate-850 bg-slate-950/20 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={isPending}
                className="bg-slate-800 hover:bg-slate-750 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition disabled:opacity-50 cursor-pointer"
              >
                Cerrar
              </button>
              {!successMsg && !warningMsg && (
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition shadow-md shadow-blue-600/10 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? "Invitando..." : "Invitar Vendedor"}
                </button>
              )}
            </div>

          </form>
        </div>
      )}
    </div>
  );
}
