"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCompanyAction } from "../../actions";
import { PlanType } from "@prisma/client";

export default function NuevaCompanyPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState<PlanType>(PlanType.FREE);
  const [maxIdentities, setMaxIdentities] = useState(5);
  const [licenseStatus, setLicenseStatus] = useState("ACTIVE");
  const [internalNotes, setInternalNotes] = useState("");

  // Admin account state (Alternativa B)
  const [createAdmin, setCreateAdmin] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) {
      setError("El nombre de la empresa y el identificador (slug) son obligatorios.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await createCompanyAction({
        name,
        slug,
        plan,
        maxIdentities: Number(maxIdentities),
        licenseStatus,
        internalNotes: internalNotes || undefined,
        adminName: createAdmin ? adminName : undefined,
        adminEmail: createAdmin ? adminEmail : undefined,
      });

      if (res.emailWarning) {
        setWarning(res.emailWarning);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/superadmin/empresas");
        }, 1500);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Ocurrió un error inesperado al registrar la empresa.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/superadmin/empresas"
          className="text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:underline uppercase tracking-wider block mb-2"
        >
          ⬅️ Volver al listado
        </Link>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Registrar Nueva Empresa Inquilina
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
          Crea una nueva organización aislada (Tenant) y configura su plan de licencias inicial.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-xl">
            🎉 ¡Empresa creada con éxito! Redireccionando...
          </div>
        )}

        {warning && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-xl space-y-2">
            <p>⚠️ {warning}</p>
            <Link
              href="/superadmin/empresas"
              className="inline-block px-3 py-1.5 bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-lg text-[10px] font-black uppercase transition-all"
            >
              Ir al listado de empresas
            </Link>
          </div>
        )}

        {/* Sección Datos Empresa */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-white/5 pb-2.5">
            Datos Principales
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                Nombre de la Empresa
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. SIDEP Chile"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                Identificador URL (Slug único)
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={handleSlugChange}
                placeholder="ej-sidep-chile"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white font-mono"
              />
              <span className="text-[9px] text-slate-400 block mt-0.5">
                Dirección final: smartnfc.cl/c/<strong>{slug || "..."}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Sección Modelo Comercial / Licencia */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-white/5 pb-2.5">
            Licencia y Capacidades (Requisito 9)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                Plan
              </label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as PlanType)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
              >
                <option value="FREE">FREE</option>
                <option value="STARTER">STARTER</option>
                <option value="PRO">PRO</option>
                <option value="BUSINESS">BUSINESS</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                Identidades Incluidas
              </label>
              <input
                type="number"
                required
                min={1}
                value={maxIdentities}
                onChange={(e) => setMaxIdentities(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                Estado Licencia
              </label>
              <select
                value={licenseStatus}
                onChange={(e) => setLicenseStatus(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
              >
                <option value="ACTIVE">ACTIVE (Activo comercial)</option>
                <option value="TRIAL">TRIAL (Demostración/Prueba)</option>
                <option value="SUSPENDED">SUSPENDED (Bloqueo de acceso)</option>
                <option value="CANCELLED">CANCELLED (Cancelado permanente)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
              Notas Internas Administrativas
            </label>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Escribe comentarios de contrato, facturación o detalles internos..."
              rows={3}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white resize-none"
            />
          </div>
        </div>

        {/* Sección Cuenta de Administrador Principal */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2.5">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
              Administrador Principal (Alternativa B)
            </h3>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-blue-600 dark:text-blue-400">
              <input
                type="checkbox"
                checked={createAdmin}
                onChange={(e) => setCreateAdmin(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-600 h-3.5 w-3.5"
              />
              Crear ahora
            </label>
          </div>

          {createAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider block">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required={createAdmin}
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Ej. Carlos Muñoz"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider block">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required={createAdmin}
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="ejemplo@sidep.cl"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Botones de Envío */}
        <div className="flex justify-end gap-3">
          <Link
            href="/superadmin/empresas"
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold px-6 py-3 rounded-xl transition-all text-center"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-6 py-3 rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Registrando..." : "Registrar Empresa"}
          </button>
        </div>
      </form>
    </div>
  );
}
