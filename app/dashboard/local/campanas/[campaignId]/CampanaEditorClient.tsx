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

  const handleAssociateCard = async (cardPhysicalId: string, touchpointId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await associateNfcCardAction({ cardPhysicalId, touchpointId });
      if (res.success) {
        setSuccessMsg("¡Tarjeta NFC vinculada con éxito!");
        setTimeout(() => setSuccessMsg(null), 3000);
        router.refresh();
      } else {
        setErrorMsg(res.error || "Error al vincular la tarjeta.");
      }
    } catch (err: any) {
      setErrorMsg("Error al vincular la tarjeta.");
    }
  };

  const handleDisassociateCard = async (cardPhysicalId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await disassociateNfcCardAction({ cardPhysicalId });
      if (res.success) {
        setSuccessMsg("¡Tarjeta NFC desvinculada con éxito!");
        setTimeout(() => setSuccessMsg(null), 3000);
        router.refresh();
      } else {
        setErrorMsg(res.error || "Error al desvincular la tarjeta.");
      }
    } catch (err: any) {
      setErrorMsg("Error al desvincular la tarjeta.");
    }
  };

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

  // Verificar cambios sin publicar (Requisito 6 de la parte B)
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

  // Publicar Cambios
  const handlePublish = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!businessName || !clubName || !benefitTitle || !benefitDescription || !whatsappNumber || !consentText) {
      setErrorMsg("No puedes publicar la campaña sin completar los campos obligatorios: Nombre comercial, Nombre del Club, Título y descripción del beneficio, WhatsApp y el texto de consentimiento.");
      return;
    }

    const confirmPub = window.confirm("¿Estás seguro de que deseas publicar los cambios? Se actualizará la versión pública de la landing del club.");
    if (!confirmPub) return;

    startTransition(async () => {
      try {
        // Ejecutar Server Action de publicación atómica (Requisito B)
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
    <div className="space-y-6">
      
      {/* Cabecera del Editor */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <Link href="/dashboard/local/campanas" className="text-[10px] font-bold text-slate-500 hover:text-slate-350 uppercase tracking-widest block">
            ← Volver a Campañas
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white tracking-tight">{name || "Campaña"}</h1>
            <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold ${
              campaign.status === "PUBLISHED"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : campaign.status === "PAUSED"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : campaign.status === "ARCHIVED"
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-450"
                    : "bg-slate-550/10 border-slate-700 text-slate-400"
            }`}>
              {campaign.status === "PUBLISHED" ? "Publicada" : campaign.status === "ARCHIVED" ? "Archivada" : "Borrador"}
            </span>
          </div>
          <p className="text-xs text-slate-450 font-mono">/club/{campaign.slug}</p>
        </div>

        {/* Botones de acción principales */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleSaveDraft}
            disabled={isPending}
            className="bg-slate-800 hover:bg-slate-750 text-white font-extrabold py-2 px-4 rounded-xl text-xs transition border border-slate-700 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? "Guardando..." : "Guardar Borrador"}
          </button>
          <button
            onClick={handlePublish}
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-2 px-4 rounded-xl text-xs transition shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            Publicar Cambios
          </button>
        </div>
      </div>

    {/* Sección: Puntos NFC y QR (Requisito Parte D y F) */}
    {activeTab === "touchpoints" && (
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Puntos de Contacto (NFC / QR)</h3>
          <p className="text-xs text-slate-400">Vincula tus tarjetas físicas NFC a tus puntos de contacto o descarga sus códigos QR correspondientes.</p>
        </div>

        <div className="space-y-4">
          {initialTouchpoints.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No tienes ningún punto de contacto registrado para esta campaña.</p>
          ) : (
            initialTouchpoints.map((tp: any) => {
              const assignedCard = tp.physicalNfcCard;
              const host = typeof window !== "undefined" ? window.location.host : "localhost:3000";
              const protocol = host.includes("localhost") ? "http" : "https";
              const qrRedirectUrl = `${protocol}://${host}/q/${tp.code}`;
              const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrRedirectUrl)}`;

              return (
                <div key={tp.id} className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-2 flex-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-white">{tp.name}</h4>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${tp.isActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800 text-slate-400 border border-slate-700"}`}>
                          {tp.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-455 font-mono mt-0.5">Código opaco: {tp.code}</p>
                    </div>

                    {/* Asignación de Tarjeta NFC Física (Requisito Parte D) */}
                    <div className="p-3 bg-slate-950/60 border border-slate-855 rounded-xl max-w-sm">
                      {assignedCard ? (
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] text-blue-400 font-bold">NFC Vinculado</p>
                            <p className="text-[9px] text-slate-350 font-mono mt-0.5">Token: {assignedCard.token.substring(0, 16)}...</p>
                          </div>
                          <button
                            onClick={() => handleDisassociateCard(assignedCard.id)}
                            className="text-[9px] font-black text-rose-450 hover:text-rose-350 uppercase tracking-wider cursor-pointer border border-rose-500/20 px-2 py-1 rounded bg-rose-500/5 transition hover:bg-rose-500/10 active:scale-95"
                          >
                            Desvincular
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[10px] text-slate-500">Sin tarjeta física NFC asignada.</p>
                          {initialAvailableCards.length > 0 ? (
                            <div className="flex items-center gap-2">
                              <select
                                id={`select-${tp.id}`}
                                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-300 focus:outline-none flex-1 font-mono"
                              >
                                <option value="">-- Seleccionar tarjeta --</option>
                                {initialAvailableCards.map((card: any) => (
                                  <option key={card.id} value={card.id}>
                                    {card.token.substring(0, 16)}...
                                  </option>
                                ))}
                              </select>
                              <button
                                  onClick={() => {
                                    const select = document.getElementById(`select-${tp.id}`) as HTMLSelectElement;
                                    if (select && select.value) {
                                      handleAssociateCard(select.value, tp.id);
                                    }
                                  }}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-3 py-2 rounded-lg text-[9px] transition active:scale-95 cursor-pointer"
                              >
                                Vincular
                              </button>
                            </div>
                          ) : (
                            <p className="text-[9px] text-slate-600 italic">No tienes tarjetas NFC libres asignadas a tu empresa.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Descarga y enlace del QR (Requisito F-6, F-7 e I-4) */}
                  {campaign.status === "PUBLISHED" ? (
                    <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-850 w-full md:w-auto md:min-w-[220px]">
                      <img src={qrImageUrl} alt="QR Code" className="w-14 h-14 bg-white p-1 rounded-lg" />
                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(qrRedirectUrl);
                            alert("¡Enlace del código QR copiado al portapapeles!");
                          }}
                          className="text-[9px] font-black text-slate-300 hover:text-white uppercase tracking-wider block text-left cursor-pointer transition hover:underline"
                        >
                          🔗 Copiar Enlace QR
                        </button>
                        <a
                          href={qrImageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[9px] font-black text-blue-400 hover:text-blue-350 uppercase tracking-wider block text-left transition hover:underline"
                        >
                          📥 Descargar (Imagen)
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-center w-full md:w-auto md:max-w-[150px]">
                      <p className="text-[9px] text-amber-500/80 font-bold">QR no disponible</p>
                      <p className="text-[8px] text-slate-500 mt-1">Completa los datos pendientes y publica la campaña para descargar el QR.</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    )}

      {/* Alertas de cambios */}
      {hasUnsavedChanges && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold rounded-xl flex items-center gap-2">
          <span>⚠️ Tienes cambios en el editor sin guardar. Haz clic en "Guardar Borrador".</span>
        </div>
      )}

      {hasUnpublishedChanges && !hasUnsavedChanges && (
        <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold rounded-xl flex items-center gap-2">
          <span>📢 Existen cambios en borrador que no han sido publicados. Presiona "Publicar Cambios" para subirlos.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs font-semibold rounded-xl">
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 text-xs font-semibold rounded-xl">
          🎉 {successMsg}
        </div>
      )}

      {/* Grid en escritorio de 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Columna Izquierda: Formulario controlado */}
        <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          
          {/* Tabs del editor */}
          <div className="flex border-b border-slate-850 overflow-x-auto">
            {["identidad", "presentacion", "beneficio", "whatsapp", "privacidad", "touchpoints"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 whitespace-nowrap transition cursor-pointer ${
                  activeTab === tab
                    ? "border-blue-500 text-white"
                    : "border-transparent text-slate-450 hover:text-slate-200"
                }`}
              >
                {tab === "touchpoints" ? "Puntos NFC/QR" : tab}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-6">
            
            {/* Sección: Identidad */}
            {activeTab === "identidad" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-950/20 border border-slate-850 rounded-xl">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Logo de tu Negocio</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="text-xs text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-800 file:text-white hover:file:bg-slate-750 cursor-pointer"
                    />
                  </div>
                  {uploadingLogo && <span className="text-xs text-blue-400 font-bold animate-pulse">Subiendo...</span>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase block tracking-wider">Nombre Comercial</label>
                    <input
                      type="text"
                      placeholder="ej. Café Altura"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-455 uppercase block tracking-wider">Nombre del Club</label>
                    <input
                      type="text"
                      placeholder="ej. Club Altura"
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase block tracking-wider">Dirección Física del Local</label>
                  <input
                    type="text"
                    placeholder="ej. Av. Providencia 1234, Santiago"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-200"
                  />
                </div>
              </div>
            )}

            {/* Sección: Presentación */}
            {activeTab === "presentacion" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase block tracking-wider">Titular de Bienvenida</label>
                  <input
                    type="text"
                    placeholder="ej. ¡Te damos la bienvenida al Club!"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase block tracking-wider">Subtítulo de Bienvenida</label>
                  <textarea
                    rows={3}
                    placeholder="ej. Regístrate y recibe un café gratis en tu próxima visita."
                    value={subheadline}
                    onChange={(e) => setSubheadline(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-200 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase block tracking-wider">Color Principal (Hex)</label>
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
                        className="flex-1 p-2 rounded-xl bg-slate-950 border border-slate-850 text-xs text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase block tracking-wider">Color Secundario (Hex)</label>
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
                        className="flex-1 p-2 rounded-xl bg-slate-950 border border-slate-850 text-xs text-slate-200 font-mono"
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
                    <label className="text-[10px] font-bold text-slate-450 uppercase block tracking-wider">Etiqueta (Label)</label>
                    <input
                      type="text"
                      placeholder="ej. Bienvenido / Promo"
                      value={benefitLabel}
                      onChange={(e) => setBenefitLabel(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase block tracking-wider">Título del Beneficio</label>
                    <input
                      type="text"
                      placeholder="ej. Café Express de Regalo"
                      value={benefitTitle}
                      onChange={(e) => setBenefitTitle(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-455 uppercase block tracking-wider">Descripción del Beneficio</label>
                  <textarea
                    rows={3}
                    placeholder="Ingresa los detalles sobre qué incluye el beneficio..."
                    value={benefitDescription}
                    onChange={(e) => setBenefitDescription(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-200 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase block tracking-wider">Términos y Condiciones</label>
                  <textarea
                    rows={2}
                    placeholder="ej. Válido sólo consumo presencial por un registro."
                    value={benefitConditions}
                    onChange={(e) => setBenefitConditions(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-200 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase block tracking-wider">Fecha Inicio Vigencia</label>
                    <input
                      type="date"
                      value={benefitStartAt}
                      onChange={(e) => setBenefitStartAt(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase block tracking-wider">Fecha Término Vigencia</label>
                    <input
                      type="date"
                      value={benefitEndAt}
                      onChange={(e) => setBenefitEndAt(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-200"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Sección: WhatsApp */}
            {activeTab === "whatsapp" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase block tracking-wider">Número de WhatsApp del Local</label>
                  <input
                    type="text"
                    placeholder="ej. +56912345678"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-200 font-mono"
                  />
                  <span className="text-[9px] text-slate-500 block">Número al que se le enviará el mensaje preparado.</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase block tracking-wider">Mensaje Preparado (WhatsApp)</label>
                  <textarea
                    rows={3}
                    placeholder="ej. Hola! Quiero activar mi beneficio del Club Altura. Mi nombre es {nombre}."
                    value={whatsappMessage}
                    onChange={(e) => setWhatsappMessage(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-200 resize-none"
                  />
                  <span className="text-[9px] text-slate-500 block">Mensaje predeterminado que el cliente enviará al comercio.</span>
                </div>
              </div>
            )}

            {/* Sección: Privacidad */}
            {activeTab === "privacidad" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-950/20 border border-slate-850 rounded-xl text-xs font-bold text-slate-400">
                  <span>Versión del Consentimiento:</span>
                  <span className="font-mono text-white bg-slate-800 px-2 py-0.5 rounded">v{campaign.consentVersion}</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase block tracking-wider">Texto de Consentimiento Legal</label>
                  <textarea
                    rows={4}
                    placeholder="Escribe el descargo de responsabilidad para la ley de datos personales..."
                    value={consentText}
                    onChange={(e) => setConsentText(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 focus:border-blue-500 focus:outline-none text-xs text-slate-200 resize-none"
                  />
                  <span className="text-[9px] text-slate-500 block">Se le presentará al usuario al lado de la casilla de consentimiento obligatorio.</span>
                </div>
              </div>
            )}

          </div>

          {/* Botones de móviles para alternar preview */}
          <div className="lg:hidden p-4 border-t border-slate-850 bg-slate-950/30 flex justify-center">
            <button
              onClick={() => setShowPreviewModal(true)}
              className="bg-slate-800 hover:bg-slate-750 text-white font-extrabold py-2 px-5 rounded-xl text-xs transition border border-slate-750 cursor-pointer"
            >
              👁️ Abrir Vista Previa
            </button>
          </div>

        </div>

        {/* Columna Derecha: Vista previa en tiempo real (Sticky en pantallas grandes) */}
        <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-6 bg-slate-900/10 border border-slate-800/40 p-6 rounded-3xl flex items-center justify-center">
          <MobilePreview campaign={currentFormState} />
        </div>

      </div>

      {/* Modal/Overlay de Vista Previa para Móviles */}
      {showPreviewModal && (
        <div className="lg:hidden fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full flex flex-col items-center space-y-4">
            <div className="flex justify-between items-center w-full pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Visualización Móvil</span>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                Cerrar ✕
              </button>
            </div>
            <MobilePreview campaign={currentFormState} />
          </div>
        </div>
      )}

    </div>
  );
}
