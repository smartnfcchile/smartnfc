/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import LeadForm from "../../app/c/[slug]/LeadForm";
import TrackButton from "../../app/c/[slug]/TrackButton";
import { 
  normalizeTemplate, 
  normalizePhotoStyle, 
  normalizeBannerStyle,
  NormalizedTemplate,
  NormalizedPhotoStyle,
  NormalizedBannerStyle
} from "../../lib/templates";

export interface CardLinkData {
  id: string;
  title: string;
  url: string;
  order: number;
  isActive: boolean;
}

export interface CardProfileCompanyData {
  name: string;
  isActive: boolean;
}

export interface CardProfileData {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  themeColor: string;
  themeMode: string;
  template: string;
  bannerStyle: string;
  photoStyle: string;
  logoUrl: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  profileName: string | null;
  role: string | null;
  companyName: string | null;
  bio: string | null;
  location: string | null;
  videoUrl: string | null;
  videoTitle: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  tiktok: string | null;
  youtube: string | null;
  showEmail: boolean;
  showPhone: boolean;
  showWhatsapp: boolean;
  showInstagram: boolean;
  showFacebook: boolean;
  showLinkedin: boolean;
  showTiktok: boolean;
  showYoutube: boolean;
  company: CardProfileCompanyData;
  links: CardLinkData[];

  // Captura de datos
  shareContactEnabled: boolean;
  shareContactButtonText: string;
  shareContactIntro: string;
  shareContactConfirm: string;
  shareContactConsent: string;
  shareContactFields?: any;
  primaryActionType: string;
  secondaryActionType: string;
}

export interface CardProfileViewProps {
  card: CardProfileData;
  isPreview?: boolean;
}

function formatPhone(phone?: string | null) {
  if (!phone) return null;
  return phone.replace(/\s+/g, "");
}

function getSafeVideoEmbedUrl(videoUrl?: string | null) {
  if (!videoUrl) return null;

  try {
    const url = new URL(videoUrl);

    if (url.hostname.includes("youtube.com")) {
      const videoId = url.searchParams.get("v");
      if (!videoId) return null;
      return `https://www.youtube.com/embed/${videoId}`;
    }

    if (url.hostname.includes("youtu.be")) {
      const videoId = url.pathname.replace("/", "");
      if (!videoId) return null;
      return `https://www.youtube.com/embed/${videoId}`;
    }

    if (url.hostname.includes("vimeo.com")) {
      const videoId = url.pathname.replace("/", "");
      if (!videoId) return null;
      return `https://player.vimeo.com/video/${videoId}`;
    }

    return null;
  } catch {
    return null;  
  }
}

export default function CardProfileView({ card, isPreview = false }: CardProfileViewProps) {
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);

  // Normalizar opciones visuales mediante módulo centralizado
  const normTemplate: NormalizedTemplate = normalizeTemplate(card.template);
  const normPhotoStyle: NormalizedPhotoStyle = normalizePhotoStyle(card.photoStyle);
  const normBannerStyle: NormalizedBannerStyle = normalizeBannerStyle(card.bannerStyle, card.template);

  const themeColor = card.themeColor || "#2563eb";

  // Determinar si la plantilla es de estilo claro
  const isLightTemplate = normTemplate === "classic-light" || normTemplate === "company-light";
  const actualIsDark = !isLightTemplate;

  // Generación de vCard
  const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${card.profileName ?? card.name}
