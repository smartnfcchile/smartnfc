import React from "react";
import { prisma } from "../../lib/prisma";
import crypto from "crypto";
import RestablecerContrasenaForm from "./RestablecerContrasenaForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    token?: string;
  }>;
}

export default async function RestablecerContrasenaPage({ searchParams }: PageProps) {
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
            Falta el token de restablecimiento de contraseña. Solicita un nuevo enlace.
          </p>
          <Link href="/olvide-mi-contrasena" className="inline-block text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  // Validar token en base de datos
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  const isValid = resetToken && !resetToken.usedAt && resetToken.expiresAt > new Date();

  if (!isValid) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#07101F] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-2xl p-8 shadow-xl space-y-4">
          <h2 className="text-lg font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Token Inválido o Expirado
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
            El enlace para restablecer tu contraseña no es válido, ya ha sido utilizado o ha expirado (límite de 60 minutos).
          </p>
          <Link href="/olvide-mi-contrasena" className="inline-block text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <RestablecerContrasenaForm
      token={token}
      userName={resetToken.user.name || "Usuario"}
    />
  );
}
