"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateCompanyAction, createAdminUserAction, resendInvitationAction } from "../../actions";

interface CompanyDetailClientProps {
  company: {
    id: string;
    name: string;
    slug: string | null;
    plan: string;
    maxIdentities: number;
    licenseStatus: string;
    internalNotes: string | null;
    isActive: boolean;
    createdAt: string;
    _count: { cards: number };
    productLicenses?: Array<{
      id: string;
      product: string;
      planCode: string;
      status: string;
      includedIdentities: number | null;
      authorizedExtraIdentities: number | null;
      includedCampaigns: number | null;
      includedBranches: number | null;
      includedTouchpoints: number | null;
      startsAt: string;
      expiresAt: string;
      notes: string | null;
    }>;
    users: Array<{
      id: string;
      name: string | null;
      email: string;
      role: string;
      isActive: boolean;
      status: string;
    }>;
  };
}

export default function CompanyDetailClient({ company }: CompanyDetailClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Find existing licenses
  const initialEmpresas = company.productLicenses?.find((l) => l.product === "EMPRESAS");
  const initialLocal = company.productLicenses?.find((l) => l.product === "LOCAL");

  // Selection states
  const [hasEmpresas, setHasEmpresas] = useState(!!initialEmpresas && initialEmpresas.status !== "CANCELLED");
  const [hasLocal, setHasLocal] = useState(!!initialLocal && initialLocal.status !== "CANCELLED");

  // General state
  const [name, setName] = useState(company.name);
  const [internalNotes, setInternalNotes] = useState(company.internalNotes || "");
  const [isActive, setIsActive] = useState(company.isActive);

  // Empresas states
  const [empresasPlan, setEmpresasPlan] = useState(initialEmpresas?.planCode || "EMPRESAS_CONECTA");
  const [empresasStatus, setEmpresasStatus] = useState(initialEmpresas?.status || "ACTIVE");
  const [includedIdentities, setIncludedIdentities] = useState(initialEmpresas?.includedIdentities ?? 5);
  const [authorizedExtraIdentities, setAuthorizedExtraIdentities] = useState(initialEmpresas?.authorizedExtraIdentities ?? 0);
  const [empresasStartsAt, setEmpresasStartsAt] = useState(initialEmpresas?.startsAt || "");
  const [empresasExpiresAt, setEmpresasExpiresAt] = useState(initialEmpresas?.expiresAt || "");

  // Local states
  const [localPlan, setLocalPlan] = useState(initialLocal?.planCode || "LOCAL_IMPULSA");
  const [localStatus, setLocalStatus] = useState(initialLocal?.status || "ACTIVE");
  const [includedCampaigns, setIncludedCampaigns] = useState(initialLocal?.includedCampaigns ?? 1);
  const [includedBranches, setIncludedBranches] = useState(initialLocal?.includedBranches ?? 1);
  const [includedTouchpoints, setIncludedTouchpoints] = useState(initialLocal?.includedTouchpoints ?? 3);
  const [localStartsAt, setLocalStartsAt] = useState(initialLocal?.startsAt || "");
  const [localExpiresAt, setLocalExpiresAt] = useState(initialLocal?.expiresAt || "");

  // Confirmation Modal State (Requisito 13)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<() => Promise<void>>();
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");

  // Create Admin State
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");

  // Sync Empresas plan limits on selector change (only for non-historic plans to avoid overriding dynamically imported historical records)
  useEffect(() => {
    if (empresasPlan === "EMPRESAS_CONECTA") {
      setIncludedIdentities(5);
    } else if (empresasPlan === "EMPRESAS_CRECE") {
      setIncludedIdentities(15);
    } else if (empresasPlan === "EMPRESAS_ESCALA") {
      setIncludedIdentities(30);
    }
  }, [empresasPlan]);

  // Sync Local plan limits on selector change (only if not customized)
  useEffect(() => {
    if (localPlan === "LOCAL_IMPULSA" || localPlan === "LOCAL_FUNDADOR") {
      setIncludedCampaigns(1);
      setIncludedBranches(1);
      setIncludedTouchpoints(3);
    }
  }, [localPlan]);

  const triggerConfirmation = (title: string, message: string, action: () => Promise<void>) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setPendingAction(() => action);
    setShowConfirmModal(true);
  };

  const handleUpdateCompany = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

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
        : initialEmpresas
          ? {
              // Si se desmarcó, se deshabilita administrativamente (cancelada)
              planCode: initialEmpresas.planCode as any,
              status: "CANCELLED" as any,
              includedIdentities: Number(initialEmpresas.includedIdentities),
              authorizedExtraIdentities: Number(initialEmpresas.authorizedExtraIdentities),
              startsAt: initialEmpresas.startsAt || undefined,
              expiresAt: initialEmpresas.expiresAt || undefined,
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
        : initialLocal
          ? {
              // Si se desmarcó, se deshabilita administrativamente (cancelada)
              planCode: initialLocal.planCode as any,
              status: "CANCELLED" as any,
              includedCampaigns: Number(initialLocal.includedCampaigns),
              includedBranches: Number(initialLocal.includedBranches),
              includedTouchpoints: Number(initialLocal.includedTouchpoints),
              startsAt: initialLocal.startsAt || undefined,
              expiresAt: initialLocal.expiresAt || undefined,
            }
          : undefined;

      const res = await updateCompanyAction(company.id, {
        name,
        internalNotes: internalNotes || undefined,
        isActive,
        empresasLicense,
        localLicense,
      });

      if (!res.success) {
        setError(res.error || "Error al actualizar la empresa.");
        return;
      }

      setSuccess("Organización y licencias actualizadas con éxito.");
      router.refresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error al actualizar la empresa.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName || !newAdminEmail || !newAdminPassword) {
      setError("Faltan campos para registrar al administrador.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await createAdminUserAction({
        companyId: company.id,
        name: newAdminName,
        email: newAdminEmail,
        passwordPlain: newAdminPassword,
      });

      if (!res.success) {
        setError(res.error || "Error al registrar al administrador.");
        return;
      }

      setSuccess("Administrador principal creado con éxito.");
      setNewAdminName("");
      setNewAdminEmail("");
      setNewAdminPassword("");
      setShowAdminForm(false);
      router.refresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error al registrar al administrador.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Cabecera */}
      <div>
        <Link
          href="/superadmin/empresas"
          className="text-xs font-extrabold text-blue-650 dark:text-blue-400 hover:underline uppercase tracking-wider block mb-2"
        >
          ⬅️ Volver al listado
        </Link>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Organización: {company.name}
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
          ID único: <span className="font-mono">{company.id}</span> | Identificador: <span className="font-semibold text-slate-700 dark:text-slate-350">{company.slug}</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Izquierdo: Configuración e independiente de licencias (7 de 12 col) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Datos Generales */}
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2.5">
              Datos Principales
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Nombre Empresa
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-850 p-4 rounded-xl">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Acceso al Dashboard
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block leading-tight">
                    Desactívalo para bloquear el acceso a todos los usuarios de la organización.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-250 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-650"></div>
                </label>
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Selección de Productos Habilitados
              </label>
              <div className="flex gap-6 mt-1">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={hasEmpresas}
                    onChange={(e) => setHasEmpresas(e.target.checked)}
                    className="rounded border-slate-350 dark:border-slate-800 text-blue-600 focus:ring-blue-600 h-4 w-4"
                  />
                  Smart NFC Empresas
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={hasLocal}
                    onChange={(e) => setHasLocal(e.target.checked)}
                    className="rounded border-slate-350 dark:border-slate-800 text-blue-600 focus:ring-blue-600 h-4 w-4"
                  />
                  Smart NFC Local
                </label>
              </div>
            </div>
          </div>

          {/* Licencia Empresas */}
          {hasEmpresas && (
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 border-l-4 border-l-blue-500">
              <h3 className="text-xs font-black text-blue-650 dark:text-blue-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2.5">
                Licencia: Smart NFC Empresas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Plan
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
                    <option value="EMPRESAS_HISTORICO">Plan histórico</option>
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
                    disabled={empresasPlan === "EMPRESAS_HISTORICO" && initialEmpresas?.includedIdentities === null}
                    value={includedIdentities}
                    onChange={(e) => setIncludedIdentities(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white disabled:opacity-50"
                  />
                  {empresasPlan === "EMPRESAS_HISTORICO" && (
                    <span className="text-[8.5px] text-slate-400 dark:text-slate-550 block">Uso legacy: {company.maxIdentities} identidades en tabla principal.</span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
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
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider block">
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
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
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
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
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

          {/* Licencia Local */}
          {hasLocal && (
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 border-l-4 border-l-amber-500">
              <h3 className="text-xs font-black text-amber-650 dark:text-amber-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2.5">
                Licencia: Smart NFC Local
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                    Plan
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
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                    Clubes/Campañas
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
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                    Sucursales
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
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider block">
                    Touchpoints
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
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
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
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
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
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
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

          {/* Notas Administrativas */}
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Notas Administrativas Internas
              </label>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={3}
                placeholder="Notas de facturación o contrato..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white resize-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  triggerConfirmation(
                    "Actualizar Licencia / Estado",
                    `¿Estás seguro de que deseas guardar los cambios para la empresa "${company.name}"? Se registrará la auditoría correspondiente en el sistema.`,
                    handleUpdateCompany
                  )
                }
                className="bg-blue-650 hover:bg-blue-600 text-white text-xs font-extrabold px-6 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                {loading ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Miembros y Admins (5 de 12 col) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Listado de Usuarios */}
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                Integrantes y Roles
              </h3>
              <button
                onClick={() => setShowAdminForm(!showAdminForm)}
                className="text-[10px] font-bold text-blue-605 dark:text-blue-400 hover:underline uppercase tracking-wider"
              >
                {showAdminForm ? "Cancelar" : "➕ Agregar Admin"}
              </button>
            </div>

            {showAdminForm && (
              <form onSubmit={handleCreateAdmin} className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-850 p-4 rounded-xl space-y-3">
                <h4 className="text-[10px] font-black text-slate-700 dark:text-slate-350 uppercase tracking-widest leading-none">
                  Nuevo Admin Principal
                </h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="Nombre completo"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
                  />
                  <input
                    type="email"
                    required
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="Correo corporativo"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
                  />
                  <input
                    type="password"
                    required
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="Contraseña inicial"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold py-2 rounded-lg transition-all cursor-pointer"
                >
                  Registrar Admin
                </button>
              </form>
            )}

            <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-3 pt-1">
              {company.users.length === 0 ? (
                <div className="text-center text-slate-450 italic py-4 text-xs">
                  No hay usuarios asignados a esta empresa.
                </div>
              ) : (
                company.users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between pt-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{u.name || "Usuario"}</div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block">{u.email}</span>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-650 dark:text-slate-400">
                        {u.role}
                      </span>
                      {u.status === "PENDING" ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[8px] text-amber-600 dark:text-amber-400 font-extrabold uppercase leading-none bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/10">Pendiente</span>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={async () => {
                              setLoading(true);
                              setError(null);
                              setSuccess(null);
                              try {
                                await resendInvitationAction(u.id);
                                setSuccess(`Invitación reenviada con éxito a ${u.email}`);
                              } catch (err: unknown) {
                                const errorMsg = err instanceof Error ? err.message : "Error al reenviar invitación.";
                                setError(errorMsg);
                              } finally {
                                setLoading(false);
                              }
                            }}
                            className="px-1.5 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[8px] font-black uppercase leading-none cursor-pointer transition-all"
                          >
                            Reenviar
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`block text-[9px] font-semibold mt-1 ${
                            u.isActive ? "text-emerald-500" : "text-rose-500"
                          }`}
                        >
                          {u.isActive ? "Activo" : "Suspendido"}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación Genérico */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              {confirmTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
              {confirmMessage}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="bg-slate-100 hover:bg-slate-250 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 text-xs font-bold px-4 py-2 rounded-lg transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setShowConfirmModal(false);
                  if (pendingAction) await pendingAction();
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-5 py-2 rounded-lg shadow-md transition-all cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
