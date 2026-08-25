"use client";

import React from "react";

export type UrbanTemplateData = {
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  businessName?: string | null;
  clubName?: string | null;
  headline?: string | null;
  subheadline?: string | null;
  address?: string | null;
  primaryColor: string;
  secondaryColor: string;
  benefitLabel?: string | null;
  benefitTitle?: string | null;
  benefitDescription?: string | null;
  benefitConditions?: string | null;
  consentText?: string | null;
  whatsappNumber?: string | null;
};

type UrbanLocalTemplateProps = {
  data: UrbanTemplateData;
  mode: "preview" | "public";
  
  // Props para el formulario en modo público
  formName?: string;
  formWhatsapp?: string;
  consentAccepted?: boolean;
  onFormNameChange?: (val: string) => void;
  onFormWhatsappChange?: (val: string) => void;
  onConsentAcceptedChange?: (val: boolean) => void;
  onSubmit?: (e: React.FormEvent) => void;
  isSubmitting?: boolean;
  isSuccess?: boolean;
  whatsappLink?: string;
  error?: string | null;
  slug?: string;
};

export default function UrbanLocalTemplate({
  data,
  mode,
  formName = "",
  formWhatsapp = "",
  consentAccepted = false,
  onFormNameChange,
  onFormWhatsappChange,
  onConsentAcceptedChange,
  onSubmit,
  isSubmitting = false,
  isSuccess = false,
  whatsappLink = "",
  error = null,
  slug = ""
}: UrbanLocalTemplateProps) {
  const primaryColor = data.primaryColor || "#2563eb";
  const secondaryColor = data.secondaryColor || "#d4af37";

  return (
    <div
      style={{
        background: `linear-gradient(180deg, ${primaryColor}12 0%, #ffffff 30%, #ffffff 100%)`,
        borderColor: `${primaryColor}35`
      }}
      className="w-full max-w-[380px] mx-auto border rounded-[32px] overflow-hidden shadow-2xl bg-white text-slate-900 relative min-h-[640px] flex flex-col"
    >
      
      {/* Indicador de Vista Previa (Solo en modo preview) */}
      {mode === "preview" && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/90 border border-white/60 text-slate-900 text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase select-none z-30 shadow-sm backdrop-blur">
          Vista Previa
        </div>
      )}

      {/* Portada visual */}
      <div
        style={{
          background: data.heroImageUrl
            ? `linear-gradient(180deg, rgba(2,6,23,.08), rgba(2,6,23,.72)), url("${data.heroImageUrl}") center / cover`
            : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
        }}
        className="relative h-40 shrink-0 overflow-hidden"
      >
        {!data.heroImageUrl && (
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 0 1px, transparent 1px)", backgroundSize: "12px 12px" }} />
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute left-5 bottom-4 text-white">
          <p className="text-[9px] uppercase font-black tracking-[0.22em] opacity-80">Beneficios del local</p>
          <p className="text-sm font-black tracking-tight line-clamp-1">{data.clubName || "Club de beneficios"}</p>
        </div>
      </div>

      {/* Contenedor Scrollable */}
      <div className="flex-1 overflow-y-auto px-5 pb-5 scrollbar-none">
        
        {/* Cabecera / Identidad */}
        <div className="text-center space-y-2 -mt-9 relative z-20">
          {data.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.logoUrl}
              alt={`Logo de ${data.businessName || "la empresa"}`}
              className="w-[76px] h-[76px] object-cover mx-auto rounded-full border-4 border-white shadow-xl bg-white"
            />
          ) : (
            <div className="w-[76px] h-[76px] bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto text-2xl font-black shadow-xl border-4 border-white">
              {data.businessName ? data.businessName.charAt(0).toUpperCase() : "L"}
            </div>
          )}

          {data.clubName && (
            <span
              style={{ backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}40`, color: primaryColor }}
              className="inline-block px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider"
            >
              {data.clubName}
            </span>
          )}

          <h2 className="text-xl font-black tracking-tight text-slate-900 leading-tight">
            {data.businessName || "Nombre del Negocio"}
          </h2>
        </div>

        {/* Titulares */}
        <div className="text-center space-y-1.5 mt-7 px-1">
          <h3 className="text-lg font-black text-slate-900 leading-tight">
            {data.headline || "¡Bienvenido al Club!"}
          </h3>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            {data.subheadline || "Suscríbete y activa tu beneficio exclusivo en segundos."}
          </p>
        </div>

        {/* Beneficio Destacado */}
        <div
          style={{ borderColor: `${primaryColor}45`, background: `linear-gradient(135deg, ${primaryColor}13, #ffffff 68%)` }}
          className="border p-5 rounded-2xl shadow-lg space-y-2 relative overflow-hidden mt-6"
        >
          <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: primaryColor }} />
          <div
            style={{ backgroundColor: primaryColor, color: "white" }}
            className="absolute top-0 right-0 px-3 py-1.5 text-[8px] font-black rounded-bl-xl uppercase tracking-wider"
          >
            {data.benefitLabel || "Beneficio"}
          </div>

          <div className="space-y-1 pt-2">
            <h4 style={{ color: primaryColor }} className="text-lg font-black tracking-tight leading-tight pr-12">
              {data.benefitTitle || "Título del Beneficio"}
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed font-semibold">
              {data.benefitDescription || "Descripción del beneficio que recibirá el cliente."}
            </p>
          </div>
        </div>

        {/* Flujo condicional: Éxito vs Formulario */}
        {isSuccess ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl text-center space-y-4 animate-fadeIn">
            <div className="text-3xl text-emerald-600">🎉</div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-white">¡Ya eres parte del Club!</h4>
              <p className="text-[11px] text-slate-400 font-medium leading-normal">
                Completa estos pasos para asegurarte de recibir nuestras ofertas.
              </p>
            </div>
            
            <div className="space-y-2.5 text-left pt-2">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Paso 1: Guarda el local</span>
                <a
                  href={`/club/${slug || "slug"}/contacto.vcf`}
                  className="inline-flex w-full items-center justify-center py-2.5 px-4 bg-slate-900 border border-slate-800 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider transition hover:scale-[1.01] active:scale-95 text-center cursor-pointer"
                >
                  📥 Guardar contacto del local
                </a>
              </div>

              <div className="space-y-1 pt-1.5">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Paso 2: Confirma tu suscripción</span>
                {whatsappLink && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ backgroundColor: "#25d366" }}
                    className="inline-flex w-full items-center justify-center py-2.5 px-4 rounded-xl text-white font-extrabold text-[11px] uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition hover:scale-[1.01] active:scale-95 text-center cursor-pointer"
                  >
                    💬 Confirmar por WhatsApp
                  </a>
                )}
                <span className="text-[9px] text-slate-500 font-medium block text-center leading-normal pt-1">
                  Para recibir las difusiones, guarda nuestro contacto y envía este mensaje.
                </span>
              </div>
            </div>
          </div>
        ) : (
          <form
            onSubmit={mode === "public" ? onSubmit : (e) => e.preventDefault()}
            style={{ borderColor: `${primaryColor}25`, boxShadow: `0 14px 34px ${primaryColor}12` }}
            className="space-y-3 mt-6 p-4 rounded-2xl border bg-white"
          >
            <div className="space-y-1 pb-1">
              <p className="text-sm font-black text-slate-900">Quiero mi beneficio</p>
              <p className="text-[10px] text-slate-500 font-medium">Déjanos tus datos y actívalo en menos de un minuto.</p>
            </div>
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-700 text-[10px] font-bold rounded-xl leading-normal">
                ⚠️ {error}
              </div>
            )}

            {/* Input de Nombre */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block">
                Tu Nombre
              </label>
              <input
                type="text"
                required
                disabled={mode === "preview" || isSubmitting}
                placeholder="ej. Juan Pérez"
                value={mode === "public" ? formName : ""}
                onChange={(e) => onFormNameChange?.(e.target.value)}
                style={{ borderColor: `${primaryColor}35` }}
                className="w-full p-3 rounded-xl bg-slate-50 border focus:bg-white focus:outline-none text-xs text-slate-900 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {/* Input de WhatsApp */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block">
                Tu WhatsApp
              </label>
              <input
                type="tel"
                required
                disabled={mode === "preview" || isSubmitting}
                placeholder="ej. 9XXXXXXXX"
                value={mode === "public" ? formWhatsapp : ""}
                onChange={(e) => onFormWhatsappChange?.(e.target.value)}
                style={{ borderColor: `${primaryColor}35` }}
                className="w-full p-3 rounded-xl bg-slate-50 border focus:bg-white focus:outline-none text-xs text-slate-900 transition-all disabled:opacity-60 disabled:cursor-not-allowed font-mono"
              />
            </div>

            {/* Consentimiento */}
            <div className="flex items-start gap-2 pt-1">
              <input
                id="consent-check"
                type="checkbox"
                required
                disabled={mode === "preview" || isSubmitting}
                checked={mode === "public" ? consentAccepted : true}
                onChange={(e) => onConsentAcceptedChange?.(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 h-3.5 w-3.5 focus:ring-blue-500 focus:ring-offset-0 disabled:opacity-60"
              />
              <label htmlFor="consent-check" className="text-[9.5px] text-slate-700 leading-snug font-medium select-none cursor-pointer">
                {data.consentText || "Acepto los términos y el envío de mensajes."}
              </label>
            </div>

            {/* Honeypot invisible para spam */}
            <div className="hidden" aria-hidden="true">
              <input
                type="text"
                name="honeypot"
                tabIndex={-1}
                autoComplete="off"
                placeholder="No rellenar"
              />
            </div>

            {/* Botón de envío */}
            {mode === "public" ? (
              <button
                type="submit"
                disabled={isSubmitting}
                style={{ backgroundColor: primaryColor }}
                className="w-full py-3.5 rounded-xl text-white font-black text-xs uppercase tracking-wider transition-all select-none shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? "Registrando..." : "Activar mi beneficio"}
              </button>
            ) : (
              <button
                type="button"
                disabled
                style={{ backgroundColor: primaryColor }}
                className="w-full py-3.5 rounded-xl text-white font-black text-xs uppercase tracking-wider transition-all select-none opacity-90 cursor-not-allowed shadow-lg"
              >
                Activar mi beneficio
              </button>
            )}
          </form>
        )}

      </div>

      {/* Footer del Local */}
      <div className="mx-5 py-4 border-t border-slate-200 text-center space-y-1">
        {data.address && (
          <p className="text-[9px] text-slate-600 font-medium">
            📍 {data.address}
          </p>
        )}
        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
          Tecnología Smart NFC
        </p>
      </div>

    </div>
  );
}
