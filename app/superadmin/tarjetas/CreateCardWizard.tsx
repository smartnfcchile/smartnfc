"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, LockKeyhole, QrCode, X } from "lucide-react";
import { createCorporateCardSuperadminAction } from "./actions";

type Company = { id: string; name: string; slug: string | null };
type CompanyUser = { id: string; companyId: string; name: string | null; email: string; status: string; role?: string };
type NfcStatus = "PENDIENTE_GRABACION" | "GRABADA" | "ENVIADA" | "ENTREGADA" | "ACTIVA" | "SUSPENDIDA";
type NewOwnerRole = "COMPANY_ADMIN" | "COLLABORATOR";

type Props = {
  companies: Company[];
  companyUsers: CompanyUser[];
  onClose: () => void;
  onTechnicalMode: () => void;
};

const inputClass = "w-full min-h-12 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500";

function normalizeSlug(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function roleLabelForExisting(role?: string) {
  if (role === "COMPANY_OWNER") return "Propietario de empresa (no se modifica)";
  if (role === "COMPANY_ADMIN") return "Administrador de empresa (no se modifica)";
  if (role === "COLLABORATOR") return "Colaborador (no se modifica)";
  return "Rol existente (no se modifica)";
}

export default function CreateCardWizard({ companies, companyUsers, onClose, onTechnicalMode }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [companyId, setCompanyId] = useState(companies[0]?.id || "");
  const [ownerId, setOwnerId] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [newOwnerRole, setNewOwnerRole] = useState<NewOwnerRole>("COLLABORATOR");
  const [cardName, setCardName] = useState("");
  const [cardNameTouched, setCardNameTouched] = useState(false);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [status, setStatus] = useState<NfcStatus>("PENDIENTE_GRABACION");
  const [batchCode, setBatchCode] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ physicalCardId: string; slug: string; token: string; warning?: string | null } | null>(null);

  const company = companies.find(item => item.id === companyId);
  const users = companyUsers.filter(user => user.companyId === companyId);
  const existingOwner = users.find(user => user.id === ownerId);
  const personName = ownerId === "__new__" ? ownerName : existingOwner?.name || existingOwner?.email || "";
  const roleLabel = ownerId === "__new__"
    ? (newOwnerRole === "COMPANY_ADMIN" ? "Administrador de empresa" : "Colaborador")
    : roleLabelForExisting(existingOwner?.role);

  function applySuggestedIdentity(nextCompanyId: string, nextOwnerId: string, nextOwnerName: string) {
    const nextCompany = companies.find(item => item.id === nextCompanyId);
    const nextUsers = companyUsers.filter(user => user.companyId === nextCompanyId);
    const nextExistingOwner = nextUsers.find(user => user.id === nextOwnerId);
    const nextPersonName = nextOwnerId === "__new__"
      ? nextOwnerName
      : nextExistingOwner?.name || nextExistingOwner?.email || "";

    if (!slugTouched) {
      setSlug(normalizeSlug(`${nextCompany?.name || ""}-${nextPersonName}`));
    }
    if (!cardNameTouched) {
      setCardName(nextPersonName ? `Perfil digital de ${nextPersonName}` : "");
    }
  }

  const next = () => {
    setError(null);
    if (step === 1 && !companyId) return setError("Selecciona una empresa.");
    if (step === 2 && !ownerId) return setError("Selecciona una persona o crea una nueva.");
    if (step === 2 && ownerId === "__new__" && (!ownerName.trim() || !ownerEmail.trim())) return setError("Completa el nombre y correo de la nueva persona.");
    if (step === 3 && (!cardName.trim() || !slug)) return setError("Confirma el nombre de la tarjeta y su enlace público.");
    setStep(current => Math.min(4, current + 1));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCorporateCardSuperadminAction({
        companyId,
        cardName,
        slug,
        ownerId: ownerId === "__new__" ? undefined : ownerId,
        newOwnerName: ownerId === "__new__" ? ownerName : undefined,
        newOwnerEmail: ownerId === "__new__" ? ownerEmail : undefined,
        newOwnerRole: ownerId === "__new__" ? newOwnerRole : undefined,
        status,
        batchCode: batchCode || undefined,
        token: token || undefined,
      });
      if (!result.success || !result.physicalCardId || !result.slug || !result.token) {
        setError(result.error || "No fue posible crear la tarjeta.");
        return;
      }
      setCreated({ physicalCardId: result.physicalCardId, slug: result.slug, token: result.token, warning: result.emailWarning });
      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6">
      <div role="dialog" aria-modal="true" aria-labelledby="create-card-title" className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:p-6">
          <div>
            <h2 id="create-card-title" className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">{created ? "Tarjeta creada" : "Crear tarjeta corporativa"}</h2>
            {!created && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Empresa → persona → rol → identidad pública → tarjeta NFC.</p>}
          </div>
          <button type="button" onClick={onClose} disabled={isPending} aria-label="Cerrar" className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 disabled:opacity-50 dark:bg-slate-950 dark:hover:text-white"><X size={19} /></button>
        </header>

        <div className="p-5 sm:p-6">
          {created ? (
            <div className="space-y-5 py-2 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-600"><Check size={34} /></div>
              <div><h3 className="text-xl font-black text-slate-900 dark:text-white">Perfil, tarjeta y QR listos</h3><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">La persona podrá completar su perfil desde Mi Tarjeta según la política de edición definida por su empresa.</p></div>
              {created.warning && <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-700 dark:text-amber-300">{created.warning}</p>}
              <div className="mx-auto max-w-sm space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                <Image unoptimized src={`/api/superadmin/physical-cards/${created.physicalCardId}/qr`} width={192} height={192} alt="Código QR de la tarjeta creada" className="mx-auto rounded-xl bg-white p-2" />
                <p className="break-all font-mono text-xs text-slate-700 dark:text-slate-300">smartnfc.cl/c/{created.slug}</p>
              </div>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <a href={`/api/superadmin/physical-cards/${created.physicalCardId}/qr?download=1`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white">Descargar QR</a>
                <button type="button" onClick={onClose} className="min-h-11 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">Volver al inventario</button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-4 gap-2" aria-label="Progreso de creación">
                {["Empresa", "Persona y rol", "Identidad", "Crear"].map((label, index) => {
                  const value = index + 1;
                  return <button type="button" key={label} onClick={() => value < step && setStep(value)} className={`rounded-xl px-2 py-3 text-[10px] font-bold sm:text-xs ${step === value ? "bg-blue-600 text-white shadow-md" : value < step ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-950"}`}><span>Paso {value}</span><span className="hidden sm:inline"> · {label}</span></button>;
                })}
              </div>

              {error && <div role="alert" className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300">{error}</div>}

              <form onSubmit={submit}>
                {step === 1 && <section className="space-y-5">
                  <div><h3 className="text-lg font-black text-slate-900 dark:text-white">1. Empresa</h3><p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Primero define a qué organización pertenecerán la persona y su tarjeta.</p></div>
                  <div className="space-y-1.5"><label htmlFor="card-company" className="text-xs font-bold text-slate-800 dark:text-slate-200">Empresa</label><select id="card-company" className={inputClass} value={companyId} onChange={event => { const nextCompanyId = event.target.value; if (nextCompanyId === "__new_company__") { window.location.href = "/superadmin/empresas/nueva"; return; } setCompanyId(nextCompanyId); setOwnerId(""); setOwnerName(""); setOwnerEmail(""); setSlugTouched(false); setCardNameTouched(false); setSlug(""); setCardName(""); }}><option value="">Selecciona una empresa</option>{companies.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}<option value="__new_company__">＋ Crear una empresa nueva</option></select></div>
                </section>}

                {step === 2 && <section className="space-y-5">
                  <div><h3 className="text-lg font-black text-slate-900 dark:text-white">2. Persona y rol</h3><p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Asignar una tarjeta no cambia el rol de una persona existente.</p></div>
                  <div className="space-y-1.5"><label htmlFor="card-owner" className="text-xs font-bold text-slate-800 dark:text-slate-200">Persona</label><select id="card-owner" className={inputClass} value={ownerId} onChange={event => { const nextOwnerId = event.target.value; setOwnerId(nextOwnerId); setSlugTouched(false); setCardNameTouched(false); applySuggestedIdentity(companyId, nextOwnerId, ownerName); }}><option value="">Selecciona una persona</option>{users.map(user => <option key={user.id} value={user.id}>{user.name || user.email} · {user.email}</option>)}<option value="__new__">＋ Crear una persona nueva e invitarla</option></select></div>
                  {ownerId === "__new__" && <div className="space-y-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><label htmlFor="owner-name" className="text-xs font-bold text-slate-800 dark:text-slate-200">Nombre completo</label><input id="owner-name" className={inputClass} value={ownerName} onChange={event => { const nextName = event.target.value; setOwnerName(nextName); applySuggestedIdentity(companyId, "__new__", nextName); }} placeholder="Ej. Paula Contreras" /></div><div className="space-y-1.5"><label htmlFor="owner-email" className="text-xs font-bold text-slate-800 dark:text-slate-200">Correo de invitación</label><input id="owner-email" type="email" className={inputClass} value={ownerEmail} onChange={event => setOwnerEmail(event.target.value)} placeholder="paula@empresa.cl" /></div></div><div className="space-y-1.5"><label htmlFor="owner-role" className="text-xs font-bold text-slate-800 dark:text-slate-200">Rol en SmartNFC</label><select id="owner-role" className={inputClass} value={newOwnerRole} onChange={event => setNewOwnerRole(event.target.value as NewOwnerRole)}><option value="COLLABORATOR">Colaborador · edición según política de su empresa</option><option value="COMPANY_ADMIN">Administrador de empresa · gestiona integrantes y tarjetas de su empresa</option></select><p className="text-[10px] text-slate-500">El Superadmin es el único que puede crear este rol administrativo desde este asistente. Nunca se puede asignar SUPERADMIN aquí.</p></div></div>}
                  <div className="flex gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-200"><LockKeyhole className="shrink-0" size={19} /><div><p className="text-xs font-black">Rol y tarjeta son cosas distintas</p><p className="mt-1 text-[11px] leading-relaxed">Una persona puede ser Administrador y tener su propia tarjeta. La tarjeta determina su perfil público; el rol determina sus permisos. La empresa además puede definir una política de edición corporativa.</p></div></div>
                </section>}

                {step === 3 && <section className="space-y-5">
                  <div><h3 className="text-lg font-black text-slate-900 dark:text-white">3. Identidad pública</h3><p className="mt-1 text-xs text-slate-600 dark:text-slate-400">SmartNFC propone el enlace usando empresa + persona. Puedes editarlo antes de crear la tarjeta.</p></div>
                  <div className="space-y-1.5"><label htmlFor="card-name" className="text-xs font-bold text-slate-800 dark:text-slate-200">Nombre interno de la tarjeta</label><input id="card-name" className={inputClass} value={cardName} onChange={event => { setCardNameTouched(true); setCardName(event.target.value); }} placeholder="Ej. Perfil digital de Paula Contreras" /></div>
                  <div className="space-y-1.5"><label htmlFor="card-slug" className="text-xs font-bold text-slate-800 dark:text-slate-200">Enlace personalizado</label><div className="flex min-h-12 overflow-hidden rounded-xl border border-slate-300 bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"><span className="flex items-center pl-3 text-xs text-slate-500">smartnfc.cl/c/</span><input id="card-slug" value={slug} onChange={event => { setSlugTouched(true); setSlug(normalizeSlug(event.target.value)); }} className="min-w-0 flex-1 bg-transparent px-1 pr-3 text-sm font-mono text-slate-900 outline-none dark:text-white" placeholder="empresa-paula-contreras" /></div><p className="text-[10px] text-slate-500">El backend garantiza que sea único. Si ya existe, añadirá automáticamente -2, -3, etc.</p></div>
                </section>}

                {step === 4 && <section className="space-y-5">
                  <div><h3 className="text-lg font-black text-slate-900 dark:text-white">4. Revisar y crear</h3><p className="mt-1 text-xs text-slate-600 dark:text-slate-400">La tarjeta física quedará por defecto Pendiente de grabación.</p></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[["Empresa", company?.name || ""], ["Persona", personName], ["Rol", roleLabel], ["Tarjeta", cardName], ["Enlace", `smartnfc.cl/c/${slug}`]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"><span className="text-[10px] text-slate-500">{label.toUpperCase()}</span><p className="mt-1 break-all text-sm font-bold text-slate-900 dark:text-white">{value}</p></div>)}
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-purple-500/10 p-4 text-purple-800 dark:text-purple-200"><QrCode size={24} /><p className="text-xs font-semibold">Se generará automáticamente el QR y el identificador de la tarjeta física.</p></div>
                  <details className="rounded-2xl border border-slate-200 dark:border-slate-800"><summary className="cursor-pointer p-4 text-xs font-bold text-slate-700 dark:text-slate-300">Opciones técnicas avanzadas</summary><div className="grid gap-4 px-4 pb-4 sm:grid-cols-2"><div className="space-y-1.5"><label htmlFor="card-status" className="text-xs font-bold text-slate-700 dark:text-slate-300">Estado inicial</label><select id="card-status" className={inputClass} value={status} onChange={event => setStatus(event.target.value as NfcStatus)}><option value="PENDIENTE_GRABACION">Pendiente de grabación</option><option value="GRABADA">Grabada</option><option value="ENVIADA">Enviada</option><option value="ENTREGADA">Entregada</option><option value="ACTIVA">Activa</option><option value="SUSPENDIDA">Suspendida</option></select></div><div className="space-y-1.5"><label htmlFor="card-batch" className="text-xs font-bold text-slate-700 dark:text-slate-300">Lote</label><input id="card-batch" className={inputClass} value={batchCode} onChange={event => setBatchCode(event.target.value)} placeholder="Opcional" /></div><div className="space-y-1.5 sm:col-span-2"><label htmlFor="card-token" className="text-xs font-bold text-slate-700 dark:text-slate-300">Código del chip</label><input id="card-token" className={inputClass} value={token} onChange={event => setToken(event.target.value)} placeholder="Déjalo vacío para generarlo automáticamente" /></div></div></details>
                </section>}

                <div className="mt-7 flex justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                  <button type="button" onClick={() => step === 1 ? onClose() : setStep(current => current - 1)} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-slate-100 px-4 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{step > 1 && <ChevronLeft size={15} />}{step === 1 ? "Cancelar" : "Volver"}</button>
                  {step < 4 ? <button type="button" onClick={next} className="min-h-11 rounded-xl bg-blue-600 px-5 text-xs font-black text-white shadow-md hover:bg-blue-500">Continuar</button> : <button type="submit" disabled={isPending} className="min-h-11 rounded-xl bg-blue-600 px-5 text-xs font-black text-white shadow-md hover:bg-blue-500 disabled:opacity-50">{isPending ? "Creando..." : "Crear tarjeta y generar QR"}</button>}
                </div>
              </form>

              <button type="button" onClick={onTechnicalMode} className="mt-4 text-[10px] font-semibold text-slate-500 underline hover:text-blue-600">Registrar solamente una tarjeta física</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
