"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { activateUserAccountAction } from "../superadmin/actions";
import SmartNFCLogo from "../../components/brand/SmartNFCLogo";

interface ActivarCuentaFormProps {
  token: string;
  userId: string;
  userName: string;
  companyName: string;
}

export default function ActivarCuentaForm({
  token,
  userName,
  companyName,
}: ActivarCuentaFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reglas de política de contraseña (Requisito 6)
  const rules = {
    length: password.length >= 10,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };

  const isPasswordValid = Object.values(rules).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError("La contraseña no cumple con todas las políticas de seguridad.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      await activateUserAccountAction(token, password);
      setSuccess(true);
      setTimeout(() => {
        router.push("/login?activated=true");
      }, 2000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error al activar la cuenta.";
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
            Activar tu Cuenta
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Hola <strong className="text-slate-800 dark:text-slate-200">{userName}</strong>, estás a punto de activar tu acceso para <strong className="text-slate-800 dark:text-slate-200">{companyName}</strong>.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl">
            ⚠️ {error}
          </div>
        )}

        {success ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-xl text-center space-y-2">
            <div>🎉 ¡Cuenta activada con éxito!</div>
            <div className="text-[10px] text-slate-400">Redireccionando al inicio de sesión...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Campo Contraseña */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                Contraseña Nueva
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
              />
            </div>

            {/* Campo Confirmar Contraseña */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block">
                Confirmar Contraseña
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:text-white"
              />
            </div>

            {/* Checklist de Políticas de Seguridad (Requisito 6) */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 rounded-xl text-[10px] space-y-1.5 text-slate-500 dark:text-slate-450">
              <span className="font-bold block uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 text-[9px]">
                Requisitos de Seguridad
              </span>
              <div className="flex items-center gap-2">
                <span>{rules.length ? "🟢" : "⚫"}</span>
                <span className={rules.length ? "text-slate-700 dark:text-slate-300 font-bold" : ""}>Mínimo 10 caracteres</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{rules.uppercase ? "🟢" : "⚫"}</span>
                <span className={rules.uppercase ? "text-slate-700 dark:text-slate-300 font-bold" : ""}>Al menos una letra mayúscula (A-Z)</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{rules.lowercase ? "🟢" : "⚫"}</span>
                <span className={rules.lowercase ? "text-slate-700 dark:text-slate-300 font-bold" : ""}>Al menos una letra minúscula (a-z)</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{rules.number ? "🟢" : "⚫"}</span>
                <span className={rules.number ? "text-slate-700 dark:text-slate-300 font-bold" : ""}>Al menos un número (0-9)</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{rules.symbol ? "🟢" : "⚫"}</span>
                <span className={rules.symbol ? "text-slate-700 dark:text-slate-300 font-bold" : ""}>Al menos un carácter especial (@, $, #, !, etc.)</span>
              </div>
            </div>

            {/* Botón de Activación */}
            <button
              type="submit"
              disabled={loading || !isPasswordValid || password !== confirmPassword}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold py-3 rounded-xl shadow-md transition-all disabled:opacity-40 cursor-pointer"
            >
              {loading ? "Activando..." : "Activar mi Cuenta"}
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
