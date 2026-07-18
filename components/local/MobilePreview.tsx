"use client";

import React from "react";

type CampaignState = {
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

type MobilePreviewProps = {
  campaign: CampaignState;
};

export default function MobilePreview({ campaign }: MobilePreviewProps) {
  const primaryColor = campaign.primaryColor || "#2563eb";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const secondaryColor = campaign.secondaryColor || "#d4af37";

  return (
    <div className="w-full max-w-[360px] mx-auto border border-slate-200 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-2xl bg-white text-slate-850 relative aspect-[9/18] flex flex-col justify-between p-6">
      
      {/* Indicador de Vista Previa */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-blue-600/10 border border-blue-600/20 text-blue-600 text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase select-none z-10">
        Vista Previa
      </div>

      {/* Contenedor Scrollable */}
      <div className="flex-1 overflow-y-auto space-y-5 pt-6 pb-4 scrollbar-none">
        
        {/* Cabecera / Identidad */}
        <div className="text-center space-y-2 mt-2">
          {campaign.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={campaign.logoUrl}
              alt="Logo"
              className="w-14 h-14 object-cover mx-auto rounded-full border border-slate-100 shadow-sm"
            />
          ) : (
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center mx-auto text-xl font-bold shadow-inner">
              {campaign.businessName ? campaign.businessName.charAt(0).toUpperCase() : "L"}
            </div>
          )}

          {campaign.clubName && (
            <span
              style={{ backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}30`, color: primaryColor }}
              className="inline-block px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wider"
            >
              {campaign.clubName}
            </span>
          )}

          <h2 className="text-lg font-black tracking-tight text-slate-900 leading-tight">
            {campaign.businessName || "Nombre del Negocio"}
          </h2>
        </div>

        {/* Titulares */}
        <div className="text-center space-y-1">
          <h3 className="text-sm font-extrabold text-slate-800 leading-snug">
            {campaign.headline || "¡Bienvenido al Club!"}
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            {campaign.subheadline || "Suscríbete y activa tu beneficio exclusivo en segundos."}
          </p>
        </div>

        {/* Tarjeta del beneficio (Urban Template Style) */}
        <div
          style={{ borderColor: `${primaryColor}20`, background: `linear-gradient(135deg, white, #fafafa)` }}
          className="border p-4 rounded-2xl shadow-sm space-y-2 relative overflow-hidden"
        >
          {/* Badge del beneficio */}
          <div
            style={{ backgroundColor: primaryColor, color: "white" }}
            className="absolute top-0 right-0 px-3 py-1 text-[8px] font-black rounded-bl-xl uppercase tracking-wider"
          >
            {campaign.benefitLabel || "Beneficio"}
          </div>

          <div className="space-y-1 pt-2">
            <h4 style={{ color: primaryColor }} className="text-sm font-black tracking-tight">
              {campaign.benefitTitle || "Título del Beneficio"}
            </h4>
            <p className="text-[11px] text-slate-650 leading-relaxed font-medium">
              {campaign.benefitDescription || "Descripción del beneficio que recibirá el cliente."}
            </p>
          </div>

          {campaign.benefitConditions && (
            <div className="pt-2 border-t border-slate-100 text-[8px] text-slate-400 font-medium italic leading-normal">
              * Condiciones: {campaign.benefitConditions}
            </div>
          )}
        </div>

        {/* Formulario Visual */}
        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              Tu Nombre
            </label>
            <input
              type="text"
              disabled
              placeholder="ej. Juan Pérez"
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-400 cursor-not-allowed select-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              Tu WhatsApp
            </label>
            <input
              type="text"
              disabled
              placeholder="ej. 9XXXXXXXX"
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-400 cursor-not-allowed select-none"
            />
          </div>

          {/* Checkbox de consentimiento */}
          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              disabled
              checked
              className="mt-0.5 rounded border-slate-300 text-blue-600 h-3.5 w-3.5 cursor-not-allowed"
            />
            <label className="text-[9px] text-slate-550 leading-normal font-medium select-none">
              {campaign.consentText || "Acepto los términos y el envío de mensajes."}
            </label>
          </div>
        </div>

        {/* Botón de envío */}
        <button
          type="button"
          disabled
          style={{ backgroundColor: primaryColor }}
          className="w-full py-3 rounded-xl text-white font-extrabold text-[10px] uppercase tracking-wider transition-all select-none shadow-md shadow-blue-500/10 cursor-not-allowed opacity-90"
        >
          Activar mi beneficio
        </button>

      </div>

      {/* Footer del Local */}
      <div className="pt-3 border-t border-slate-100 text-center space-y-1">
        {campaign.address && (
          <p className="text-[9px] text-slate-400 font-medium">
            📍 {campaign.address}
          </p>
        )}
        <p className="text-[8px] text-slate-350 font-semibold uppercase tracking-wider">
          Tecnología Smart NFC
        </p>
      </div>

    </div>
  );
}
