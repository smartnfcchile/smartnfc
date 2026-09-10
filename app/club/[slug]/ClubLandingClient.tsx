"use client";
import React, { useState, useEffect, useRef } from "react";
import UrbanLocalTemplate, { UrbanTemplateData } from "../../../components/local/UrbanLocalTemplate";
import { subscribeToCampaignAction } from "../../dashboard/local/actions";

export default function ClubLandingClient({slug,touchpointCode,initialData,initialVisitId,consentToken}:{
  slug:string;touchpointCode?:string;initialData:UrbanTemplateData;initialVisitId?:string;consentToken:string;
}) {
  const [formName,setFormName]=useState(""), [formWhatsapp,setFormWhatsapp]=useState("");
  const [consentAccepted,setConsentAccepted]=useState(false), [isSubmitting,setIsSubmitting]=useState(false);
  const [isSuccess,setIsSuccess]=useState(false), [whatsappLink,setWhatsappLink]=useState("");
  const [error,setError]=useState<string|null>(null), [visitId,setVisitId]=useState(initialVisitId || "");
  const tracking=useRef<Promise<string>|null>(null);
  useEffect(()=>{
    if (tracking.current) return;
    const id=initialVisitId || crypto.randomUUID();
    setVisitId(id);
    tracking.current=fetch("/api/local/events/view",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({slug,touchpointCode,visitId:id})
    }).then(r=>r.ok?id:"").catch(()=>"");
  },[slug,touchpointCode,initialVisitId]);
  async function handleSubmit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    const honeypot=String(new FormData(e.currentTarget).get("honeypot") || "");
    setIsSubmitting(true);setError(null);
    try {
      const trackedId=await tracking.current;
      const res=await subscribeToCampaignAction(slug,{
        name:formName,whatsapp:formWhatsapp,consentAccepted,touchpointCode,
        ...(trackedId?{visitId:trackedId}:{}),consentToken,
        honeypot
      });
      if (res.success && res.whatsappLink) {setWhatsappLink(res.whatsappLink);setIsSuccess(true);}
      else setError(res.error || "No se pudo procesar el registro.");
    } catch {setError("No pudimos completar el registro.");}
    finally {setIsSubmitting(false);}
  }
  function onWhatsappClick() {
    if (!visitId) return;
    void fetch("/api/local/events/view",{
      method:"POST",keepalive:true,headers:{"Content-Type":"application/json"},
      body:JSON.stringify({slug,visitId,eventType:"WHATSAPP_REDIRECT"})
    });
  }
  return <UrbanLocalTemplate data={initialData} mode="public" formName={formName} formWhatsapp={formWhatsapp}
    consentAccepted={consentAccepted} onFormNameChange={setFormName} onFormWhatsappChange={setFormWhatsapp}
    onConsentAcceptedChange={setConsentAccepted} onSubmit={handleSubmit} isSubmitting={isSubmitting}
    isSuccess={isSuccess} whatsappLink={whatsappLink} error={error} slug={slug}
    onWhatsappClick={onWhatsappClick} visitId={visitId}/>;
}
