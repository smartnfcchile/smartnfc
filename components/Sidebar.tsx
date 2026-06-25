"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type SidebarProps = {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
};

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isAdmin = user.role === "SUPERADMIN" || user.role === "CLIENT_ADMIN";

  const menuItems = [
    {
      title: "Inicio",
      href: "/dashboard",
      icon: "🏠",
      show: true,
    },
    {
      title: "Métricas y Analíticas",
      href: "/dashboard/metrics",
      icon: "📊",
      show: true,
    },
    {
      title: "Gestionar Vendedores",
      href: "/dashboard/users",
      icon: "👥",
      show: isAdmin,
    },
    {
      title: "Tarjetas Virtuales",
      href: "/dashboard/cards",
      icon: "🎴",
      show: isAdmin,
    },
    {
      title: "Prospectos (CRM)",
      href: "/dashboard/leads",
      icon: "💰",
      show: true,
    },
  ];

  return (
    <>
      {/* Botón de Hamburguesa para Móviles */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 text-white w-full sticky top-0 z-50">
        <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          SmartNFC
        </span>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          {isOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Capa de fondo oscura para cerrar el menú en móviles al hacer clic afuera */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        />
      )}

      {/* Menú Lateral */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-slate-950/80 backdrop-blur-md border-r border-slate-900 text-white flex flex-col justify-between z-40 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } pt-16 lg:pt-6 pb-6 px-4`}
      >
        {/* Cabecera del Sidebar */}
        <div className="space-y-6">
          <div className="hidden lg:block px-3">
            <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              SmartNFC
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-widest mt-1">
              Plataforma Corporativa
            </span>
          </div>

          {/* Menú de Enlaces */}
          <nav className="space-y-1">
            {menuItems
              .filter((item) => item.show)
              .map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all ${
                      isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                        : "text-slate-400 hover:text-white hover:bg-slate-900/50"
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.title}</span>
                  </Link>
                );
              })}
          </nav>
        </div>

        {/* Sección de Usuario y Cierre de Sesión */}
        <div className="space-y-4 pt-6 border-t border-slate-900 px-2">
          <div className="flex flex-col">
            <span className="font-bold text-slate-200 truncate text-sm">
              {user.name || "Usuario"}
            </span>
            <span className="text-xs text-slate-500 truncate mt-0.5">
              {user.role === "CLIENT_ADMIN" ? "Administrador" : "Vendedor"}
            </span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
          >
            <span>🚪</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
