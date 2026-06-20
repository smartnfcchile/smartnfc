"use client";

import { useState } from "react";

type LeadFormProps = {
  cardId: string;
  themeColor: string;
  themeMode?: string;
};

export default function LeadForm({ cardId, themeColor, themeMode }: LeadFormProps) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">(
    "idle"
  );

  const isDark = themeMode === "dark";

  const formStyles = {
    form: isDark ? "mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5" : "mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5",
    title: isDark ? "mt-2 text-xl font-black text-white" : "mt-2 text-xl font-black text-slate-950",
    paragraph: isDark ? "mt-2 text-sm leading-6 text-slate-400" : "mt-2 text-sm leading-6 text-slate-500",
    input: isDark 
      ? "w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500" 
      : "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-500",
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    const formData = new FormData(event.currentTarget);

    const payload = {
      cardId,
      name: String(formData.get("name") || ""),
      company: String(formData.get("company") || ""),
      position: String(formData.get("position") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      message: String(formData.get("message") || ""),
      nickname: String(formData.get("nickname") || ""), // Honeypot
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
    setStatus("success");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={formStyles.form}
    >
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
        Contacto
      </p>

      <h2 className={formStyles.title}>
        Déjame tus datos
      </h2>

      <p className={formStyles.paragraph}>
        Completa este formulario y te contactaremos para mostrarte cómo funciona
        una tarjeta NFC inteligente.
      </p>

      <div className="mt-5 space-y-3">
        {/* Campo trampa Honeypot (Invisible para humanos) */}
        <input
          type="text"
          name="nickname"
          style={{ display: "none" }}
          autoComplete="off"
          tabIndex={-1}
        />

        <input
          name="name"
          required
          placeholder="Nombre"
          className={formStyles.input}
        />

        <input
          name="company"
          placeholder="Empresa"
          className={formStyles.input}
        />

        <input
          name="position"
          placeholder="Cargo"
          className={formStyles.input}
        />

        <input
          name="email"
          required
          type="email"
          placeholder="Email"
          className={formStyles.input}
        />

        <input
          name="phone"
          placeholder="Teléfono"
          className={formStyles.input}
        />

        <textarea
          name="message"
          placeholder="Mensaje opcional"
          rows={3}
          className={`${formStyles.input} resize-none`}
        />

        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: themeColor }}
        >
          {status === "sending" ? "Enviando..." : "Solicitar contacto"}
        </button>

        {status === "success" && (
          <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            Datos enviados correctamente.
          </p>
        )}

        {status === "error" && (
          <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            No pudimos guardar los datos. Intenta nuevamente.
          </p>
        )}
      </div>
    </form>
  );
}