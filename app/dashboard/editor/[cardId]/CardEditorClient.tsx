"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react/no-unescaped-entities */

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  User, 
  Palette, 
  Image as ImageIcon, 
  Phone as PhoneIcon, 
  Link as LinkIcon, 
  MessageSquare, 
  Eye, 
  X, 
  AlertTriangle, 
  CheckCircle,
  ArrowLeft,
  Plus,
  Trash2
} from "lucide-react";
import FileInput from "../../../../components/FileInput";
import CardProfileView from "../../../../components/card-profile/CardProfileView";
import { CardProfileData } from "../../../../components/card-profile/CardProfileView";

type CardLink = {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  order: number;
  isActive: boolean;
};

type CardEditorProps = {
  card: CardProfileData & {
    id: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    shareContactEnabled: boolean;
    shareContactButtonText: string;
    shareContactIntro: string;
    shareContactConfirm: string;
    shareContactConsent: string;
    shareContactFields: any;
    primaryActionType: string;
    secondaryActionType: string;
    links: CardLink[];
  };
  updateCardAction: (formData: FormData) => Promise<void>;
  addLinkAction: (formData: FormData) => Promise<void>;
  deleteLinkAction: (formData: FormData) => Promise<void>;
};

export default function CardEditorClient({
  card,
  updateCardAction,
  addLinkAction,
  deleteLinkAction,
}: CardEditorProps) {
  // 1. Estado local para Live Preview
  const [cardData, setCardData] = useState({
    slug: card.slug,
    name: card.name,
    isActive: card.isActive,
    themeColor: card.themeColor,
    themeMode: card.themeMode,
    template: card.template,
    bannerStyle: card.bannerStyle,
    photoStyle: card.photoStyle,
    logoUrl: card.logoUrl,
    avatarUrl: card.avatarUrl,
    coverUrl: card.coverUrl,
    profileName: card.profileName,
    role: card.role,
    companyName: card.companyName,
    bio: card.bio,
    location: card.location,
    email: card.email,
    phone: card.phone,
    whatsapp: card.whatsapp,
    instagram: card.instagram,
    facebook: card.facebook,
    linkedin: card.linkedin,
    tiktok: card.tiktok,
    youtube: card.youtube,
    showEmail: card.showEmail,
    showPhone: card.showPhone,
    showWhatsapp: card.showWhatsapp,
    showInstagram: card.showInstagram,
    showFacebook: card.showFacebook,
    showLinkedin: card.showLinkedin,
    showTiktok: card.showTiktok,
    showYoutube: card.showYoutube,
    company: card.company,
    links: card.links,
    // Contact Capture
    shareContactEnabled: card.shareContactEnabled,
    shareContactButtonText: card.shareContactButtonText,
    shareContactIntro: card.shareContactIntro,
    shareContactConfirm: card.shareContactConfirm,
    shareContactConsent: card.shareContactConsent,
    shareContactFields: card.shareContactFields,
    primaryActionType: card.primaryActionType,
    secondaryActionType: card.secondaryActionType,
  });

  // Sincronizar enlaces cuando el card prop se actualiza (luego de agregar/borrar)
  useEffect(() => {
    setCardData(prev => ({
      ...prev,
      links: card.links
    }));
  }, [card.links]);

  // 2. Control de Pestañas (Tabs)
  const [activeTab, setActiveTab] = useState<"basics" | "design" | "images" | "contact" | "links" | "crm">("basics");

  // 3. Advertencia de Cambios sin Guardar
  const [isDirty, setIsDirty] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Escuchar beforeunload del navegador
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "Tienes cambios sin guardar. ¿Seguro que deseas salir?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // 4. Modal de Vista Previa para Dispositivos Móviles
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // 5. Manejar cambios en el formulario para actualizar el live preview
  const handleFormChange = () => {
    if (!formRef.current) return;
    setIsDirty(true);

    const formData = new FormData(formRef.current);
    
    setCardData(prev => ({
      ...prev,
      profileName: formData.get("profileName") as string,
      role: formData.get("role") as string,
      companyName: formData.get("companyName") as string,
      bio: formData.get("bio") as string,
      location: formData.get("location") as string,
      themeColor: formData.get("themeColor") as string,
      themeMode: formData.get("themeMode") as string,
      template: formData.get("template") as string,
      bannerStyle: formData.get("bannerStyle") as string,
      photoStyle: formData.get("photoStyle") as string,
      whatsapp: formData.get("whatsapp") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      linkedin: formData.get("linkedin") as string,
      instagram: formData.get("instagram") as string,
      facebook: formData.get("facebook") as string,
      tiktok: formData.get("tiktok") as string,
      youtube: formData.get("youtube") as string,
      showWhatsapp: formData.get("showWhatsapp") === "on",
      showPhone: formData.get("showPhone") === "on",
      showEmail: formData.get("showEmail") === "on",
      showLinkedin: formData.get("showLinkedin") === "on",
      showInstagram: formData.get("showInstagram") === "on",
      showFacebook: formData.get("showFacebook") === "on",
      showTiktok: formData.get("showTiktok") === "on",
      showYoutube: formData.get("showYoutube") === "on",
      
      // CRM
      shareContactEnabled: formData.get("shareContactEnabled") === "on",
      shareContactButtonText: formData.get("shareContactButtonText") as string || "Compárteme tus datos",
      shareContactIntro: formData.get("shareContactIntro") as string || "Déjame tus datos para mantenernos en contacto.",
      shareContactConfirm: formData.get("shareContactConfirm") as string || "¡Gracias! Tus datos fueron enviados correctamente.",
      shareContactConsent: formData.get("shareContactConsent") as string || "Acepto el tratamiento de mis datos personales para fines de contacto comercial.",
      primaryActionType: formData.get("primaryActionType") as string || "WHATSAPP",
      secondaryActionType: formData.get("secondaryActionType") as string || "SAVE_CONTACT",
    }));
  };

  const handleImageChange = (type: "avatar" | "logo" | "cover", url: string) => {
    setIsDirty(true);
    setCardData(prev => ({
      ...prev,
      [`${type}Url`]: url
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;

    try {
      setIsDirty(false); // Desactivar advertencia temporalmente para el post
      const formData = new FormData(formRef.current);
      await updateCardAction(formData);
      alert("✅ Cambios guardados con éxito.");
    } catch (err) {
      console.error(err);
      setIsDirty(true);
      alert("❌ Hubo un error al guardar los cambios.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-16">
      {/* Barra de Estado Superior */}
      <div className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard" 
            className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
            onClick={(e) => {
              if (isDirty && !confirm("Tienes cambios sin guardar. ¿Seguro que deseas salir?")) {
                e.preventDefault();
              }
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Editor de Perfil
              <span className="text-xs font-normal text-slate-500 font-mono">/{cardData.slug}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Indicador de cambios sin guardar */}
          {isDirty ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Cambios sin guardar</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Todos los cambios guardados</span>
            </div>
          )}

          {/* Botones de acción */}
          <a
            href={`/c/${cardData.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 bg-slate-850 hover:bg-slate-800 text-slate-200 px-4 py-2 rounded-xl text-sm font-medium border border-slate-750 transition"
          >
            <Eye className="w-4 h-4" />
            Ver Landing Pública
          </a>

          <Link
            href={`/dashboard/qr/${card.id}`}
            className="hidden sm:inline-flex items-center gap-2 bg-slate-850 hover:bg-slate-800 text-slate-200 px-4 py-2 rounded-xl text-sm font-medium border border-slate-750 transition"
          >
            📷 Ver Código QR
          </Link>

          <button
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition cursor-pointer"
          >
            Guardar Cambios
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Columna Izquierda: Formulario y Controladores (Tabulado) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Navegación por Pestañas */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex flex-wrap gap-1">
              {[
                { id: "basics", label: "Información", icon: User },
                { id: "design", label: "Diseño", icon: Palette },
                { id: "images", label: "Imágenes", icon: ImageIcon },
                { id: "contact", label: "Contacto", icon: PhoneIcon },
                { id: "links", label: "Enlaces", icon: LinkIcon },
                { id: "crm", label: "Captura CRM", icon: MessageSquare },
              ].map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isActive 
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/10" 
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Formulario Principal */}
            <form 
              ref={formRef}
              onChange={handleFormChange}
              onSubmit={handleFormSubmit}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6"
            >
              <input type="hidden" name="cardId" value={card.id} />
              <input type="hidden" name="shareContactFields" value={JSON.stringify(cardData.shareContactFields || {
                name: true, email: true, phone: true, company: true, position: true, message: true
              })} />

              {/* PESTAÑA: Información Básica */}
              {activeTab === "basics" && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h2 className="text-lg font-bold text-white mb-1">Información del Perfil</h2>
                    <p className="text-xs text-slate-400">Describe tu rol, cargo y ubicación para presentarte profesionalmente.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">Nombre de Visualización</label>
                      <input 
                        type="text" 
                        name="profileName" 
                        defaultValue={cardData.profileName || ""}
                        placeholder="Ej: Agustín Jara"
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">Cargo / Posición</label>
                      <input 
                        type="text" 
                        name="role" 
                        defaultValue={cardData.role || ""}
                        placeholder="Ej: Ingeniero Comercial"
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">Nombre de la Empresa</label>
                      <input 
                        type="text" 
                        name="companyName" 
                        defaultValue={cardData.companyName || ""}
                        placeholder="Ej: Constructora Smart"
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300">Ubicación</label>
                      <input 
                        type="text" 
                        name="location" 
                        defaultValue={cardData.location || ""}
                        placeholder="Ej: Santiago, Chile"
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">Biografía / Presentación Corta</label>
                    <textarea 
                      name="bio" 
                      defaultValue={cardData.bio || ""}
                      placeholder="Escribe una breve descripción para tu perfil de tarjeta pública..."
                      rows={4}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition resize-none"
                    />
                  </div>
                </div>
              )}

              {/* PESTAÑA: Diseño y Plantilla */}
              {activeTab === "design" && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h2 className="text-lg font-bold text-white mb-1">Ajustes Visuales y Plantillas</h2>
                    <p className="text-xs text-slate-400">Selecciona el color corporativo y una plantilla adaptada a tu giro de negocio.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 block">Color de Marca (Tema)</label>
                      <div className="flex items-center gap-4 bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5">
                        <input 
                          type="color" 
                          name="themeColor"
                          value={cardData.themeColor}
                          onChange={(e) => {
                            setCardData(prev => ({ ...prev, themeColor: e.target.value }));
                            setIsDirty(true);
                          }}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                        />
                        <span className="text-slate-300 font-mono text-sm uppercase">{cardData.themeColor}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 block">Modo de Diseño</label>
                      <select 
                        name="themeMode"
                        defaultValue={cardData.themeMode}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="dark">Modo Oscuro Premium</option>
                        <option value="light">Modo Claro Corporativo</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 block">Recorte del Banner (Borde inferior)</label>
                      <select
                        name="bannerStyle"
                        defaultValue={cardData.bannerStyle || "classic"}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="classic">Clásico / Molde de Plantilla</option>
                        <option value="straight">Recto Moderno</option>
                        <option value="arc">Corte Cóncavo (Arco)</option>
                        <option value="wave">Ondulado Dinámico</option>
                        <option value="arch">Domo Inverso</option>
                        <option value="diagonal">Corte Diagonal</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 block">Marco de Fotografía</label>
                      <select
                        name="photoStyle"
                        defaultValue={cardData.photoStyle || "circle"}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="circle">Círculo clásico</option>
                        <option value="rounded-square">Cuadrado redondeado</option>
                        <option value="hexagon">Hexagonal</option>
                        <option value="diamond">Diamante</option>
                        <option value="shield">Escudo corporativo</option>
                        <option value="double-ring">Anillo doble</option>
                        <option value="neon">Brillo Neón</option>
                        <option value="crystal">Borde Cristal</option>
                        <option value="glassmorphism">Glassmorphism</option>
                        <option value="gold-frame">Marco Dorado Luxury</option>
                        <option value="silver-frame">Marco Plateado Elegant</option>
                        <option value="premium-black">Marco Negro Premium</option>
                        <option value="no-frame">Sin marco</option>
                      </select>
                    </div>
                  </div>

                  {/* Selector de Plantilla */}
                  <div className="space-y-4 pt-4 border-t border-slate-800">
                    <label className="text-xs font-bold text-slate-300 block">Selección de Plantilla</label>
                    
                    <div className="space-y-6">
                      {[
                        { title: "Corporate Elite", items: ["corporate-1", "corporate-2", "corporate-3", "corporate-4", "corporate-5"] },
                        { title: "Personal Brand", items: ["personal-1", "personal-2", "personal-3", "personal-4", "personal-5"] },
                        { title: "Comercial / Ventas", items: ["comercial-1", "comercial-2", "comercial-3", "comercial-4", "comercial-5"] },
                        { title: "Empresa / Catálogo", items: ["business-1", "business-2", "business-3", "business-4", "business-5"] },
                        { title: "Industrias & Creadores", items: ["creator-1", "creator-2", "creator-3", "creator-4", "creator-5"] },
                      ].map((category) => (
                        <div key={category.title} className="space-y-2">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{category.title}</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            {category.items.map((tmpl) => {
                              const isChecked = cardData.template === tmpl;
                              return (
                                <label 
                                  key={tmpl}
                                  className={`relative flex flex-col items-center justify-center p-3 rounded-xl border text-center cursor-pointer transition select-none ${
                                    isChecked 
                                      ? "border-blue-500 bg-blue-500/10 text-blue-400 font-bold ring-1 ring-blue-500" 
                                      : "border-slate-800 bg-slate-950/40 hover:border-slate-700 text-slate-300"
                                  }`}
                                >
                                  <input 
                                    type="radio" 
                                    name="template" 
                                    value={tmpl}
                                    checked={isChecked}
                                    onChange={() => {
                                      setCardData(prev => ({ ...prev, template: tmpl }));
                                      setIsDirty(true);
                                    }}
                                    className="sr-only"
                                  />
                                  <span className="text-[11px] truncate w-full">{tmpl}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA: Imágenes */}
              {activeTab === "images" && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h2 className="text-lg font-bold text-white mb-1">Imágenes de Perfil</h2>
                    <p className="text-xs text-slate-400">Sube tus fotos corporativas y de fondo. Límite máximo 4MB.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                      <label className="text-xs font-semibold text-slate-300 block">Fotografía de Perfil (Avatar)</label>
                      <FileInput
                        name="avatarFile"
                        urlName="avatarUrl"
                        initialUrl={cardData.avatarUrl}
                        accept="image/*"
                        type="avatar"
                        onUrlChange={(url) => handleImageChange("avatar", url)}
                      />
                    </div>

                    <div className="space-y-2 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                      <label className="text-xs font-semibold text-slate-300 block">Logo de Empresa</label>
                      <FileInput
                        name="logoFile"
                        urlName="logoUrl"
                        initialUrl={cardData.logoUrl}
                        accept="image/*"
                        type="logo"
                        onUrlChange={(url) => handleImageChange("logo", url)}
                      />
                    </div>

                    <div className="space-y-2 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                      <label className="text-xs font-semibold text-slate-300 block">Portada superior (Banner)</label>
                      <FileInput
                        name="coverFile"
                        urlName="coverUrl"
                        initialUrl={cardData.coverUrl}
                        accept="image/*"
                        type="cover"
                        onUrlChange={(url) => handleImageChange("cover", url)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA: Contacto y Redes */}
              {activeTab === "contact" && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h2 className="text-lg font-bold text-white mb-1">Canales de Contacto y Redes Sociales</h2>
                    <p className="text-xs text-slate-400">Configura tus números de contacto directo y tus perfiles sociales.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { name: "whatsapp", label: "WhatsApp", placeholder: "Ej: 56912345678", showField: "showWhatsapp" },
                      { name: "phone", label: "Teléfono", placeholder: "Ej: 56912345678", showField: "showPhone" },
                      { name: "email", label: "Correo Electrónico", placeholder: "Ej: tu@empresa.com", showField: "showEmail", type: "email" },
                      { name: "linkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/nombre", showField: "showLinkedin" },
                      { name: "instagram", label: "Instagram URL", placeholder: "https://instagram.com/nombre", showField: "showInstagram" },
                      { name: "facebook", label: "Facebook URL", placeholder: "https://facebook.com/nombre", showField: "showFacebook" },
                      { name: "tiktok", label: "TikTok URL", placeholder: "https://tiktok.com/@nombre", showField: "showTiktok" },
                      { name: "youtube", label: "YouTube URL", placeholder: "https://youtube.com/@nombre", showField: "showYoutube" },
                    ].map((field) => (
                      <div key={field.name} className="space-y-2 bg-slate-950/20 p-4 rounded-xl border border-slate-850/80">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-semibold text-slate-350">{field.label}</label>
                          <label className="inline-flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              name={field.showField}
                              defaultChecked={(cardData as any)[field.showField]}
                              className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            Mostrar
                          </label>
                        </div>
                        <input 
                          type={field.type || "text"}
                          name={field.name}
                          defaultValue={(cardData as any)[field.name] || ""}
                          placeholder={field.placeholder}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PESTAÑA: CRM / Captura de Prospectos */}
              {activeTab === "crm" && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h2 className="text-lg font-bold text-white mb-1">Configuración de Captura (CRM)</h2>
                    <p className="text-xs text-slate-400">Activa el formulario de contacto para que tus visitantes compartan su información directo a tu CRM.</p>
                  </div>

                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white text-sm">Habilitar "Compárteme tus datos"</div>
                      <div className="text-xs text-slate-400">Muestra el formulario y botón en la landing pública de la tarjeta.</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        name="shareContactEnabled" 
                        checked={cardData.shareContactEnabled}
                        onChange={(e) => {
                          setCardData(prev => ({ ...prev, shareContactEnabled: e.target.checked }));
                          setIsDirty(true);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {cardData.shareContactEnabled && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-300">Texto del Botón Principal CTA</label>
                          <input 
                            type="text" 
                            name="shareContactButtonText"
                            defaultValue={cardData.shareContactButtonText}
                            placeholder="Compárteme tus datos"
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-300">Título / Introducción del Formulario</label>
                          <input 
                            type="text" 
                            name="shareContactIntro"
                            defaultValue={cardData.shareContactIntro}
                            placeholder="Déjame tus datos para mantenernos en contacto."
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-300">Mensaje de Confirmación</label>
                          <input 
                            type="text" 
                            name="shareContactConfirm"
                            defaultValue={cardData.shareContactConfirm}
                            placeholder="¡Gracias! Tus datos fueron enviados."
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-300">Acción Principal en Landing</label>
                          <select
                            name="primaryActionType"
                            defaultValue={cardData.primaryActionType}
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                          >
                            <option value="WHATSAPP">Llamada/WhatsApp Directo</option>
                            <option value="CRM_FORM">Abrir Formulario de Captura</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300">Texto de Consentimiento / GDPR</label>
                        <textarea 
                          name="shareContactConsent"
                          defaultValue={cardData.shareContactConsent}
                          placeholder="Acepto el tratamiento de mis datos personales..."
                          rows={3}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PESTAÑA: Enlaces Personalizados */}
              {activeTab === "links" && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h2 className="text-lg font-bold text-white mb-1">Documentos y Enlaces Personalizados</h2>
                    <p className="text-xs text-slate-400">Agrega botones adicionales dirigidos a PDFs, catálogos, portafolios o tu web.</p>
                  </div>

                  {/* Listado y formulario separado de enlaces */}
                  <div className="space-y-3">
                    {cardData.links && cardData.links.length > 0 ? (
                      cardData.links.map((link) => (
                        <div key={link.id} className="flex items-center justify-between bg-slate-950 rounded-xl p-4 border border-slate-850">
                          <div className="space-y-1 truncate mr-4">
                            <div className="font-semibold text-white text-sm">{link.title}</div>
                            <div className="text-xs text-slate-500 truncate max-w-sm">{link.url}</div>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`¿Seguro que deseas eliminar el enlace "${link.title}"?`)) {
                                const fd = new FormData();
                                fd.append("linkId", link.id);
                                fd.append("cardId", card.id);
                                await deleteLinkAction(fd);
                              }
                            }}
                            className="flex items-center justify-center p-2 rounded-lg bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-slate-500 text-sm py-8 border border-dashed border-slate-800 rounded-xl">
                        No hay enlaces personalizados creados todavía.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </form>

            {/* Formulario Secundario para Añadir Enlace (Solo visible en Pestaña Enlaces) */}
            {activeTab === "links" && (
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const fd = new FormData(form);
                  await addLinkAction(fd);
                  form.reset();
                }}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4"
              >
                <input type="hidden" name="cardId" value={card.id} />
                <h3 className="text-md font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-500" />
                  Agregar Nuevo Enlace
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400">Título del Botón</label>
                    <input 
                      type="text" 
                      name="title" 
                      required 
                      placeholder="Ej: Catálogo PDF 2026"
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400">URL / Link del enlace</label>
                    <input 
                      type="url" 
                      name="url" 
                      required 
                      placeholder="Ej: https://misitio.cl/catalogo.pdf"
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition shadow-lg shadow-blue-500/10 cursor-pointer"
                  >
                    Agregar Enlace
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Columna Derecha: Vista Previa Real-time (Desktop Sticky) */}
          <div className="hidden lg:block lg:col-span-5">
            <div className="sticky top-28 space-y-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vista Previa Interactiva</span>
                <span className="text-xs text-slate-500">Muestra el diseño final en móvil</span>
              </div>

              {/* iPhone Mockup Container */}
              <div className="relative mx-auto max-w-[340px] h-[680px] bg-slate-900 border-[10px] border-slate-800 rounded-[3rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col ring-4 ring-slate-850">
                {/* iPhone Speaker / Camera Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-50 flex items-center justify-center">
                  <div className="w-12 h-1 bg-slate-900 rounded-full mb-1"></div>
                </div>

                {/* Contenedor interno del scrollable screen */}
                <div className="flex-1 overflow-y-auto scrollbar-thin pt-6 pb-4 bg-slate-950">
                  <CardProfileView card={cardData as any} isPreview={true} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botón Flotante para Vista Previa en Pantallas Pequeñas (Mobile/Tablet) */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setShowMobilePreview(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3.5 rounded-full font-bold shadow-2xl shadow-blue-600/40 hover:scale-105 transition cursor-pointer"
        >
          <Eye className="w-5 h-5" />
          <span>Ver Vista Previa</span>
        </button>
      </div>

      {/* Modal / Slide-over para la Vista Previa Móvil */}
      {showMobilePreview && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-[360px] h-[90vh] bg-slate-950 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-800 animate-slideUp">
            {/* Cabecera del Modal */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-900 bg-slate-900/60 backdrop-blur-md">
              <span className="font-bold text-sm text-slate-300">Previsualización</span>
              <button
                onClick={() => setShowMobilePreview(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del screen */}
            <div className="flex-1 overflow-y-auto pt-4 pb-6">
              <CardProfileView card={cardData as any} isPreview={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
