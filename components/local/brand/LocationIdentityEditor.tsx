"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { ArrowLeft, Building2, Check, CircleAlert, Eye, Globe, ImagePlus, LoaderCircle, MapPin, Palette, Pencil, Phone, Store } from "lucide-react";
import { BRAND_DEFAULT_PRIMARY, BRAND_DEFAULT_SECONDARY, BRAND_LIMITS, contrastRatio, locationIdentitySchema, normalizePhone, resolveLocalBrand,
  type BrandCampaignSource } from "../../../lib/local/brand";
import { saveLocationIdentityAction } from "../../../app/dashboard/local/locales/actions";
import LocalIdentityPreview from "../public/LocalIdentityPreview";
import MobileDeviceFrame from "./MobileDeviceFrame";
import BrandImageField from "./BrandImageField";
import BrandColorField from "./BrandColorField";

export type IdentityFormValues = {
  name: string; address: string; displayName: string; shortDescription: string; logoUrl: string; coverImageUrl: string;
  primaryColor: string; secondaryColor: string; phone: string; websiteUrl: string; mapsUrl: string;
};
type Props = {
  locationId: string; companyName: string; initial: IdentityFormValues; brandUpdatedAt: string | null;
  campaignFallback: BrandCampaignSource | null; campaignFallbackName: string | null;
};

const inputClass = (error?: string) =>
  `block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 dark:bg-slate-950 dark:text-slate-100 ${
    error ? "border-rose-400 dark:border-rose-500/70" : "border-slate-300 dark:border-slate-700"}`;

