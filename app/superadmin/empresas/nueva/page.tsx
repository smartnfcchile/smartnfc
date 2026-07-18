"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCompanyAction, getActiveLocalFounderLicensesCountAction } from "../../actions";

export default function NuevaCompanyPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [founderCount, setFounderCount] = useState<number>(0);

  // Cargar contador de licencias fundadoras activas
  useEffect(() => {
    getActiveLocalFounderLicensesCountAction()
      .then(setFounderCount)
      .catch(console.error);
  }, []);

  // Form State - Empresa
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  // Product Selection
  const [hasEmpresas, setHasEmpresas] = useState(true);
  const [hasLocal, setHasLocal] = useState(false);

  // Licencia Empresas State
  const [empresasPlan, setEmpresasPlan] = useState("EMPRESAS_CONECTA");
  const [empresasStatus, setEmpresasStatus] = useState("ACTIVE");
  const [includedIdentities, setIncludedIdentities] = useState(5);
  const [authorizedExtraIdentities, setAuthorizedExtraIdentities] = useState(0);
  const [empresasStartsAt, setEmpresasStartsAt] = useState("");
  const [empresasExpiresAt, setEmpresasExpiresAt] = useState("");

  // Licencia Local State
  const [localPlan, setLocalPlan] = useState("LOCAL_IMPULSA");
  const [localStatus, setLocalStatus] = useState("ACTIVE");
  const [includedCampaigns, setIncludedCampaigns] = useState(1);
  const [includedBranches, setIncludedBranches] = useState(1);
  const [includedTouchpoints, setIncludedTouchpoints] = useState(3);
  const [localStartsAt, setLocalStartsAt] = useState("");
  const [localExpiresAt, setLocalExpiresAt] = useState("");

  // Admin Account
  const [createAdmin, setCreateAdmin] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  // Sync Empresas plan limits on change
  useEffect(() => {
    if (empresasPlan === "EMPRESAS_CONECTA") {
      setIncludedIdentities(5);
    } else if (empresasPlan === "EMPRESAS_CRECE") {
      setIncludedIdentities(15);
    } else if (empresasPlan === "EMPRESAS_ESCALA") {
      setIncludedIdentities(30);
    } else if (empresasPlan === "EMPRESAS_CORPORATIVO") {
      setIncludedIdentities(100);
    }
  }, [empresasPlan]);

  // Sync Local plan limits on change
  useEffect(() => {
    if (localPlan === "LOCAL_IMPULSA" || localPlan === "LOCAL_FUNDADOR") {
      setIncludedCampaigns(1);
      setIncludedBranches(1);
      setIncludedTouchpoints(3);
    } else if (localPlan === "LOCAL_PERSONALIZADO") {
      setIncludedCampaigns(5);
      setIncludedBranches(5);
      setIncludedTouchpoints(15);
    }
  }, [localPlan]);

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !slug) {
      setError("El nombre de la empresa y el identificador (slug) son obligatorios.");
      return;
    }

    if (!hasEmpresas && !hasLocal) {
      setError("Debes seleccionar al menos un producto contratado (Empresas o Local) para la organización.");
      return;
    }

    setLoading(true);

    try {
      const empresasLicense = hasEmpresas
        ? {
            planCode: empresasPlan as any,
            status: empresasStatus as any,
            includedIdentities: Number(includedIdentities),
            authorizedExtraIdentities: Number(authorizedExtraIdentities),
            startsAt: empresasStartsAt || undefined,
            expiresAt: empresasExpiresAt || undefined,
          }
        : undefined;

      const localLicense = hasLocal
        ? {
            planCode: localPlan as any,
            status: localStatus as any,
            includedCampaigns: Number(includedCampaigns),
            includedBranches: Number(includedBranches),
            includedTouchpoints: Number(includedTouchpoints),
            startsAt: localStartsAt || undefined,
            expiresAt: localExpiresAt || undefined,
          }
        : undefined;

      const res = await createCompanyAction({
        name,
        slug,
        internalNotes: internalNotes || undefined,
        adminName: createAdmin ? adminName : undefined,
        adminEmail: createAdmin ? adminEmail : undefined,
        empresasLicense,
        localLicense,
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/superadmin/empresas"
          className="text-xs font-extrabold text-blue-650 dark:text-blue-400 hover:underline uppercase tracking-wider block mb-2"
        >
          ⬅️ Volver al listado
        </Link>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Registrar Nueva Empresa / Organización
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
          Crea una organización aislada y configura sus licencias de producto independientes.
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
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2.5">
            Datos Principales
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Nombre de la Empresa
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. SIDEP Chile"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Identificador URL (Slug único)
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={handleSlugChange}
                placeholder="ej-sidep-chile"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white font-mono"
              />
              <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-0.5">
                Dirección final: smartnfc.cl/c/<strong>{slug || "..."}</strong>
              </span>
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Selección de Productos Contratados
            </label>
            <div className="flex gap-6 mt-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={hasEmpresas}
                  onChange={(e) => setHasEmpresas(e.target.checked)}
                  className="rounded border-slate-350 dark:border-slate-800 text-blue-600 focus:ring-blue-600 h-4 w-4"
                />
                Smart NFC Empresas (B2B)
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={hasLocal}
                  onChange={(e) => setHasLocal(e.target.checked)}
                  className="rounded border-slate-350 dark:border-slate-800 text-blue-600 focus:ring-blue-600 h-4 w-4"
                />
                Smart NFC Local (B2C)
              </label>
            </div>
          </div>
        </div>

        {/* Sección Licencia Smart NFC Empresas */}
        {hasEmpresas && (
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 border-l-4 border-l-blue-500">
            <h3 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2.5">
              Licencia: Smart NFC Empresas
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Plan Contratado
                </label>
                <select
                  value={empresasPlan}
                  onChange={(e) => setEmpresasPlan(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
                >
                  <option value="EMPRESAS_CONECTA">Conecta</option>
                  <option value="EMPRESAS_CRECE">Crece</option>
                  <option value="EMPRESAS_ESCALA">Escala</option>
                  <option value="EMPRESAS_CORPORATIVO">Corporativo</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Identidades Incluidas
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={includedIdentities}
                  onChange={(e) => setIncludedIdentities(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Identidades Extra Autorizadas
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={authorizedExtraIdentities}
                  onChange={(e) => setAuthorizedExtraIdentities(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Estado Licencia
                </label>
                <select
                  value={empresasStatus}
                  onChange={(e) => setEmpresasStatus(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
                >
                  <option value="PENDING">Pendiente</option>
                  <option value="ACTIVE">Activa</option>
                  <option value="SUSPENDED">Suspendida</option>
                  <option value="EXPIRED">Vencida</option>
                  <option value="CANCELLED">Cancelada</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Fecha de Inicio
                </label>
                <input
                  type="date"
                  value={empresasStartsAt}
                  onChange={(e) => setEmpresasStartsAt(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  value={empresasExpiresAt}
                  onChange={(e) => setEmpresasExpiresAt(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Sección Licencia Smart NFC Local */}
        {hasLocal && (
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 border-l-4 border-l-amber-500">
            <h3 className="text-xs font-black text-amber-600 dark:text-amber-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2.5">
              Licencia: Smart NFC Local
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Plan Contratado
                </label>
                <select
                  value={localPlan}
                  onChange={(e) => setLocalPlan(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
                >
                  <option value="LOCAL_IMPULSA">Impulsa</option>
                  <option value="LOCAL_FUNDADOR">Cliente Fundador</option>
                  <option value="LOCAL_PERSONALIZADO">Personalizado</option>
                </select>
                {localPlan === "LOCAL_FUNDADOR" && (
                  <div className="mt-1.5 space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-405 block">
                      Licencias activas: {founderCount} de 5 recomendadas (Valdivia)
                    </span>
                    {founderCount >= 5 && (
                      <span className="text-[8.5px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded block leading-normal">
                        ⚠️ Advertencia: Ya se han asignado las 5 licencias promocionales de Cliente Fundador.
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Clubes/Campañas Incluidas
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  disabled={localPlan !== "LOCAL_PERSONALIZADO"}
                  value={includedCampaigns}
                  onChange={(e) => setIncludedCampaigns(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Sucursales Incluidas
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  disabled={localPlan !== "LOCAL_PERSONALIZADO"}
                  value={includedBranches}
                  onChange={(e) => setIncludedBranches(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Touchpoints QR/NFC Incluidos
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  disabled={localPlan !== "LOCAL_PERSONALIZADO"}
                  value={includedTouchpoints}
                  onChange={(e) => setIncludedTouchpoints(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white disabled:opacity-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Estado Licencia
                </label>
                <select
                  value={localStatus}
                  onChange={(e) => setLocalStatus(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
                >
                  <option value="PENDING">Pendiente</option>
                  <option value="ACTIVE">Activa</option>
                  <option value="SUSPENDED">Suspendida</option>
                  <option value="EXPIRED">Vencida</option>
                  <option value="CANCELLED">Cancelada</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Fecha de Inicio
                </label>
                <input
                  type="date"
                  value={localStartsAt}
                  onChange={(e) => setLocalStartsAt(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  value={localExpiresAt}
                  onChange={(e) => setLocalExpiresAt(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Sección Comentarios Administrativos */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Notas Internas Administrativas
            </label>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Escribe comentarios de contrato, facturación o detalles internos..."
              rows={3}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white resize-none"
            />
          </div>
        </div>

        {/* Sección Cuenta de Administrador Principal */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
              Administrador Principal de la Organización
            </h3>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-blue-600 dark:text-blue-400">
              <input
                type="checkbox"
                checked={createAdmin}
                onChange={(e) => setCreateAdmin(e.target.checked)}
                className="rounded border-slate-350 dark:border-slate-800 text-blue-600 focus:ring-blue-600 h-3.5 w-3.5"
              />
              Crear cuenta de administrador ahora
            </label>
          </div>

          {createAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required={createAdmin}
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Ej. Carlos Muñoz"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required={createAdmin}
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="ejemplo@sidep.cl"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Botones de Envío */}
        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/superadmin/empresas"
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 text-xs font-bold px-6 py-3 rounded-xl transition-all text-center"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-650 hover:bg-blue-600 text-white text-xs font-extrabold px-6 py-3 rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Registrando..." : "Registrar Organización"}
          </button>
        </div>
      </form>
    </div>
  );
}
