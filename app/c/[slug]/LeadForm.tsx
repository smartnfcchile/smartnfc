"use client";

import { useState } from "react";

type LeadFormProps = {
  cardId: string;
  themeColor: string;
};

export default function LeadForm({ cardId, themeColor }: LeadFormProps) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">(
    "idle"
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");

    const formData = new FormData(event.currentTarget);

    const payload = {
      cardId,
      name: String(formData.get("name") || ""),
      company: String(formData.get("company") || ""),
      position: String(formData.get("position") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      message: String(formData.get("message") || ""),
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

    event.currentTarget.reset();
    setStatus("success");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5"
    >
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
        Contacto
      </p>

      <h2 className="mt-2 text-xl font-black text-white">
        Déjame tus datos
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-400">
        Completa este formulario y te contactaremos para mostrarte cómo funciona
        una tarjeta NFC inteligente.
      </p>

      <div className="mt-5 space-y-3">
        <input
          name="name"
          required
          placeholder="Nombre"
          className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
        />

        <input
          name="company"
          placeholder="Empresa"
          className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
        />

        <input
          name="position"
          placeholder="Cargo"
          className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
        />

        <input
          name="email"
          required
          type="email"
          placeholder="Email"
          className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
        />

        <input
          name="phone"
          placeholder="Teléfono"
          className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
        />

        <textarea
          name="message"
          placeholder="Mensaje opcional"
          rows={3}
          className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
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