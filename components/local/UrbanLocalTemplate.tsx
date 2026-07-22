"use client";

import React from "react";

export type UrbanTemplateData = {
  logoUrl?: string | null;
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const secondaryColor = data.secondaryColor || "#d4af37";

  return (
    <div className="w-full max-w-[380px] mx-auto border border-slate-200 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-2xl bg-white text-slate-900 relative min-h-[640px] flex flex-col justify-between p-6">
      
      {/* Indicador de Vista Previa (Solo en modo preview) */}
      {mode === "preview" && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-blue-600/10 border border-blue-600/30 text-blue-700 text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase select-none z-10">
          Vista Previa
        </div>
      )}

      {/* Contenedor Scrollable */}
      <div className="flex-1 overflow-y-auto space-y-5 pt-6 pb-4 scrollbar-none">
        
        {/* Cabecera / Identidad */}
        <div className="text-center space-y-2 mt-2">
          {data.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.logoUrl}
              alt="Logo"
              className="w-16 h-16 object-cover mx-auto rounded-full border border-slate-200 shadow-sm"
            />
          ) : (
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold shadow-inner border border-slate-200 dark:border-slate-700">
              {data.businessName ? data.businessName.charAt(0).toUpperCase() : "L"}
            </div>
          )}

          {data.clubName && (
            <span
              style={{ backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}40`, color: primaryColor }}
              className="inline-block px-3 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider animate-pulse"
            >
              {data.clubName}
            </span>
          )}

          <h2 className="text-xl font-black tracking-tight text-slate-900 leading-tight">
            {data.businessName || "Nombre del Negocio"}
          </h2>
        </div>

        {/* Titulares */}
        <div className="text-center space-y-1">
          <h3 className="text-sm font-extrabold text-slate-800 leading-snug">
            {data.headline || "¡Bienvenido al Club!"}
          </h3>
          <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
            {data.subheadline || "Suscríbete y activa tu beneficio exclusivo en segundos."}
          </p>
        </div>

        {/* Beneficio Destacado */}
        <div
          style={{ borderColor: `${primaryColor}30`, background: `linear-gradient(135deg, #ffffff, #fafafa)` }}
          className="border p-4 rounded-2xl shadow-sm space-y-2 relative overflow-hidden"
        >
          <div
            style={{ backgroundColor: primaryColor, color: "white" }}
            className="absolute top-0 right-0 px-3 py-1 text-[8px] font-black rounded-bl-xl uppercase tracking-wider"
          >
            {data.benefitLabel || "Beneficio"}
          </div>

          <div className="space-y-1 pt-2">
            <h4 style={{ color: primaryColor }} className="text-base font-black tracking-tight">
              {data.benefitTitle || "Título del Beneficio"}
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
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
            className="space-y-3 pt-1"
          >
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
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white focus:outline-none text-xs text-slate-900 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white focus:outline-none text-xs text-slate-900 transition-all disabled:opacity-60 disabled:cursor-not-allowed font-mono"
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
                className="w-full py-3 rounded-xl text-white font-extrabold text-[11px] uppercase tracking-wider transition-all select-none shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? "Registrando..." : "Activar mi beneficio"}
              </button>
            ) : (
              <button
                type="button"
                disabled
                style={{ backgroundColor: primaryColor }}
                className="w-full py-3 rounded-xl text-white font-extrabold text-[11px] uppercase tracking-wider transition-all select-none opacity-80 cursor-not-allowed"
              >
                Activar mi beneficio
              </button>
            )}
          </form>
        )}

      </div>

      {/* Footer del Local */}
      <div className="pt-3 border-t border-slate-200 text-center space-y-1">
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
