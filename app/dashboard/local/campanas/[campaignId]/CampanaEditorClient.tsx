"use client";

import React, { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import {
  updateLocalCampaignAction,
  publishLocalCampaignAction,
  associateNfcCardAction,
  disassociateNfcCardAction
} from "../../actions";
import MobilePreview from "../../../../../components/local/MobilePreview";
import { PUBLIC_APP_ORIGIN } from "../../../../../lib/public-url";

type LocalCampaignRecord = {
  id: string;
  name: string;
  slug: string;
  status: string;
  template: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  businessName: string | null;
  clubName: string | null;
  headline: string | null;
  subheadline: string | null;
  address: string | null;
  whatsappNumber: string | null;
  whatsappMessage: string | null;
  benefitLabel: string | null;
  benefitTitle: string | null;
  benefitDescription: string | null;
  benefitConditions: string | null;
  benefitStartAt: Date | null;
  benefitEndAt: Date | null;
  consentText: string | null;
  consentVersion: number;
  publishedSnapshot: any;
  publishedVersion: number;
  publishedAt: Date | null;
  updatedAt: Date;
};

type CampanaEditorClientProps = {
  campaign: LocalCampaignRecord;
  initialTouchpoints: any[];
  initialAvailableCards: any[];
};

export default function CampanaEditorClient({
  campaign: initialCampaign,
  initialTouchpoints,
  initialAvailableCards
}: CampanaEditorClientProps) {
  const [campaign, setCampaign] = useState<LocalCampaignRecord>(initialCampaign);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Estados del formulario
  const [name, setName] = useState(campaign.name);
  const [logoUrl, setLogoUrl] = useState(campaign.logoUrl);
  const [businessName, setBusinessName] = useState(campaign.businessName || "");
  const [clubName, setClubName] = useState(campaign.clubName || "");
  const [address, setAddress] = useState(campaign.address || "");
  const [headline, setHeadline] = useState(campaign.headline || "");
  const [subheadline, setSubheadline] = useState(campaign.subheadline || "");
  const [primaryColor, setPrimaryColor] = useState(campaign.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(campaign.secondaryColor);
  const [benefitLabel, setBenefitLabel] = useState(campaign.benefitLabel || "");
  const [benefitTitle, setBenefitTitle] = useState(campaign.benefitTitle || "");
  const [benefitDescription, setBenefitDescription] = useState(campaign.benefitDescription || "");
  const [benefitConditions, setBenefitConditions] = useState(campaign.benefitConditions || "");
  
  const [benefitStartAt, setBenefitStartAt] = useState(
    campaign.benefitStartAt ? new Date(campaign.benefitStartAt).toISOString().split("T")[0] : ""
  );
  const [benefitEndAt, setBenefitEndAt] = useState(
    campaign.benefitEndAt ? new Date(campaign.benefitEndAt).toISOString().split("T")[0] : ""
  );

  const [whatsappNumber, setWhatsappNumber] = useState(campaign.whatsappNumber || "");
  const [whatsappMessage, setWhatsappMessage] = useState(campaign.whatsappMessage || "");
  const [consentText, setConsentText] = useState(campaign.consentText || "");

  // Control de subida de archivos
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Control de navegación del editor (Secciones)
  const [activeTab, setActiveTab] = useState<"identidad" | "presentacion" | "beneficio" | "whatsapp" | "privacidad" | "touchpoints">("identidad");

  // Control de vista previa en móviles
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Modal de advertencia para salida del editor
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingExitUrl, setPendingExitUrl] = useState<string | null>(null);

  // Mensajes de éxito y error
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Detectar cambios sin guardar
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const currentFormState = {
    name,
    logoUrl,
    businessName,
    clubName,
    address,
    headline,
    subheadline,
    primaryColor,
    secondaryColor,
    benefitLabel,
    benefitTitle,
    benefitDescription,
    benefitConditions,
    benefitStartAt: benefitStartAt || null,
    benefitEndAt: benefitEndAt || null,
    whatsappNumber,
    whatsappMessage,
    consentText
  };

  useEffect(() => {
    const isDifferent =
      name !== campaign.name ||
      logoUrl !== campaign.logoUrl ||
      businessName !== (campaign.businessName || "") ||
      clubName !== (campaign.clubName || "") ||
      address !== (campaign.address || "") ||
      headline !== (campaign.headline || "") ||
      subheadline !== (campaign.subheadline || "") ||
      primaryColor !== campaign.primaryColor ||
      secondaryColor !== campaign.secondaryColor ||
      benefitLabel !== (campaign.benefitLabel || "") ||
      benefitTitle !== (campaign.benefitTitle || "") ||
      benefitDescription !== (campaign.benefitDescription || "") ||
      benefitConditions !== (campaign.benefitConditions || "") ||
      whatsappNumber !== (campaign.whatsappNumber || "") ||
      whatsappMessage !== (campaign.whatsappMessage || "") ||
      consentText !== (campaign.consentText || "") ||
      Boolean(benefitStartAt && !campaign.benefitStartAt) ||
      Boolean(!benefitStartAt && campaign.benefitStartAt) ||
      Boolean(benefitEndAt && !campaign.benefitEndAt) ||
      Boolean(!benefitEndAt && campaign.benefitEndAt);

    setHasUnsavedChanges(!!isDifferent);
  }, [name, logoUrl, businessName, clubName, address, headline, subheadline, primaryColor, secondaryColor, benefitLabel, benefitTitle, benefitDescription, benefitConditions, benefitStartAt, benefitEndAt, whatsappNumber, whatsappMessage, consentText, campaign]);

  // Protección antes de cerrar o recargar la pestaña del navegador
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Interceptar clic en "Volver a Campañas" si hay cambios sin guardar
  const handleBackNavigation = (e: React.MouseEvent, targetUrl: string) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      setPendingExitUrl(targetUrl);
      setShowExitModal(true);
    }
  };

  const confirmExit = () => {
    setShowExitModal(false);
    if (pendingExitUrl) {
      router.push(pendingExitUrl);
    }
  };

  // Verificar cambios sin publicar
  const hasUnpublishedChanges =
    campaign.status === "PUBLISHED" &&
    campaign.publishedAt &&
    new Date(campaign.updatedAt).getTime() > new Date(campaign.publishedAt).getTime();

  // Subida de logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("La imagen no puede pesar más de 2MB.");
      return;
    }

    try {
      setUploadingLogo(true);
      const newBlob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload"
      });
      setLogoUrl(newBlob.url);
    } catch (err: unknown) {
      alert("Error al subir imagen.");
    } finally {
      setUploadingLogo(false);
    }
  };

  // Guardar Borrador
  const handleSaveDraft = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        const res = await updateLocalCampaignAction(campaign.id, currentFormState);
        if (res.success && res.campaign) {
          setCampaign(res.campaign as any);
          setSuccessMsg("¡Borrador guardado correctamente!");
          setTimeout(() => setSuccessMsg(null), 3000);
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : "Error al guardar el borrador.";
        setErrorMsg(error);
      }
    });
  };

  // Publicar Cambios con Scroll Automático a Campo Inválido
  const handlePublish = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    let invalidFieldId: string | null = null;
    let targetTab: "identidad" | "beneficio" | "whatsapp" | "privacidad" = "identidad";

    if (!businessName) {
      invalidFieldId = "field-businessName";
      targetTab = "identidad";
    } else if (!clubName) {
      invalidFieldId = "field-clubName";
      targetTab = "identidad";
    } else if (!benefitTitle) {
      invalidFieldId = "field-benefitTitle";
      targetTab = "beneficio";
    } else if (!benefitDescription) {
      invalidFieldId = "field-benefitDescription";
      targetTab = "beneficio";
    } else if (!whatsappNumber) {
      invalidFieldId = "field-whatsappNumber";
      targetTab = "whatsapp";
    } else if (!consentText) {
      invalidFieldId = "field-consentText";
      targetTab = "privacidad";
    }

    if (invalidFieldId) {
      setActiveTab(targetTab);
      setErrorMsg("Completa los campos obligatorios antes de publicar.");
      setTimeout(() => {
        const elem = document.getElementById(invalidFieldId!);
        if (elem) {
          elem.scrollIntoView({ behavior: "smooth", block: "center" });
          elem.focus();
        }
      }, 150);
      return;
    }

    const confirmPub = window.confirm("¿Estás seguro de que deseas publicar los cambios? Se actualizará la versión pública de la landing del club.");
    if (!confirmPub) return;

    startTransition(async () => {
      try {
        const pubRes = await publishLocalCampaignAction(campaign.id, currentFormState);
        if (pubRes.success && pubRes.campaign) {
          setCampaign(pubRes.campaign as any);
          setSuccessMsg("¡Campaña publicada con éxito!");
          setTimeout(() => setSuccessMsg(null), 3000);
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : "Error al publicar la campaña.";
        setErrorMsg(error);
      }
    });
  };

  return (
    <div className="space-y-6 pb-36 lg:pb-0">
      
      {/* Cabecera del Editor */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <Link
            href="/dashboard/local/campanas"
            onClick={(e) => handleBackNavigation(e, "/dashboard/local/campanas")}
            className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline uppercase tracking-wider block"
          >
            ← Volver a Campañas
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{name || "Campaña"}</h1>
            <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${
              campaign.status === "PUBLISHED"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                : campaign.status === "PAUSED"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                  : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            }`}>
              {campaign.status === "PUBLISHED" ? "Publicada" : "Borrador"}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">/club/{campaign.slug}</p>
        </div>

        {/* Botones de acción escritorio */}
        <div className="hidden lg:flex flex-wrap gap-2.5">
          <button
            onClick={handleSaveDraft}
            disabled={isPending}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition border border-slate-300 dark:border-slate-700 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? "Guardando..." : "Guardar Borrador"}
          </button>
          <button
            onClick={handlePublish}
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition shadow-md shadow-blue-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? "Publicando..." : "Publicar Cambios"}
          </button>
        </div>
      </div>

      {/* Alertas de Estado */}
      {hasUnsavedChanges && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm">
          <span>⚠️ Tienes cambios en el editor sin guardar. Haz clic en "Guardar Borrador".</span>
        </div>
      )}

      {hasUnpublishedChanges && !hasUnsavedChanges && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 text-blue-800 dark:text-blue-300 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm">
          <span>📢 Existen cambios guardados en borrador que aún no han sido publicados en la landing.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-bold rounded-xl shadow-sm">
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-xl shadow-sm">
          🎉 {successMsg}
        </div>
      )}

      {/* Grid de Edición */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Columna Izquierda: Pestañas y Formulario */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          
          {/* Navegación por Pestañas del Editor */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto bg-slate-50 dark:bg-slate-950">
            {[
              { id: "identidad", label: "Identidad" },
              { id: "presentacion", label: "Presentación" },
              { id: "beneficio", label: "Beneficio" },
              { id: "whatsapp", label: "WhatsApp" },
              { id: "privacidad", label: "Privacidad" },
              { id: "touchpoints", label: "Puntos NFC/QR" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 whitespace-nowrap transition cursor-pointer ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-white bg-white dark:bg-slate-900"
                    : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-6">
            
            {/* Sección: Puntos NFC y QR */}
            {activeTab === "touchpoints" && (
              <div className="space-y-6">
                {/* Guía Visual de 3 Pasos */}
                <div className="bg-blue-50 dark:bg-slate-950 border border-blue-200 dark:border-slate-800 p-4 rounded-2xl space-y-3">
                  <h4 className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                    📌 Guía de Activación y Asignación
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-slate-700 dark:text-slate-300">
                    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                      <span className="font-black text-blue-600 dark:text-blue-400 block text-xs">Paso 1</span>
                      <p className="font-medium leading-relaxed">Define el lugar donde instalarás el soporte.</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                      <span className="font-black text-blue-600 dark:text-blue-400 block text-xs">Paso 2</span>
                      <p className="font-medium leading-relaxed">Descarga el QR generado para la gráfica.</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                      <span className="font-black text-blue-600 dark:text-blue-400 block text-xs">Paso 3</span>
                      <p className="font-medium leading-relaxed">Smart NFC Chile vincula y prueba la tarjeta NFC incluida en el pack.</p>
                    </div>
                  </div>
                  <div className="text-[10.5px] text-slate-600 dark:text-slate-400 space-y-1 pt-1 font-medium">
                    <p>• <strong>Código QR:</strong> Se descarga e imprime de inmediato sin dependencias de hardware.</p>
                    <p>• <strong>Soporte y NFC:</strong> Configurado, despachado y controlado por la administración central.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {initialTouchpoints.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No tienes ningún punto de contacto registrado para esta campaña.</p>
                  ) : (
                    initialTouchpoints.map((tp: any) => {
                      const assignedCard = tp.physicalNfcCard;
                      const qrRedirectUrl = `${PUBLIC_APP_ORIGIN}/q/${tp.code}`;
                      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrRedirectUrl)}`;
                      const targetChipUrl = assignedCard ? `${PUBLIC_APP_ORIGIN}/t/${assignedCard.token}` : null;

                      return (
                        <div key={tp.id} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="space-y-3 flex-1">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-slate-900 dark:text-white">{tp.name}</h4>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${tp.isActive ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
                                  {tp.isActive ? "Activo" : "Inactivo"}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">Código opaco: {tp.code}</p>
                            </div>

                            {/* Vinculación NFC */}
                            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                              {assignedCard ? (
                                <div className="space-y-2">
                                  <div>
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold uppercase">✓ Punto de contacto activo</p>
                                    <p className="text-xs text-slate-700 dark:text-slate-300 font-bold mt-1">La tarjeta NFC y el código QR dirigen correctamente a esta campaña.</p>
                                    <p className="text-[9.5px] text-slate-500 font-mono mt-1">Token físico: {assignedCard.token}</p>
                                  </div>

                                  {/* URL grabada físicamente en chip */}
                                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                    <span className="text-[9.5px] font-mono text-slate-600 dark:text-slate-400 truncate">
                                      URL en chip: {targetChipUrl}
                                    </span>
                                    <button
                                      onClick={() => {
                                        if (targetChipUrl) {
                                          navigator.clipboard.writeText(targetChipUrl);
                                          alert("¡URL del chip copiada al portapapeles!");
                                        }
                                      }}
                                      className="text-[9px] font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                                    >
                                      📋 Copiar Link
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold uppercase">⏳ Configuración en preparación</p>
                                  <p className="text-xs text-slate-700 dark:text-slate-300 font-bold mt-1">
                                    Smart NFC Chile está preparando la tarjeta NFC incluida en tu pack. Mientras tanto, el código QR de este punto ya está disponible.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Descarga QR */}
                          {campaign.status === "PUBLISHED" ? (
                            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 w-full md:w-auto md:min-w-[210px]">
                              <img src={qrImageUrl} alt="QR Code" className="w-14 h-14 bg-white p-1 rounded-lg border border-slate-200" />
                              <div className="space-y-1">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(qrRedirectUrl);
                                    alert("¡Enlace QR copiado!");
                                  }}
                                  className="text-[9px] font-black text-slate-700 dark:text-slate-300 hover:underline block text-left"
                                >
                                  🔗 Copiar Enlace QR
                                </button>
                                <a
                                  href={qrImageUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[9px] font-black text-blue-600 dark:text-blue-400 hover:underline block text-left"
                                >
                                  📥 Descargar QR
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center w-full md:w-auto md:max-w-[150px]">
                              <p className="text-[9px] text-slate-500 font-bold">QR no disponible</p>
                              <p className="text-[8px] text-slate-400 mt-1">Publica la campaña para activar el QR.</p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Sección: Identidad */}
            {activeTab === "identidad" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block tracking-wider">Logo de tu Negocio</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="text-xs text-slate-600 dark:text-slate-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-200 dark:file:bg-slate-800 file:text-slate-800 dark:file:text-white hover:file:bg-slate-300 cursor-pointer"
                    />
                  </div>
                  {uploadingLogo && <span className="text-xs text-blue-600 font-bold animate-pulse">Subiendo...</span>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block tracking-wider">Nombre Comercial *</label>
                    <input
                      id="field-businessName"
                      type="text"
                      placeholder="ej. Café Altura"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-none text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block tracking-wider">Nombre del Club *</label>
                    <input
                      id="field-clubName"
                      type="text"
                      placeholder="ej. Club Altura"
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-none text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block tracking-wider">Dirección Física del Local</label>
                  <input
                    type="text"
                    placeholder="ej. Av. Providencia 1234, Santiago"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-none text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            )}

            {/* Sección: Presentación */}
            {activeTab === "presentacion" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block tracking-wider">Titular de Bienvenida</label>
                  <input
                    type="text"
                    placeholder="ej. ¡Te damos la bienvenida al Club!"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-none text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block tracking-wider">Subtítulo de Bienvenida</label>
                  <textarea
                    rows={3}
                    placeholder="ej. Regístrate y recibe un café gratis en tu próxima visita."
                    value={subheadline}
                    onChange={(e) => setSubheadline(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-none text-xs text-slate-900 dark:text-slate-100 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block tracking-wider">Color Principal (Hex)</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-9 w-9 p-0 border-0 rounded-lg cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block tracking-wider">Color Secundario (Hex)</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="h-9 w-9 p-0 border-0 rounded-lg cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sección: Beneficio */}
            {activeTab === "beneficio" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block tracking-wider">Etiqueta (Label)</label>
                    <input
                      type="text"
                      placeholder="ej. Bienvenido / Promo"
                      value={benefitLabel}
                      onChange={(e) => setBenefitLabel(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-none text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block tracking-wider">Título del Beneficio *</label>
                    <input
                      id="field-benefitTitle"
                      type="text"
                      placeholder="ej. Café Express de Regalo"
                      value={benefitTitle}
                      onChange={(e) => setBenefitTitle(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-none text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block tracking-wider">Descripción del Beneficio *</label>
                  <textarea
                    id="field-benefitDescription"
                    rows={3}
                    placeholder="Ingresa los detalles sobre qué incluye el beneficio..."
                    value={benefitDescription}
                    onChange={(e) => setBenefitDescription(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-none text-xs text-slate-900 dark:text-slate-100 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block tracking-wider">Términos y Condiciones</label>
                  <textarea
                    rows={2}
                    placeholder="ej. Válido sólo consumo presencial por un registro."
                    value={benefitConditions}
                    onChange={(e) => setBenefitConditions(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-none text-xs text-slate-900 dark:text-slate-100 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Sección: WhatsApp */}
            {activeTab === "whatsapp" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block tracking-wider">Número de WhatsApp del Local *</label>
                  <input
                    id="field-whatsappNumber"
                    type="text"
                    placeholder="ej. +56912345678"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-none text-xs text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block tracking-wider">Mensaje Preparado</label>
                  <textarea
                    rows={3}
                    placeholder="ej. Hola! Quiero activar mi beneficio del Club Altura."
                    value={whatsappMessage}
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-none text-xs text-slate-900 dark:text-slate-100 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Sección: Privacidad */}
            {activeTab === "privacidad" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase block tracking-wider">Texto de Consentimiento Legal *</label>
                  <textarea
                    id="field-consentText"
                    rows={4}
                    placeholder="Escribe el descargo de responsabilidad para la ley de datos personales..."
                    value={consentText}
                    onChange={(e) => setConsentText(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:outline-none text-xs text-slate-900 dark:text-slate-100 resize-none"
                  />
                </div>
              </div>
            )}

          </div>

          {/* Botón de previsualización en móvil */}
          <div className="lg:hidden p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-center">
            <button
              onClick={() => setShowPreviewModal(true)}
              className="bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold py-2 px-5 rounded-xl text-xs transition cursor-pointer"
            >
              👁️ Abrir Vista Previa Móvil
            </button>
          </div>

        </div>

        {/* Columna Derecha: Vista Previa */}
        <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-6 bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl flex items-center justify-center">
          <MobilePreview campaign={currentFormState} />
        </div>

      </div>

      {/* Sticky Action Bar para Móviles (Requisito Parte B & F) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t bg-white/95 dark:bg-slate-900/95 backdrop-blur p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${
            isPending
              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 animate-pulse"
              : hasUnsavedChanges
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                : hasUnpublishedChanges
                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
          }`}>
            {isPending
              ? "Procesando..."
              : hasUnsavedChanges
                ? "Sin guardar"
                : hasUnpublishedChanges
                  ? "Sin publicar"
                  : "Guardado"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDraft}
            disabled={isPending}
            className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold text-[10px] uppercase py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 disabled:opacity-50 active:scale-95"
          >
            Borrador
          </button>
          <button
            onClick={handlePublish}
            disabled={isPending}
            className="bg-blue-600 text-white font-extrabold text-[10px] uppercase py-2 px-3.5 rounded-xl shadow-md disabled:opacity-50 active:scale-95"
          >
            Publicar
          </button>
        </div>
      </div>

      {/* Modal de Confirmación al Intentar Salir del Editor */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="text-3xl">⚠️</div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">¿Descartar cambios sin guardar?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Tienes modficaciones pendientes en el editor. Si sales ahora, tus cambios no guardados se perderán.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setShowExitModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-extrabold"
              >
                Permanecer aquí
              </button>
              <button
                onClick={confirmExit}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-extrabold shadow-md"
              >
                Descartar y Salir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vista Previa Móvil */}
      {showPreviewModal && (
        <div className="lg:hidden fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full flex flex-col items-center space-y-4">
            <div className="flex justify-between items-center w-full pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Vista Previa Móvil</span>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <MobilePreview campaign={currentFormState} />
          </div>
        </div>
      )}

    </div>
  );
}
