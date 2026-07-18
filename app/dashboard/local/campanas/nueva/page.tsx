"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createLocalCampaignAction, updateLocalCampaignAction } from "../../actions";

export default function NuevaCampanaPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Estados del formulario
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [clubName, setClubName] = useState("");

  const [error, setError] = useState<string | null>(null);

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !slug || !businessName || !clubName) {
      setError("Por favor, completa todos los campos requeridos.");
      return;
    }

    startTransition(async () => {
      try {
        // 1. Crear campaña (Requisito 5)
        const createRes = await createLocalCampaignAction({ name, slug });
        if (createRes.success && createRes.campaign) {
          // 2. Poblar campos de identidad comercial iniciales
          await updateLocalCampaignAction(createRes.campaign.id, {
            name,
            businessName,
            clubName,
            primaryColor: "#2563eb",
            secondaryColor: "#d4af37",
            consentText: "Acepto suscribirme al club de beneficios y recibir novedades y promociones a través de mi número de WhatsApp."
          });

          // 3. Redirigir al editor
          router.push(`/dashboard/local/campanas/${createRes.campaign.id}`);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Ocurrió un error inesperado al registrar la campaña.";
        setError(errorMsg);
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Botón de retroceso */}
      <div>
        <Link
          href="/dashboard/local"
          className="text-xs text-slate-400 hover:text-slate-200 transition-all font-bold block mb-4"
        >
          ← Volver al Dashboard Local
        </Link>
        <h1 className="text-2xl font-black text-white tracking-tight">
          Registrar Nueva Campaña Local
        </h1>
        <p className="text-xs text-slate-400 font-medium">
          Configura un nuevo club de beneficios para captar suscriptores presenciales en tus locales.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl">
            ⚠️ {error}
          </div>
        )}

        {/* Campos obligatorios del MVP */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
                Nombre Interno de la Campaña
              </label>
              <input
                type="text"
                required
                placeholder="ej. Campaña Invierno 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-200 transition-all disabled:opacity-50"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">
                Identificador URL (Slug)
              </label>
              <input
                type="text"
                required
                placeholder="ej. mi-local-club"
                value={slug}
                onChange={handleSlugChange}
                disabled={isPending}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-200 font-mono transition-all disabled:opacity-50"
              />
              <span className="text-[9px] text-slate-500 block">Ruta: /club/{slug || "..."}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
                Nombre Comercial del Negocio
              </label>
              <input
                type="text"
                required
                placeholder="ej. Café Altura"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                disabled={isPending}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-200 transition-all disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider block">
                Nombre del Club de Fidelización
              </label>
              <input
                type="text"
                required
                placeholder="ej. Club Altura"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                disabled={isPending}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-200 transition-all disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
          <Link
            href="/dashboard/local"
            className="bg-slate-800 hover:bg-slate-750 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition shadow-md shadow-blue-600/10 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? "Registrando..." : "Crear Campaña y Continuar"}
          </button>
        </div>
      </form>

    </div>
  );
}
