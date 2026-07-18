"use client";

import React, { useState, useEffect, useRef } from "react";
import UrbanLocalTemplate, { UrbanTemplateData } from "../../../components/local/UrbanLocalTemplate";
import { subscribeToCampaignAction } from "../../dashboard/local/actions";

type ClubLandingClientProps = {
  slug: string;
  touchpointCode?: string;
  initialData: UrbanTemplateData;
};

export default function ClubLandingClient({ slug, touchpointCode, initialData }: ClubLandingClientProps) {
  // Estados de control del formulario
  const [formName, setFormName] = useState("");
  const [formWhatsapp, setFormWhatsapp] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Evitar doble registro de visita en desarrollo/strict mode (Requisito H-4)
  const viewTracked = useRef(false);

  useEffect(() => {
    if (viewTracked.current) return;
    viewTracked.current = true;

    // Registrar visita VIEW al montar el componente (Requisito H-8)
    fetch("/api/local/events/view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        slug,
        touchpointCode
      })
    }).catch(err => {
      console.error("Error al registrar visita:", err);
    });
  }, [slug, touchpointCode]);

  // Manejar el submit de suscripción
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);

    if (!consentAccepted) {
      setError("Debes aceptar el consentimiento legal para continuar.");
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await subscribeToCampaignAction(slug, {
        name: formName,
        whatsapp: formWhatsapp,
        consentAccepted,
        touchpointCode
      });

      if (res.success && res.whatsappLink) {
        setWhatsappLink(res.whatsappLink);
        setIsSuccess(true);
      } else {
        setError(res.error || "No se pudo procesar la suscripción.");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Ocurrió un error inesperado.";
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Registrar clic en WhatsApp (Requisito G-8)
  const handleWhatsappClick = () => {
    fetch("/api/local/events/view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        slug,
        touchpointCode,
        eventType: "WHATSAPP_REDIRECT"
      })
    }).catch(() => {});
  };

  // Envolver la acción de abrir WhatsApp para registrar el evento
  const onSubmitWhatsappRedirect = (e: React.FormEvent) => {
    handleWhatsappClick();
  };

  return (
    <div onClick={() => {
      if (isSuccess && whatsappLink) {
        // Enlazar el clic del contenedor de éxito si presionan el botón
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === "A" && activeElement.textContent?.includes("WhatsApp")) {
          handleWhatsappClick();
        }
      }
    }}>
      <UrbanLocalTemplate
        data={initialData}
        mode="public"
        formName={formName}
        formWhatsapp={formWhatsapp}
        consentAccepted={consentAccepted}
        onFormNameChange={setFormName}
        onFormWhatsappChange={setFormWhatsapp}
        onConsentAcceptedChange={setConsentAccepted}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isSuccess={isSuccess}
        whatsappLink={whatsappLink}
        error={error}
      />
    </div>
  );
}
