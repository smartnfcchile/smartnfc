"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, LockKeyhole, QrCode, X } from "lucide-react";
import { createCompleteCardSuperadminAction } from "../actions";

type Company = { id: string; name: string; slug: string | null };
type CompanyUser = { id: string; companyId: string; name: string | null; email: string; status: string };
type NfcStatus = "PENDIENTE_GRABACION" | "GRABADA" | "ENVIADA" | "ENTREGADA" | "ACTIVA" | "SUSPENDIDA";

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

export default function CreateCardWizard({ companies, companyUsers, onClose, onTechnicalMode }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [cardName, setCardName] = useState("");
  const [slug, setSlug] = useState("");
  const [companyId, setCompanyId] = useState(companies[0]?.id || "");
  const [ownerId, setOwnerId] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [status, setStatus] = useState<NfcStatus>("ENTREGADA");
  const [batchCode, setBatchCode] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ physicalCardId: string; slug: string; token: string; warning?: string | null } | null>(null);

  const users = companyUsers.filter(user => user.companyId === companyId);
  const ownerLabel = ownerId === "__new__" ? ownerName : users.find(user => user.id === ownerId)?.name || "";

  const next = () => {
    setError(null);
    if (step === 1 && (!cardName.trim() || !slug)) return setError("Escribe el nombre de la tarjeta y confirma su enlace.");
    if (step === 2 && (!companyId || !ownerId)) return setError("Selecciona una empresa y un propietario.");
    if (step === 2 && ownerId === "__new__" && (!ownerName.trim() || !ownerEmail.trim())) return setError("Completa el nombre y correo del nuevo propietario.");
    setStep(current => Math.min(3, current + 1));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCompleteCardSuperadminAction({
        companyId,
        cardName,
        slug,
        ownerId: ownerId === "__new__" ? undefined : ownerId,
        newOwnerName: ownerId === "__new__" ? ownerName : undefined,
        newOwnerEmail: ownerId === "__new__" ? ownerEmail : undefined,
        status,
        batchCode: batchCode || undefined,
        token: token || undefined
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
            <h2 id="create-card-title" className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">{created ? "Tarjeta creada" : "Crear tarjeta para un cliente"}</h2>
            {!created && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Perfil, propietario, NFC y QR en un proceso guiado.</p>}
          </div>
          <button type="button" onClick={onClose} disabled={isPending} aria-label="Cerrar" className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 disabled:opacity-50 dark:bg-slate-950 dark:hover:text-white"><X size={19} /></button>
        </header>

        <div className="p-5 sm:p-6">
          {created ? (
            <div className="space-y-5 py-2 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-600"><Check size={34} /></div>
              <div><h3 className="text-xl font-black text-slate-900 dark:text-white">Perfil, tarjeta y QR listos</h3><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">El propietario completará sus datos privados desde su cuenta.</p></div>
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
              <div className="mb-6 grid grid-cols-3 gap-2" aria-label="Progreso de creación">
                {["Nombre y enlace", "Empresa y propietario", "Crear y generar QR"].map((label, index) => {
                  const value = index + 1;
                  return <button type="button" key={label} onClick={() => value < step && setStep(value)} className={`rounded-xl px-2 py-3 text-[10px] font-bold sm:text-xs ${step === value ? "bg-blue-600 text-white shadow-md" : value < step ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-950"}`}><span>Paso {value}</span><span className="hidden sm:inline"> · {label}</span></button>;
                })}
              </div>

              {error && <div role="alert" className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300">{error}</div>}

              <form onSubmit={submit}>
                {step === 1 && <section className="space-y-5">
                  <div><h3 className="text-lg font-black text-slate-900 dark:text-white">Nombre y enlace público</h3><p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Este perfil será abierto por la tarjeta NFC y su QR.</p></div>
                  <div className="space-y-1.5"><label htmlFor="card-name" className="text-xs font-bold text-slate-800 dark:text-slate-200">Nombre de la tarjeta</label><input id="card-name" className={inputClass} value={cardName} onChange={event => { setCardName(event.target.value); setSlug(normalizeSlug(event.target.value.replace(/^perfil\s+(digital|comercial)\s+de\s+/i, ""))); }} placeholder="Ej. Perfil comercial de Camila Rojas" /><p className="text-[10px] text-slate-500">Sirve para reconocerla dentro del panel.</p></div>
                  <div className="space-y-1.5"><label htmlFor="card-slug" className="text-xs font-bold text-slate-800 dark:text-slate-200">Enlace personalizado</label><div className="flex min-h-12 overflow-hidden rounded-xl border border-slate-300 bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"><span className="flex items-center pl-3 text-xs text-slate-500">smartnfc.cl/c/</span><input id="card-slug" value={slug} onChange={event => setSlug(normalizeSlug(event.target.value))} className="min-w-0 flex-1 bg-transparent px-1 pr-3 text-sm font-mono text-slate-900 outline-none dark:text-white" placeholder="camila-rojas" /></div><p className="text-[10px] text-slate-500">Se genera automáticamente, pero puedes cambiarlo.</p></div>
                </section>}

                {step === 2 && <section className="space-y-5">
                  <div><h3 className="text-lg font-black text-slate-900 dark:text-white">Empresa y propietario</h3><p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Selecciona una persona existente o crea su acceso.</p></div>
                  <div className="space-y-1.5"><label htmlFor="card-company" className="text-xs font-bold text-slate-800 dark:text-slate-200">Empresa</label><select id="card-company" className={inputClass} value={companyId} onChange={event => { if (event.target.value === "__new_company__") { window.location.href = "/superadmin/empresas/nueva"; return; } setCompanyId(event.target.value); setOwnerId(""); }}><option value="">Selecciona una empresa</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}<option value="__new_company__">＋ Crear una empresa nueva</option></select></div>
                  <div className="space-y-1.5"><label htmlFor="card-owner" className="text-xs font-bold text-slate-800 dark:text-slate-200">Propietario del perfil</label><select id="card-owner" className={inputClass} value={ownerId} onChange={event => setOwnerId(event.target.value)}><option value="">Selecciona una persona</option>{users.map(user => <option key={user.id} value={user.id}>{user.name || user.email} · {user.email}</option>)}<option value="__new__">＋ Crear un perfil nuevo e invitar al propietario</option></select></div>
                  {ownerId === "__new__" && <div className="grid gap-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 sm:grid-cols-2"><div className="space-y-1.5"><label htmlFor="owner-name" className="text-xs font-bold text-slate-800 dark:text-slate-200">Nombre</label><input id="owner-name" className={inputClass} value={ownerName} onChange={event => setOwnerName(event.target.value)} placeholder="Ej. Paula Contreras" /></div><div className="space-y-1.5"><label htmlFor="owner-email" className="text-xs font-bold text-slate-800 dark:text-slate-200">Correo de invitación</label><input id="owner-email" type="email" className={inputClass} value={ownerEmail} onChange={event => setOwnerEmail(event.target.value)} placeholder="paula@empresa.cl" /></div></div>}
                  <div className="flex gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-200"><LockKeyhole className="shrink-0" size={19} /><div><p className="text-xs font-black">Información privada</p><p className="mt-1 text-[11px] leading-relaxed">El propietario completará sus datos, redes y contactos. El superadministrador solo gestiona su nombre, empresa y estado de activación.</p></div></div>
                </section>}

                {step === 3 && <section className="space-y-5">
                  <div><h3 className="text-lg font-black text-slate-900 dark:text-white">Revisar y crear</h3><p className="mt-1 text-xs text-slate-600 dark:text-slate-400">El código QR se generará automáticamente.</p></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[["Tarjeta", cardName], ["Enlace", `smartnfc.cl/c/${slug}`], ["Empresa", companies.find(company => company.id === companyId)?.name || ""], ["Propietario", ownerLabel]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"><span className="text-[10px] text-slate-500">{label.toUpperCase()}</span><p className="mt-1 break-all text-sm font-bold text-slate-900 dark:text-white">{value}</p></div>)}
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-purple-500/10 p-4 text-purple-800 dark:text-purple-200"><QrCode size={24} /><p className="text-xs font-semibold">Al crear la tarjeta verás el QR listo para descargar.</p></div>
                  <details className="rounded-2xl border border-slate-200 dark:border-slate-800"><summary className="cursor-pointer p-4 text-xs font-bold text-slate-700 dark:text-slate-300">Opciones técnicas avanzadas</summary><div className="grid gap-4 px-4 pb-4 sm:grid-cols-2"><div className="space-y-1.5"><label htmlFor="card-status" className="text-xs font-bold text-slate-700 dark:text-slate-300">Estado inicial</label><select id="card-status" className={inputClass} value={status} onChange={event => setStatus(event.target.value as NfcStatus)}><option value="PENDIENTE_GRABACION">Pendiente de grabación</option><option value="GRABADA">Grabada</option><option value="ENVIADA">Enviada</option><option value="ENTREGADA">Entregada</option><option value="ACTIVA">Activa</option><option value="SUSPENDIDA">Suspendida</option></select></div><div className="space-y-1.5"><label htmlFor="card-batch" className="text-xs font-bold text-slate-700 dark:text-slate-300">Lote</label><input id="card-batch" className={inputClass} value={batchCode} onChange={event => setBatchCode(event.target.value)} placeholder="Opcional" /></div><div className="space-y-1.5 sm:col-span-2"><label htmlFor="card-token" className="text-xs font-bold text-slate-700 dark:text-slate-300">Código del chip</label><input id="card-token" className={inputClass} value={token} onChange={event => setToken(event.target.value)} placeholder="Déjalo vacío para generarlo automáticamente" /></div></div></details>
                </section>}

                <div className="mt-7 flex justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                  <button type="button" onClick={() => step === 1 ? onClose() : setStep(current => current - 1)} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-slate-100 px-4 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{step > 1 && <ChevronLeft size={15} />}{step === 1 ? "Cancelar" : "Volver"}</button>
                  {step < 3 ? <button type="button" onClick={next} className="min-h-11 rounded-xl bg-blue-600 px-5 text-xs font-black text-white shadow-md hover:bg-blue-500">Continuar</button> : <button type="submit" disabled={isPending} className="min-h-11 rounded-xl bg-blue-600 px-5 text-xs font-black text-white shadow-md hover:bg-blue-500 disabled:opacity-50">{isPending ? "Creando..." : "Crear tarjeta y generar QR"}</button>}
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
