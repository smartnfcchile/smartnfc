"use client";

import { useState } from "react";

type LeadFormProps = {
  cardId: string;
  themeColor: string;
  themeMode?: string;
  buttonText?: string | null;
  introText?: string | null;
  confirmText?: string | null;
  consentText?: string | null;
  contactSource?: "NFC" | "QR" | "DIRECT";
  onSuccess?: () => void; // Optional callback when form succeeds
};

export default function LeadForm({ 
  cardId, 
  themeColor, 
  themeMode,
  buttonText,
  introText,
  confirmText,
  consentText,
  contactSource = "DIRECT",
  onSuccess
}: LeadFormProps) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">(
    "idle"
  );
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const isDark = themeMode === "dark";

  const formStyles = {
    form: isDark ? "w-full space-y-4" : "w-full space-y-4",
    title: isDark ? "text-xl font-black text-white" : "text-xl font-black text-slate-950",
    paragraph: isDark ? "text-sm leading-6 text-slate-400" : "text-sm leading-6 text-slate-500",
    input: isDark 
      ? "w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-theme" 
      : "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-955 outline-none placeholder:text-slate-400 focus:border-theme",
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    if (consentText && !consentAccepted) {
      alert("Debes aceptar la Autorización para el tratamiento de datos.");
      return;
    }

    try {
      setStatus("sending");
      const payload = {
        cardId,
        name: String(formData.get("name") || ""),
        company: String(formData.get("company") || ""),
        email: String(formData.get("email") || ""),
        phone: String(formData.get("phone") || ""),
        message: String(formData.get("message") || ""),
        nickname: String(formData.get("nickname") || ""), // Honeypot
        consentAccepted: !!consentText ? consentAccepted : true,
        consentText: consentText || null,
        source: contactSource,
      };

      const response = await fetch("/api/public/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setStatus("error");
        return;
      }
      form.reset();
      setConsentAccepted(false);
      setStatus("success");
      if (onSuccess) {
        onSuccess();
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={formStyles.form}
      style={{ "--theme-color-focus": themeColor } as React.CSSProperties}
    >
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-500">
          Contacto
        </p>

        <h2 className={formStyles.title}>
          {buttonText || "Compárteme tus datos"}
        </h2>

        <p className={formStyles.paragraph + " mt-1"}>
          {introText || "Completa este formulario y nos pondremos en contacto a la brevedad."}
        </p>
      </div>

      <div className="space-y-3">
        {/* Campo trampa Honeypot (Invisible para humanos) */}
        <input
          type="text"
          name="nickname"
          style={{ display: "none" }}
          autoComplete="off"
          tabIndex={-1}
        />

        {/* Campos Iniciales Obligatorios */}
        <input
          name="name"
          required
          type="text"
          placeholder="Nombre completo"
          autoComplete="name"
          className={formStyles.input}
        />

        <input
          name="phone"
          required
          type="tel"
          placeholder="Teléfono móvil"
          autoComplete="tel"
          className={formStyles.input}
        />

        {/* Progressive Disclosure Action */}
        {!showMore && (
          <button
            type="button"
            onClick={() => setShowMore(true)}
            className="text-xs font-bold transition hover:opacity-80 flex items-center gap-1.5 py-1"
            style={{ color: themeColor }}
          >
            <span>+ Compartir más datos (opcional)</span>
          </button>
        )}

        {/* Campos Opcionales Desplegados */}
        {showMore && (
          <div className="space-y-3 pt-1 animate-slideDown">
            <input
              name="email"
              type="email"
              placeholder="Correo electrónico (opcional)"
              autoComplete="email"
              className={formStyles.input}
            />

            <input
              name="company"
              type="text"
              placeholder="Empresa (opcional)"
              autoComplete="organization"
              className={formStyles.input}
            />

            <textarea
              name="message"
              placeholder="Mensaje opcional"
              rows={3}
              className={`${formStyles.input} resize-none`}
            />
          </div>
        )}

        {/* Checkbox de Consentimiento: Autorización para el tratamiento de datos */}
        {consentText && (
          <label className="flex items-start gap-2.5 pt-2 select-none cursor-pointer">
            <input 
              type="checkbox"
              required
              checked={consentAccepted}
              onChange={(e) => setConsentAccepted(e.target.checked)}
              className="mt-1 rounded border-slate-800 bg-slate-950 text-blue-650 focus:ring-blue-500 w-4 h-4 cursor-pointer"
            />
            <span className={`text-[11px] leading-5 font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {consentText}
            </span>
          </label>
        )}

        {/* Botón de Envío */}
        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shadow-md"
          style={{ backgroundColor: themeColor }}
        >
          {status === "sending" ? "Enviando..." : (buttonText || "Enviar mis datos")}
        </button>

        {status === "success" && (
          <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 font-bold text-center">
            {confirmText || "Datos enviados correctamente."}
          </p>
        )}

        {status === "error" && (
          <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 font-bold text-center">
            No pudimos guardar los datos. Intenta nuevamente.
          </p>
        )}
      </div>
    </form>
  );
}