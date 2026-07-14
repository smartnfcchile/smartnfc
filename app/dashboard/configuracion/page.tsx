"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop, ShieldAlert } from "lucide-react";
import SmartNFCLogo from "../../../components/brand/SmartNFCLogo";
import SmartNFCIcon from "../../../components/brand/SmartNFCIcon";

export default function ConfiguracionPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evitar hydration mismatch renderizando sólo después del montaje en el cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-40 w-full bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  const themeOptions = [
    {
      id: "light",
      name: "Tema Claro",
      description: "Interfaz limpia y de alto contraste.",
      icon: Sun,
    },
    {
      id: "dark",
      name: "Tema Oscuro",
      description: "Ideal para ambientes con poca luz.",
      icon: Moon,
    },
    {
      id: "system",
      name: "Sistema",
      description: "Se adapta a las preferencias de tu equipo.",
      icon: Laptop,
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Cabecera */}
      <div className="space-y-1 text-left">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Configuración
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
          Administra las opciones generales y la apariencia visual de la plataforma.
        </p>
      </div>

      {/* Sección Apariencia */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="space-y-1 text-left">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
            Apariencia
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
            Elige cómo se muestra la interfaz en tus dispositivos.
          </p>
        </div>

        {/* Tarjetas de Selección de Tema */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = theme === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                className={`flex flex-col items-start gap-4 p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                  isActive
                    ? "border-blue-600 bg-blue-50/20 dark:bg-blue-950/20 ring-1 ring-blue-600 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900/60 dark:hover:bg-slate-850/50"
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl border ${
                    isActive
                      ? "bg-blue-600 text-white border-blue-500"
                      : "bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800"
                  }`}
                >
                  <Icon size={16} />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {opt.name}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-medium">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sección Vista Previa de Logotipo (Requisito 4) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="space-y-1 text-left">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
            Identidad Visual de SmartNFC
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
            Vista previa del nuevo imagotipo oficial y el isotipo vectorial "S" sobre fondos claros y oscuros.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fondo Claro */}
          <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 flex flex-col items-center justify-center gap-6 min-h-[140px]">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">
              Fondo Claro
            </span>
            <div className="flex flex-col sm:flex-row gap-8 items-center">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[7px] text-slate-400 uppercase font-bold mb-1">Isotipo</span>
                <SmartNFCIcon size={36} variant="default" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[7px] text-slate-400 uppercase font-bold mb-1">Logotipo</span>
                <SmartNFCLogo size={36} variant="default" />
              </div>
            </div>
          </div>

          {/* Fondo Oscuro */}
          <div className="bg-[#07101F] rounded-2xl p-8 border border-[#263247] flex flex-col items-center justify-center gap-6 min-h-[140px]">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">
              Fondo Oscuro
            </span>
            <div className="flex flex-col sm:flex-row gap-8 items-center">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[7px] text-slate-500 uppercase font-bold mb-1">Isotipo</span>
                <SmartNFCIcon size={36} variant="dark" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[7px] text-slate-500 uppercase font-bold mb-1">Logotipo</span>
                <SmartNFCLogo size={36} variant="dark" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