ORG:${card.companyName ?? card.company.name}
TITLE:${card.role ?? ""}
TEL:${card.phone ?? ""}
EMAIL:${card.email ?? ""}
END:VCARD`;
  
  const vcardUrl = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`;

  // Formateo de canales de contacto
  const whatsapp = card.showWhatsapp ? formatPhone(card.whatsapp) : null;
  const phone = card.showPhone ? formatPhone(card.phone) : null;
  const safeVideoUrl = getSafeVideoEmbedUrl(card.videoUrl);

  // Enlaces sociales visibles
  const socialLinks = [
    { label: "LinkedIn", href: card.showLinkedin ? card.linkedin : null },
    { label: "Instagram", href: card.showInstagram ? card.instagram : null },
    { label: "Facebook", href: card.showFacebook ? card.facebook : null },
    { label: "TikTok", href: card.showTiktok ? card.tiktok : null },
    { label: "YouTube", href: card.showYoutube ? card.youtube : null },
  ].filter((item) => Boolean(item.href));

  // Control de imágenes rotas en producción
  const isProduction = process.env.NODE_ENV === "production";
  const isPreviewUrl = (url: string | null) => !!url && (url.startsWith("blob:") || url.startsWith("data:"));
  
  const showAvatar = card.avatarUrl && (!isProduction || isPreview || card.avatarUrl.startsWith("http") || card.avatarUrl.startsWith("https") || isPreviewUrl(card.avatarUrl));
  const showLogo = card.logoUrl && (!isProduction || isPreview || card.logoUrl.startsWith("http") || card.logoUrl.startsWith("https") || isPreviewUrl(card.logoUrl));
  const showCover = card.coverUrl && (!isProduction || isPreview || card.coverUrl.startsWith("http") || card.coverUrl.startsWith("https") || isPreviewUrl(card.coverUrl));

  // ¿Es layout de empresa con cabecera superior?
  const isBusiness = normTemplate === "company-dark" || normTemplate === "company-light";

  // Acción: Compartir tarjeta
  const handleShareCard = async () => {
    if (isPreview) return; // En vista previa, no realizar ninguna acción

    const canonicalUrl = `${window.location.protocol}//${window.location.host}/c/${card.slug || card.id}`;
    const shareData = {
      title: card.profileName || card.name,
      text: `${card.profileName || card.name}${card.role ? ` — ${card.role}` : ""}${card.companyName ? ` en ${card.companyName}` : ""}`,
      url: canonicalUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        // Registrar evento analítico solo ante compartición exitosa
        await fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: card.id, eventType: "PROFILE_SHARED" }),
        });
      } catch {
        // Silenciar cancelaciones o errores
      }
    } else {
      try {
        await navigator.clipboard.writeText(canonicalUrl);
        alert("¡Enlace de tarjeta copiado al portapapeles!");
        // Registrar evento analítico solo ante copia exitosa
        await fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: card.id, eventType: "PROFILE_SHARED" }),
        });
      } catch {
        // Silenciar errores
      }
    }
  };

  // --- CONFIGURACIÓN DE CLASES POR FORMATO ---
  let mainClass = "";
  let articleClass = "";
  let profileLabelClass = "";
  let profileNameClass = "";
  let profileRoleClass = "";
  let profileCompanyClass = "";
  let sectionContainerClass = "";
  let sectionLabelClass = "";
  let sectionTextClass = "";
  
  let primaryBtnClass = "";
  let secondaryBtnClass = "";
  let smallSecondaryBtnClass = "";
  let socialBtnClass = "";
  let documentBtnClass = "";

  let videoContainerClass = "";
  let videoTitleClass = "";
  let videoIframeWrapperClass = "";
  
  let footerClass = "";
  let locationClass = "";
  let poweredByClass = "";
  let linkSectionLabelClass = "";

  // 1. Clases Comunes y Variaciones de Formato
  if (normTemplate === "neobrutalist") {
    mainClass = "min-h-screen bg-[#fafafa] text-slate-900 flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300 font-mono";
    articleClass = "w-full max-w-md overflow-hidden rounded-none border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative z-10";
    profileLabelClass = "mt-6 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-black uppercase";
    profileRoleClass = "mt-2 text-sm font-bold text-slate-800";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-600";
    sectionContainerClass = "mx-6 mt-7 rounded-none border-2 border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
    sectionLabelClass = "text-[10px] font-black uppercase tracking-[0.2em] text-black";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-700 font-sans";
    
    primaryBtnClass = "rounded-none border-2 border-black px-4 py-4 text-center text-sm font-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] w-full flex items-center justify-center gap-2 cursor-pointer";
    secondaryBtnClass = "rounded-none border-2 border-black bg-white px-4 py-4 text-center text-sm font-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] w-full";
    smallSecondaryBtnClass = "rounded-none border-2 border-black bg-white px-4 py-3 text-center text-sm font-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] w-full";
    socialBtnClass = "rounded-none border-2 border-black bg-white px-4 py-2.5 text-xs font-black text-black transition hover:bg-black hover:text-white";
    documentBtnClass = "flex w-full items-center justify-between rounded-none border-2 border-black bg-white px-4 py-4 text-sm font-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]";
    
    videoContainerClass = "mx-6 mt-7 rounded-none border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
    videoTitleClass = "mt-2 text-base font-black text-black";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-none border-2 border-black bg-black";
    footerClass = "mt-8 border-t-2 border-black px-6 py-6 text-center bg-slate-50";
    locationClass = "text-xs font-bold text-slate-700";
    poweredByClass = "mt-3 text-[9px] font-black uppercase tracking-[0.2em] text-black";
    linkSectionLabelClass = "mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500";

  } else if (isLightTemplate) {
    mainClass = "min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/50 relative z-10";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-slate-400";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-slate-900";
    profileRoleClass = "mt-2 text-sm font-semibold";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-500";
    sectionContainerClass = "mx-6 mt-7 rounded-3xl border border-slate-100 bg-slate-50 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-600";
    
    primaryBtnClass = "rounded-2xl px-4 py-4 text-center text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer hover:brightness-110";
    secondaryBtnClass = "rounded-2xl border border-slate-250 bg-white px-4 py-4 text-center text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 w-full";
    smallSecondaryBtnClass = "rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-600 transition hover:bg-slate-50 w-full";
    socialBtnClass = "rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900";
    documentBtnClass = "flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50";
    
    videoContainerClass = "mx-6 mt-7 rounded-3xl border border-slate-100 bg-slate-50 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-slate-800";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-black";
    footerClass = "mt-8 border-t border-slate-100 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-400";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-400";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400";

  } else {
    // dark modes default (classic-dark, split-diagonal, company-dark)
    mainClass = "min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-800/80 bg-slate-900/90 shadow-2xl shadow-black relative z-10";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-slate-400";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-white";
    profileRoleClass = "mt-2 text-sm font-semibold";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-400";
    sectionContainerClass = "mx-6 mt-7 rounded-3xl border border-slate-800/80 bg-slate-955/40 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-300";
    
    primaryBtnClass = "rounded-2xl px-4 py-4 text-center text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer hover:brightness-110";
    secondaryBtnClass = "rounded-2xl border border-slate-800 bg-slate-955/60 px-4 py-4 text-center text-sm font-bold text-slate-200 shadow-sm transition hover:bg-slate-900 w-full";
    smallSecondaryBtnClass = "rounded-2xl border border-slate-800 bg-slate-955/60 px-4 py-3 text-center text-sm font-bold text-slate-300 transition hover:bg-slate-900 w-full";
    socialBtnClass = "rounded-full border border-slate-800 bg-slate-955 px-4 py-2.5 text-xs font-bold text-slate-400 transition hover:bg-slate-900 hover:text-white";
    documentBtnClass = "flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-955/50 px-4 py-4 text-sm font-bold text-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:bg-slate-900";
    
    videoContainerClass = "mx-6 mt-7 rounded-3xl border border-slate-800/80 bg-slate-955/40 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-white";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-2xl border border-slate-800 bg-black";
    footerClass = "mt-8 border-t border-slate-800/80 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-500";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400";
  }

  // 2. Configuración de Marcos de Fotografía (normPhotoStyle)
  const photoConfig = { className: "h-32 w-32 relative overflow-hidden bg-slate-800 ", style: {} as React.CSSProperties };
  if (normPhotoStyle === "circle") {
    photoConfig.className += "rounded-full border-4 border-white/20 shadow-xl";
  } else if (normPhotoStyle === "rounded-square") {
    photoConfig.className += "rounded-3xl border-4 border-white/20 shadow-xl";
  } else if (normPhotoStyle === "hexagon") {
    photoConfig.className += "border-0 shadow-lg";
    photoConfig.style.clipPath = "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";
  } else if (normPhotoStyle === "no-frame") {
    photoConfig.className += "rounded-none border-0 shadow-none";
  }

  // Estilos particulares para Neobrutalismo
  if (normTemplate === "neobrutalist") {
    photoConfig.className = photoConfig.className.replace("border-white/20", "border-black");
    photoConfig.className += " border-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
  }

  return (
    <main className={mainClass}>
      {/* Elementos decorativos de fondo en línea */}
      {normTemplate === "split-diagonal" && (
        <div 
          className="absolute top-0 left-0 w-full h-[35%] -skew-y-6 origin-top-left transform scale-y-110 opacity-80 pointer-events-none z-0" 
          style={{ backgroundColor: themeColor }}
        />
      )}

      <article className={articleClass}>
        {isBusiness ? (
          /* MOLDES DE BANNER PARA EMPRESAS */
          <div className="w-full flex flex-col relative">
            <div className={`pt-6 pb-4 flex flex-col items-center justify-center border-b ${
              actualIsDark ? "bg-slate-950/80 border-slate-800" : "bg-white border-slate-200"
            }`}>
              {showLogo ? (
                <img src={card.logoUrl || undefined} alt={card.companyName ?? card.company.name} className="max-h-12 max-w-[80%] object-contain" />
              ) : (
                <div className="flex flex-col items-center">
                  <svg className="w-6 h-6 mb-1" viewBox="0 0 24 24" fill="none" stroke={themeColor} strokeWidth="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  <span className={`font-serif tracking-widest text-base font-bold uppercase ${
                    actualIsDark ? "text-white" : "text-slate-900"
                  }`}>
                    {card.companyName ?? card.company.name}
                  </span>
                </div>
              )}
            </div>

            {/* Banner Cover Photo */}
            <div className={`${showCover ? "h-48" : "h-32"} w-full relative bg-slate-800`}>
              {showCover ? (
                <img
                  src={card.coverUrl || undefined}
                  alt="Portada de perfil"
                  className="w-full h-full object-cover block"
                />
              ) : (
                <div 
                  className="w-full h-full opacity-75"
                  style={{
                    background: `linear-gradient(135deg, ${themeColor} 0%, #0f172a 100%)`
                  }}
                />
              )}

              {/* Curvas del Banner de Portada (normBannerStyle) */}
              {normBannerStyle !== "straight" && (
                <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-10 pointer-events-none">
                  {normBannerStyle === "arc" && (
                    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-10 fill-current" style={{ color: isLightTemplate ? "#ffffff" : "#0f172a" }}>
                      <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0C26.9,4.75,55.05,16.32,80,29.35,140.75,61,207.77,77.51,321.39,56.44Z" />
                    </svg>
                  )}

                  {normBannerStyle === "wave" && (
                    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-8 fill-current" style={{ color: isLightTemplate ? "#ffffff" : "#0f172a" }}>
                      <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86C207.77,77.51,140.75,61,80,29.35,55.05,16.32,26.9,4.75,0,0V120H1200V95.83C1132.19,118.92,1055.71,111.31,985.66,92.83Z" />
                    </svg>
                  )}
                </div>
              )}

              {/* Insignia Central Overlapping */}
              <div className="absolute bottom-[-32px] left-1/2 transform -translate-x-1/2 z-20">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-2 overflow-hidden bg-white"
                  style={{ borderColor: themeColor }}
                >
                  {showLogo ? (
                    <img src={card.logoUrl || undefined} alt="Logo" className="w-full h-full object-contain p-1.5" />
                  ) : (
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={themeColor} strokeWidth="2.5">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 12l10 5 10-5M2 17l10 5 10-5" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* TRADICIONAL MOLDES DE PORTADA */
          <div className={`${showCover ? "h-48" : "h-32"} w-full relative bg-slate-800 overflow-hidden`}>
            {showCover ? (
              <img
                src={card.coverUrl || undefined}
                alt="Portada de perfil"
                className="w-full h-full object-cover block"
              />
            ) : (
              <div 
                className="w-full h-full opacity-65"
                style={{
                  background: `linear-gradient(135deg, ${themeColor} 0%, #0f172a 100%)`
                }}
              />
            )}

            {/* Curvas del Banner de Portada (normBannerStyle) */}
            {normBannerStyle !== "straight" && (
              <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-10 pointer-events-none">
                {normBannerStyle === "arc" && (
                  <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-10 fill-current" style={{ color: isLightTemplate ? "#ffffff" : "#0f172a" }}>
                    <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0C26.9,4.75,55.05,16.32,80,29.35,140.75,61,207.77,77.51,321.39,56.44Z" />
                  </svg>
                )}

                {normBannerStyle === "wave" && (
                  <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-8 fill-current" style={{ color: isLightTemplate ? "#ffffff" : "#0f172a" }}>
                    <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86C207.77,77.51,140.75,61,80,29.35,55.05,16.32,26.9,4.75,0,0V120H1200V95.83C1132.19,118.92,1055.71,111.31,985.66,92.83Z" />
                  </svg>
                )}
              </div>
            )}
          </div>
        )}

        {/* Contenido principal */}
        <div className={`px-7 text-center relative z-10 ${
          isBusiness ? "pt-12" : "pt-4"
        }`}>
          {/* Foto de Perfil sobrepuesta tradicional (con photoStyle dinámico) */}
          {!isBusiness && (
            <div className="relative -mt-20 mb-6 flex justify-center z-20">
              <div 
                className={photoConfig.className}
                style={photoConfig.style}
              >
                {showAvatar ? (
                  <img
                    src={card.avatarUrl || undefined}
                    alt={card.profileName ?? card.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    className="flex h-full w-full items-center justify-center font-bold text-2xl uppercase text-white"
                    style={{ backgroundColor: themeColor }}
                  >
                    {(card.profileName ?? card.name).slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          )}

          {!isBusiness && showLogo && (
            <div className="mb-4 flex justify-center px-4">
              <img
                src={card.logoUrl || undefined}
                alt={card.companyName ?? card.company.name}
                className="max-h-12 max-w-full w-auto h-auto object-contain"
              />
            </div>
          )}

          <p className={profileLabelClass}>
            {isBusiness ? "Ficha Corporativa" : "Tarjeta Virtual"}
          </p>

          <h1 className={profileNameClass}>
            {isBusiness ? (card.companyName ?? card.company.name) : (card.profileName ?? card.name)}
          </h1>

          {card.role && (
            <p className={profileRoleClass} style={{ color: isLightTemplate ? undefined : themeColor }}>
              {isBusiness ? "Servicios y Soluciones" : card.role}
            </p>
          )}

          {!isBusiness && card.companyName && (
            <p className={profileCompanyClass}>
              {card.companyName}
            </p>
          )}
        </div>

        {/* Biografía */}
        {card.bio && (
          <section className={sectionContainerClass}>
            <p className={sectionLabelClass}>
              {isBusiness ? "Nosotros" : "Presentación"}
            </p>
            <p className={sectionTextClass}>
              {card.bio}
            </p>
          </section>
        )}

        {/* Contacto Representante para Layouts Empresa */}
        {isBusiness && (card.profileName || card.avatarUrl) && (
          <section className={`mx-6 mt-5 p-4 rounded-2xl border flex items-center gap-4 text-left ${
            isLightTemplate
              ? "border-slate-200 bg-slate-50 text-slate-800"
              : "border-slate-800 bg-slate-955/40 text-white"
          }`}>
            {showAvatar && (
              <img
                src={card.avatarUrl || undefined}
                alt={card.profileName ?? card.name}
                className={`h-12 w-12 rounded-full object-cover border ${
                  isLightTemplate ? "border-slate-300" : "border-slate-700"
                }`}
              />
            )}
            <div>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${
                isLightTemplate ? "text-slate-400" : "text-slate-400"
              }`}>
                Representante
              </p>
              <h3 className="text-sm font-bold">
                {card.profileName ?? card.name}
              </h3>
              {card.role && (
                <p className="text-xs text-slate-500">
                  {card.role}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Acciones Rápidas */}
        <section className="mx-6 mt-6 space-y-3">
          {whatsapp && (
            isPreview ? (
              <button
                type="button"
                className={primaryBtnClass}
                style={{ backgroundColor: themeColor }}
                onClick={(e) => e.preventDefault()}
              >
                Contactar ahora
              </button>
            ) : (
              <TrackButton
                cardId={card.id}
                eventType="WHATSAPP_CLICK"
                href={`https://wa.me/${whatsapp}`}
                className={primaryBtnClass}
                style={{ backgroundColor: themeColor }}
              >
                Contactar ahora
              </TrackButton>
            )
          )}

          <div className="grid grid-cols-2 gap-3">
            {isPreview ? (
              <button
                type="button"
                className={secondaryBtnClass}
                onClick={(e) => e.preventDefault()}
              >
                Guardar contacto
              </button>
            ) : (
              <TrackButton
                cardId={card.id}
                eventType="VCARD_DOWNLOAD"
                href={vcardUrl}
                className={secondaryBtnClass}
              >
                Guardar contacto
              </TrackButton>
            )}

            {/* Acción: Compartir tarjeta */}
            <button
              type="button"
              onClick={handleShareCard}
              className={secondaryBtnClass}
            >
              Compartir tarjeta
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {phone && (
              isPreview ? (
                <button
                  type="button"
                  className={smallSecondaryBtnClass}
                  onClick={(e) => e.preventDefault()}
                >
                  Llamar
                </button>
              ) : (
                <TrackButton
                  cardId={card.id}
                  eventType="PHONE_CLICK"
                  href={`tel:${phone}`}
                  className={smallSecondaryBtnClass}
                >
                  Llamar
                </TrackButton>
              )
            )}
            {card.email && card.showEmail && (
              isPreview ? (
                <button
                  type="button"
                  className={smallSecondaryBtnClass}
                  onClick={(e) => e.preventDefault()}
                >
                  Email
                </button>
              ) : (
                <TrackButton
                  cardId={card.id}
                  eventType="EMAIL_CLICK"
                  href={`mailto:${card.email}`}
                  className={smallSecondaryBtnClass}
                >
                  Email
                </TrackButton>
              )
            )}
          </div>
        </section>

        {/* Enlaces Sociales */}
        {socialLinks.length > 0 && (
          <section className="mx-6 mt-5 flex flex-wrap justify-center gap-2">
            {socialLinks.map((social) => (
              isPreview ? (
                <button
                  key={social.label}
                  type="button"
                  className={socialBtnClass}
                  onClick={(e) => e.preventDefault()}
                >
                  {social.label}
                </button>
              ) : (
                <TrackButton
                  key={social.label}
                  cardId={card.id}
                  eventType="LINK_CLICK"
                  href={social.href ?? "#"}
                  className={socialBtnClass}
                >
                  {social.label}
                </TrackButton>
              )
            ))}
          </section>
        )}

        {/* Enlaces Personalizados */}
        {card.links.length > 0 && (
          <section className="mx-6 mt-7">
            <p className={linkSectionLabelClass}>
              {isBusiness ? "Servicios y Catálogo" : "Documentos y Enlaces"}
            </p>

            <div className="space-y-3">
              {card.links.filter(l => l.isActive).map((link) => (
                isPreview ? (
                  <button
                    key={link.id}
                    type="button"
                    className={documentBtnClass}
                    onClick={(e) => e.preventDefault()}
                  >
                    <span>{link.title}</span>
                    <span style={{ color: themeColor }}>↗</span>
                  </button>
                ) : (
                  <TrackButton
                    key={link.id}
                    cardId={card.id}
                    eventType="LINK_CLICK"
                    href={link.url}
                    className={documentBtnClass}
                  >
                    <span>{link.title}</span>
                    <span style={{ color: themeColor }}>↗</span>
                  </TrackButton>
                )
              ))}
            </div>
          </section>
        )}

        {/* Video Corporativo */}
        {safeVideoUrl && (
          <section className={videoContainerClass}>
            <p className={sectionLabelClass}>
              Video
            </p>

            <h2 className={videoTitleClass}>
              {card.videoTitle ?? "Video corporativo"}
            </h2>

            <div className={videoIframeWrapperClass}>
              <iframe
                src={safeVideoUrl}
                title={card.videoTitle ?? "Video corporativo"}
                className="aspect-video w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </section>
        )}

        {/* CRM "Compárteme tus datos" Modal Button Trigger */}
        {card.shareContactEnabled && (
          <div className="mx-6 mt-7">
            <button
              type="button"
              onClick={() => setIsLeadModalOpen(true)}
              className="w-full rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-[0.15em] text-white shadow-lg transition active:scale-95 cursor-pointer hover:brightness-110"
              style={{ backgroundColor: themeColor }}
            >
              {card.shareContactButtonText || "Compárteme tus datos"}
            </button>
          </div>
        )}

        {/* Pie de Página */}
        <footer className={footerClass}>
          {card.location && (
            <p className={locationClass}>{card.location}</p>
          )}

          <p className={poweredByClass}>
            Powered by SmartNFC Chile
          </p>
        </footer>
      </article>

      {/* MODAL RESPONSIVO / BOTTOM SHEET PARA CAPTURA CRM */}
      {isLeadModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" 
          onClick={() => setIsLeadModalOpen(false)}
        >
          <div 
            className={`w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] border p-6 shadow-2xl relative animate-slideUp max-h-[90vh] overflow-y-auto ${
              actualIsDark 
                ? "bg-slate-900 border-slate-800 text-white" 
                : "bg-white border-slate-200 text-slate-900"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón cerrar */}
            <button 
              type="button" 
              onClick={() => setIsLeadModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-lg font-bold p-1 cursor-pointer"
            >
              ✕
            </button>

            {/* Formulario */}
            <LeadForm 
              cardId={card.id}
              themeColor={themeColor}
              themeMode={actualIsDark ? "dark" : "light"}
              buttonText={card.shareContactButtonText}
              introText={card.shareContactIntro}
              confirmText={card.shareContactConfirm}
              consentText={card.shareContactConsent}
              onSuccess={() => {
                // Cerrar modal automáticamente tras 2 segundos del envío exitoso
                setTimeout(() => {
                  setIsLeadModalOpen(false);
                }, 2000);
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
