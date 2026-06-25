"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { toggleCardActive, createVirtualCard } from "./actions";

type CardWithUser = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  user: {
    name: string | null;
    email: string;
  };
};

type UserRecord = {
  id: string;
  name: string | null;
  email: string;
};

type CardsClientProps = {
  initialCards: CardWithUser[];
  users: UserRecord[];
};

export default function CardsClient({ initialCards, users }: CardsClientProps) {
  const [cards, setCards] = useState<CardWithUser[]>(initialCards);
  
  // Estados de creación
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [userId, setUserId] = useState("");
  
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSlugChange = (val: string) => {
    const cleaned = val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
      .replace(/[^a-z0-9-_]/g, "-") // Reemplazar especiales por guiones
      .replace(/-+/g, "-") // Evitar repetidos
      .replace(/^-|-$/g, ""); // Quitar extremos
    setSlug(cleaned);
  };

  const handleToggleActive = async (cardId: string, currentActive: boolean) => {
    const newActiveState = !currentActive;
    
    // Actualizamos localmente primero (Optimistic UI)
    const updatedCards = cards.map((c) =>
      c.id === cardId ? { ...c, isActive: newActiveState } : c
    );
    setCards(updatedCards);

    try {
      await toggleCardActive(cardId, newActiveState);
    } catch (err: any) {
      alert("Error al cambiar estado de la tarjeta: " + err.message);
      // Revertimos en caso de error
      setCards(cards);
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!name || !slug || !userId) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    startTransition(async () => {
      try {
        await createVirtualCard(name, slug, userId);
        
        const assignedUser = users.find((u) => u.id === userId);
        const newCard: CardWithUser = {
          id: Math.random().toString(), // Temporal
          name,
          slug,
          isActive: true,
          createdAt: new Date(),
          user: {
            name: assignedUser?.name || "Vendedor",
            email: assignedUser?.email || "",
          },
        };

        setCards([newCard, ...cards]);
        setSuccessMsg("¡Tarjeta virtual creada con éxito!");
        
        setName("");
        setSlug("");
        setUserId("");

        setTimeout(() => {
          setModalOpen(false);
          setSuccessMsg("");
        }, 1500);
      } catch (err: any) {
        setError(err.message || "No se pudo crear la tarjeta.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Barra de Control */}
      <div className="flex justify-end bg-slate-900/40 border border-slate-900 p-4 rounded-2xl shadow-sm">
        <button
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-blue-600/10 active:scale-95 cursor-pointer"
        >
          ➕ Crear Tarjeta Virtual
        </button>
      </div>

      {/* Tabla de Tarjetas */}
      <div className="bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-950/40 text-slate-400 uppercase text-[9px] tracking-widest border-b border-slate-850">
              <tr>
                <th className="py-3 px-4">Tarjeta / Perfil</th>
                <th className="py-3 px-4">Asignada A</th>
                <th className="py-3 px-4 text-center">Enlace Público</th>
                <th className="py-3 px-4 text-center">Estado (Activa)</th>
                <th className="py-3 px-4 text-center">Configurar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/30">
              {cards.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/20">
                  <td className="py-4 px-4">
                    <div className="font-bold text-white text-sm sm:text-base">{item.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Enlace interno: c/{item.slug}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-slate-300 font-medium">
                    <div>{item.user.name || "Vendedor"}</div>
                    <div className="text-[10px] text-slate-500">{item.user.email}</div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <a
                      href={`/c/${item.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline transition"
                    >
                      🔗 smartnfc.cl/c/{item.slug}
                    </a>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => handleToggleActive(item.id, item.isActive)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          item.isActive ? "bg-blue-600" : "bg-slate-800"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            item.isActive ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    {item.id.includes("0.") ? (
                      <span className="text-xs text-slate-500 italic">Sincronizando...</span>
                    ) : (
                      <Link
                        href={`/dashboard/editor/${item.id}`}
                        className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-700 transition active:scale-95 inline-block cursor-pointer"
                      >
                        ✏️ Configurar Perfil
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CREACIÓN DE TARJETA VIRTUAL */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !isPending && setModalOpen(false)} />
          <form
            onSubmit={handleCreateCard}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full flex flex-col z-10 shadow-2xl relative"
          >
            
            {/* Cabecera */}
            <div className="p-6 border-b border-slate-850 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-extrabold text-white">Nueva Tarjeta Virtual</h3>
                <p className="text-xs text-slate-500">Crea una tarjeta y asígnala a un vendedor.</p>
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

              {/* Nombre de la tarjeta */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Nombre de la Tarjeta / Perfil
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Tarjeta de Ventas - Agustín Jara"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isPending}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-200 transition-all disabled:opacity-50"
                />
              </div>

              {/* URL Slug */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Enlace Personalizado (Slug URL)
                </label>
                <div className="flex items-center bg-slate-950 border border-slate-850 rounded-xl overflow-hidden focus-within:border-blue-500 transition-all">
                  <span className="text-slate-500 text-xs px-3 font-semibold select-none bg-slate-950/80 border-r border-slate-850/50 py-3">
                    c/
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="ej. agustin-jara"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    disabled={isPending}
                    className="flex-1 p-3 bg-transparent text-xs text-slate-200 focus:outline-none disabled:opacity-50 font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                  Solo letras, números y guiones. Se convertirá automáticamente a minúsculas.
                </p>
              </div>

              {/* Asignar a Vendedor */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Asignar a Vendedor
                </label>
                <select
                  value={userId}
                  required
                  onChange={(e) => setUserId(e.target.value)}
                  disabled={isPending}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-all cursor-pointer font-semibold disabled:opacity-50"
                >
                  <option value="">Selecciona un vendedor...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      👤 {u.name || "Vendedor"} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Pie de modal */}
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
                {isPending ? "Creando..." : "Crear Tarjeta"}
              </button>
            </div>

          </form>
        </div>
      )}
    </div>
  );
}
