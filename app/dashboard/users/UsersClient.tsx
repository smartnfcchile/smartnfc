"use client";

import React, { useState, useTransition } from "react";
import { createVendorUser, deleteVendorUser } from "./actions";

type UserRecord = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: Date;
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
  const [password, setPassword] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Función para generar contraseñas seguras aleatorias
  const handleGeneratePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    setPassword(retVal);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!name || !email || !password) {
      setError("Por favor, rellene todos los campos requeridos.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createVendorUser(name, email, password, sendEmail);
        if (res.success) {
          // Actualizamos la lista local
          const newUser: UserRecord = {
            id: Math.random().toString(), // Temporal para la interfaz, revalidará en el servidor
            name,
            email,
            role: "USER",
            createdAt: new Date(),
            _count: { cards: 0 },
          };
          setUsers([newUser, ...users]);
          setSuccessMsg("¡Vendedor creado con éxito!");
          
          // Limpiamos los campos
          setName("");
          setEmail("");
          setPassword("");
          
          setTimeout(() => {
            setModalOpen(false);
            setSuccessMsg("");
          }, 1500);
        }
      } catch (err: any) {
        setError(err.message || "No se pudo crear el usuario.");
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
    } catch (err: any) {
      alert("Error al eliminar vendedor: " + err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabecera de Control */}
      <div className="flex justify-end bg-slate-900/40 border border-slate-900 p-4 rounded-2xl shadow-sm">
        <button
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-blue-600/10 active:scale-95 cursor-pointer"
        >
          ➕ Crear Vendedor
        </button>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-950/40 text-slate-400 uppercase text-[9px] tracking-widest border-b border-slate-850">
              <tr>
                <th className="py-3 px-4">Vendedor</th>
                <th className="py-3 px-4">Correo Electrónico</th>
                <th className="py-3 px-4 text-center">Rol</th>
                <th className="py-3 px-4 text-center">Tarjetas</th>
                <th className="py-3 px-4 text-right">Creado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
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
                          item.role === "CLIENT_ADMIN" || item.role === "SUPERADMIN"
                            ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                            : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        }`}
                      >
                        {item.role === "CLIENT_ADMIN" || item.role === "SUPERADMIN"
                          ? "Administrador"
                          : "Vendedor"}
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
                        <button
                          onClick={() => handleDeleteUser(item.id, item.name || "")}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold py-1.5 px-3 rounded-lg border border-red-500/20 hover:border-red-500/30 transition active:scale-95 cursor-pointer"
                        >
                          🗑️ Eliminar
                        </button>
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
                <p className="text-xs text-slate-500">Crea credenciales de acceso para tu equipo.</p>
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
                  {error}
                </div>
              )}
              {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500 text-emerald-400 p-3 rounded-xl text-xs text-center font-semibold animate-bounce">
                  {successMsg}
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

              {/* Contraseña */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Contraseña de Acceso
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Contraseña del vendedor"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending}
                    className="flex-1 p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-200 font-mono transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    disabled={isPending}
                    className="bg-slate-800 hover:bg-slate-750 text-white font-bold py-2 px-3 rounded-xl text-xs transition border border-slate-750 active:scale-95 shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    ⚡ Generar
                  </button>
                </div>
              </div>

              {/* Enviar Correo */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  disabled={isPending}
                  className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 h-4 w-4 disabled:opacity-50 cursor-pointer"
                />
                <label
                  htmlFor="sendEmail"
                  className="text-xs text-slate-400 font-medium cursor-pointer select-none"
                >
                  Enviar credenciales automáticamente por correo (Resend)
                </label>
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
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition shadow-md shadow-blue-600/10 disabled:opacity-50 cursor-pointer"
              >
                {isPending ? "Creando..." : "Crear Perfil"}
              </button>
            </div>

          </form>
        </div>
      )}
    </div>
  );
}
