"use client";

import React, { useState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "../superadmin/actions";
import SmartNFCLogo from "../../components/brand/SmartNFCLogo";

export default function OlvideMiContrasenaPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await requestPasswordResetAction(email);
      setMessage(res.message);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error al procesar la solicitud.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07101F] flex items-center justify-center p-4 sm:p-6 transition-colors duration-200">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 p-6 sm:p-8 rounded-2xl shadow-2xl space-y-6">
        
        {/* Branding Header */}
        <div className="text-center space-y-3">
          <SmartNFCLogo size={32} className="mx-auto" />
          <h2 className="text-xl font-black text-slate-905 dark:text-white tracking-tight">
            ¿Olvidaste tu contraseña?
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Ingresa tu correo electrónico registrado y te enviaremos las instrucciones de restablecimiento de contraseña.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl">
            ⚠️ {error}
          </div>
        )}

        {message ? (
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-xl text-center space-y-2">
            <div>✉️ {message}</div>
            <div className="text-[10px] text-slate-455">Revisa tu bandeja de entrada y correo no deseado (Spam).</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Campo Correo */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider block">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@empresa.com"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
              />
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold py-3 rounded-xl shadow-md transition-all disabled:opacity-40 cursor-pointer"
            >
              {loading ? "Enviando..." : "Solicitar Enlace"}
            </button>
          </form>
        )}

        <div className="text-center pt-2 border-t border-slate-100 dark:border-white/5">
          <Link href="/login" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>

      </div>
    </div>
  );
}