function Section({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{icon}</span>
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Field({ id, label, hint, error, counter, children }: { id: string; label: string; hint?: string; error?: string; counter?: [number, number]; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</label>
        {counter && <span className={`text-[11px] tabular-nums ${counter[0] > counter[1] ? "text-rose-600" : "text-slate-400"}`}>{counter[0]}/{counter[1]}</span>}
      </div>
      {hint && <p id={`${id}-hint`} className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      <div className="mt-2">{children}</div>
      {error && <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}

function IconInput({ icon, ...props }: { icon: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
      <input {...props} className={`${props.className} pl-10`} />
    </div>
  );
}

export default function LocationIdentityEditor({ locationId, companyName, initial, brandUpdatedAt, campaignFallback, campaignFallbackName }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<IdentityFormValues>(initial);
  const [saved, setSaved] = useState<IdentityFormValues>(initial);
  const [version, setVersion] = useState<string | null>(brandUpdatedAt);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [banner, setBanner] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = useMemo(() => (Object.keys(values) as Array<keyof IdentityFormValues>).some(k => values[k] !== saved[k]), [values, saved]);
  const schema = useMemo(() => locationIdentitySchema(locationId), [locationId]);
  const validation = useMemo(() => schema.safeParse(values), [schema, values]);
  const clientErrors = useMemo(() => {
    const out: Record<string, string> = {};
    if (!validation.success) for (const issue of validation.error.issues) out[String(issue.path[0])] ??= issue.message;
    return out;
  }, [validation]);
  const errorFor = (key: keyof IdentityFormValues) => serverErrors[key] || (touched[key] ? clientErrors[key] : undefined);

  // La vista previa usa la misma función de resolución que usarán las páginas públicas.
  const brand = useMemo(() => resolveLocalBrand({
    location: {
      name: values.name, address: values.address, displayName: values.displayName, shortDescription: values.shortDescription,
      logoUrl: values.logoUrl, coverImageUrl: values.coverImageUrl, primaryColor: values.primaryColor, secondaryColor: values.secondaryColor,
      phone: normalizePhone(values.phone),
      websiteUrl: clientErrors.websiteUrl ? null : values.websiteUrl, mapsUrl: clientErrors.mapsUrl ? null : values.mapsUrl,
    },
    campaign: campaignFallback, company: { name: companyName },
  }), [values, clientErrors, campaignFallback, companyName]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function set<K extends keyof IdentityFormValues>(key: K, value: IdentityFormValues[K]) {
    setValues(v => ({ ...v, [key]: value }));
    setServerErrors(e => { const { [key]: _removed, ...rest } = e; void _removed; return rest; });
    setBanner(null);
  }
  const blur = (key: keyof IdentityFormValues) => () => setTouched(t => ({ ...t, [key]: true }));
  const bind = (key: keyof IdentityFormValues) => ({
    id: `identity-${key}`, value: values[key], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value),
    onBlur: blur(key), "aria-invalid": !!errorFor(key),
    "aria-describedby": [errorFor(key) && `identity-${key}-error`].filter(Boolean).join(" ") || undefined,
  });

  function save() {
    setTouched(Object.fromEntries(Object.keys(values).map(k => [k, true])));
    if (!validation.success) { setBanner({ kind: "error", text: "Revisa los campos marcados antes de guardar." }); return; }
    startTransition(async () => {
      const result = await saveLocationIdentityAction(locationId, values, version);
      if (result.ok) {
        setSaved(values); setVersion(result.brandUpdatedAt); setServerErrors({});
        setBanner({ kind: "success", text: "Identidad guardada. Se aplicará a las experiencias de este local." });
        router.refresh();
      } else {
        setServerErrors(result.fieldErrors ?? {});
        setBanner({ kind: "error", text: result.error });
      }
    });
  }

  const fallbackName = brand.sources.displayName === "location" && values.displayName ? null
    : campaignFallback?.businessName || values.name || companyName;
  const contrast = contrastRatio(brand.primaryColor, brand.onPrimary);

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      {/* Encabezado */}
      <div className="z-20 -mx-4 lg:sticky lg:top-0 border-b border-slate-200/70 bg-slate-50/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 dark:border-slate-800 dark:bg-[#07101F]/85">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href="/dashboard/local/locales" onClick={e => { if (dirty) { e.preventDefault(); setLeaveTo("/dashboard/local/locales"); } }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
              <ArrowLeft aria-hidden className="h-3.5 w-3.5" /> Mis locales
            </Link>
            <h1 className="mt-0.5 truncate text-xl font-bold tracking-tight text-slate-900 dark:text-white">Identidad digital · {values.name || "Local"}</h1>
          </div>
          <div className="hidden items-center gap-2.5 lg:flex">
            <span aria-live="polite" className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${
              dirty ? "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"}`}>
              {dirty ? <><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Cambios sin guardar</> : <><Check aria-hidden className="h-3.5 w-3.5" /> Guardado</>}
            </span>
            {dirty && (
              <button type="button" onClick={() => { setValues(saved); setServerErrors({}); setTouched({}); setBanner(null); }} disabled={pending}
                className="h-10 rounded-xl px-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800">
                Descartar
              </button>
            )}
            <button type="button" onClick={save} disabled={pending || !dirty}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {pending ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" /> : <Check aria-hidden className="h-4 w-4" />}
              {pending ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
        {banner && (
          <div role={banner.kind === "error" ? "alert" : "status"} className={`mt-3 flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium ${
            banner.kind === "error" ? "bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200" : "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"}`}>
            {banner.kind === "error" ? <CircleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /> : <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />}
            {banner.text}
          </div>
        )}
      </div>

      {/* Selector móvil Editar / Vista previa */}
      <div className="lg:hidden" role="tablist" aria-label="Modo del editor">
        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/70">
          {([["edit", "Editar", <Pencil key="e" aria-hidden className="h-4 w-4" />], ["preview", "Vista previa", <Eye key="p" aria-hidden className="h-4 w-4" />]] as const).map(([key, label, icon]) => (
            <button key={key} role="tab" aria-selected={mobileView === key} type="button" onClick={() => setMobileView(key)}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition ${
                mobileView === key ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
              {icon}{label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className={`space-y-5 ${mobileView === "preview" ? "hidden lg:block" : ""}`}>
          <Section icon={<Store aria-hidden className="h-[18px] w-[18px]" />} title="Marca" description="Cómo se presenta tu local a quien escanea un NFC o QR.">
            <Field id="identity-displayName" label="Nombre comercial" error={errorFor("displayName")} counter={[values.displayName.length, BRAND_LIMITS.displayName]}
              hint={fallbackName ? `Si lo dejas vacío se mostrará “${fallbackName}”.` : undefined}>
              <input {...bind("displayName")} maxLength={BRAND_LIMITS.displayName + 20} placeholder="Ej.: Café Demo" className={inputClass(errorFor("displayName"))} />
            </Field>
            <Field id="identity-shortDescription" label="Descripción corta" error={errorFor("shortDescription")} counter={[values.shortDescription.length, BRAND_LIMITS.shortDescription]}
              hint="Una frase que explique qué ofrece el local.">
              <textarea {...bind("shortDescription")} rows={3} maxLength={BRAND_LIMITS.shortDescription + 40} placeholder="Ej.: Café de especialidad y pastelería artesanal en el centro."
                className={`${inputClass(errorFor("shortDescription"))} resize-none`} />
            </Field>
          </Section>

          <Section icon={<ImagePlus aria-hidden className="h-[18px] w-[18px]" />} title="Imágenes" description="Logo y portada que acompañarán todas las experiencias del local.">
            <BrandImageField id="identity-logoUrl" kind="logo" locationId={locationId} label="Logo" value={values.logoUrl} error={errorFor("logoUrl")}
              hint="Cuadrado, idealmente 512 × 512 px con fondo claro o transparente." onChange={url => set("logoUrl", url)} />
            <BrandImageField id="identity-coverImageUrl" kind="cover" locationId={locationId} label="Portada" value={values.coverImageUrl} error={errorFor("coverImageUrl")}
              hint="Horizontal, idealmente 1200 × 600 px. Sin portada usamos un degradado con tus colores." onChange={url => set("coverImageUrl", url)} />
          </Section>

          <Section icon={<Palette aria-hidden className="h-[18px] w-[18px]" />} title="Colores" description="Se usan en botones, íconos y degradados de la experiencia.">
            <BrandColorField id="identity-primaryColor" label="Color principal" hint="Botón principal e íconos." value={values.primaryColor}
              fallback={brand.sources.primaryColor === "location" ? BRAND_DEFAULT_PRIMARY : brand.primaryColor} error={errorFor("primaryColor")}
              onChange={v => { set("primaryColor", v); setTouched(t => ({ ...t, primaryColor: true })); }} />
            <BrandColorField id="identity-secondaryColor" label="Color secundario" hint="Degradado de la portada cuando no hay imagen." value={values.secondaryColor}
              fallback={brand.sources.secondaryColor === "location" ? BRAND_DEFAULT_SECONDARY : brand.secondaryColor} error={errorFor("secondaryColor")}
              onChange={v => { set("secondaryColor", v); setTouched(t => ({ ...t, secondaryColor: true })); }} />
            <div className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-xs leading-relaxed ${contrast >= 4.5 ? "bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300" : "bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"}`}>
              <span aria-hidden className="mt-0.5 flex h-5 w-8 shrink-0 items-center justify-center rounded-md text-[10px] font-bold" style={{ backgroundColor: brand.primaryColor, color: brand.onPrimary }}>Aa</span>
              <span>
                El texto sobre el color principal se muestra en {brand.onPrimary === "#ffffff" ? "blanco" : "oscuro"} automáticamente (contraste {contrast.toFixed(1)}:1).
                {contrast < 4.5 && " Este color es difícil de leer: prueba un tono más oscuro o más claro."}
              </span>
            </div>
          </Section>

          <Section icon={<Phone aria-hidden className="h-[18px] w-[18px]" />} title="Contacto y ubicación" description="Opcional. Se ofrecen como accesos directos en las experiencias del local.">
            <Field id="identity-phone" label="Teléfono" error={errorFor("phone")} hint="Con o sin código de país. Ej.: +56 9 1234 5678">
              <IconInput icon={<Phone className="h-4 w-4" />} {...bind("phone")} type="tel" inputMode="tel" autoComplete="off" placeholder="+56 9 1234 5678" className={inputClass(errorFor("phone"))} />
            </Field>
            <Field id="identity-websiteUrl" label="Sitio web" error={errorFor("websiteUrl")}>
              <IconInput icon={<Globe className="h-4 w-4" />} {...bind("websiteUrl")} type="url" inputMode="url" placeholder="https://www.ejemplo.cl" className={inputClass(errorFor("websiteUrl"))} />
            </Field>
            <Field id="identity-mapsUrl" label="Enlace del mapa" error={errorFor("mapsUrl")} hint="En Google Maps: busca tu local → Compartir → Copiar enlace.">
              <IconInput icon={<MapPin className="h-4 w-4" />} {...bind("mapsUrl")} type="url" inputMode="url" placeholder="https://maps.app.goo.gl/…" className={inputClass(errorFor("mapsUrl"))} />
            </Field>
          </Section>

          <Section icon={<Building2 aria-hidden className="h-[18px] w-[18px]" />} title="Datos del local" description="Identifican el local dentro de tu panel. La dirección también se muestra al público.">
            <Field id="identity-name" label="Nombre interno" error={errorFor("name")} hint="Ej.: Sucursal centro. Obligatorio.">
              <input {...bind("name")} required maxLength={BRAND_LIMITS.name} className={inputClass(errorFor("name"))} />
            </Field>
            <Field id="identity-address" label="Dirección" error={errorFor("address")}>
              <IconInput icon={<MapPin className="h-4 w-4" />} {...bind("address")} maxLength={BRAND_LIMITS.address} placeholder="Calle Demo 123, Ciudad" className={inputClass(errorFor("address"))} />
            </Field>
          </Section>

          {campaignFallbackName && (
            <p className="px-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Los campos vacíos se completan con la campaña “{campaignFallbackName}” de este local. El Club conserva su propia configuración.
            </p>
          )}
        </div>

        <aside className={`${mobileView === "edit" ? "hidden lg:block" : ""}`}>
          <div className="lg:sticky lg:top-24">
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Vista previa móvil</p>
              {dirty && <p className="text-xs text-slate-400">Sin guardar</p>}
            </div>
            <MobileDeviceFrame>
              <LocalIdentityPreview brand={brand} />
            </MobileDeviceFrame>
            <p className="mx-auto mt-3 max-w-[360px] text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Así se verá la cabecera de las experiencias de este local. Las acciones de cada Punto Inteligente se configurarán en su propio editor.
            </p>
          </div>
        </aside>
      </div>

      {/* Barra inferior fija en móvil: guardar siempre al alcance */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md lg:hidden dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex items-center justify-between gap-3">
          <span aria-live="polite" className={`text-xs font-semibold ${dirty ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}`}>
            {dirty ? "Cambios sin guardar" : "Todo guardado"}
          </span>
          <button type="button" onClick={save} disabled={pending || !dirty}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50">
            {pending ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" /> : <Check aria-hidden className="h-4 w-4" />}
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {leaveTo && (
        <div role="dialog" aria-modal="true" aria-labelledby="leave-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 id="leave-title" className="text-base font-semibold text-slate-900 dark:text-white">¿Salir sin guardar?</h3>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Los cambios de identidad que no guardaste se perderán.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" autoFocus onClick={() => setLeaveTo(null)} className="h-10 rounded-xl px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Seguir editando</button>
              <button type="button" onClick={() => { const to = leaveTo; setLeaveTo(null); setSaved(values); router.push(to); }}
                className="h-10 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700">Salir sin guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
