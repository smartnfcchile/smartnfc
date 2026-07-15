import React from "react";
import { validateActivationTokenAction } from "../superadmin/actions";
import ActivarCuentaForm from "./ActivarCuentaForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    token?: string;
  }>;
}

export default async function ActivarCuentaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#07101F] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-2xl p-8 shadow-xl space-y-4">
          <h2 className="text-lg font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Enlace Inválido
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
            Falta el token de activación de cuenta. Solicita un nuevo enlace de invitación al administrador de tu plataforma.
          </p>
          <Link href="/login" className="inline-block text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  try {
    const data = await validateActivationTokenAction(token);
    return (
      <ActivarCuentaForm
        token={token}
        userId={data.userId}
        userName={data.userName || "Administrador"}
        companyName={data.companyName}
      />
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "El token de activación no es válido o ha expirado.";
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#07101F] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-2xl p-8 shadow-xl space-y-4">
          <h2 className="text-lg font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Token Inválido o Expirado
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
            {errorMsg}
          </p>
          <Link href="/login" className="inline-block text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }
}
