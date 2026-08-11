import React from "react";
import type { Metadata } from "next";
import { requireSuperAdmin } from "../../lib/permissions";
import SuperadminSidebar from "./SuperadminSidebar";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Administración", robots: { index: false, follow: false, noarchive: true, nosnippet: true } };

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Validar en servidor que sea SUPER_ADMIN (Requisito 2 y 3)
  try {
    await requireSuperAdmin();
  } catch {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07101F] text-slate-900 dark:text-white flex flex-col lg:flex-row transition-colors duration-200">
      {/* Barra lateral de Superadministración */}
      <SuperadminSidebar />

      {/* Contenedor de contenido */}
      <div className="flex-grow lg:pl-64 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200/50 dark:border-slate-800/80 px-6 flex items-center justify-between bg-white/70 dark:bg-slate-950/70 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase tracking-widest leading-none select-none">
              Panel Superadministración
            </span>
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
            Consola Global
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full flex-grow">
          {children}
        </main>
      </div>
    </div>
  );
}
