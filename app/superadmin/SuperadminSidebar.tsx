"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import SmartNFCLogo from "../../components/brand/SmartNFCLogo";

export default function SuperadminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      title: "Resumen",
      href: "/superadmin",
      icon: "📊",
    },
    {
      title: "Empresas",
      href: "/superadmin/empresas",
      icon: "🏢",
    },
    {
      title: "Locales",
      href: "/superadmin/locales",
      icon: "📍",
    },
    {
      title: "Usuarios",
      href: "/superadmin/usuarios",
      icon: "👥",
    },
    {
      title: "Licencias",
      href: "/superadmin/licencias",
      icon: "💳",
    },
    {
      title: "Tarjetas NFC",
      href: "/superadmin/tarjetas",
      icon: "🎴",
    },
  ];

  return (
    <>
      {/* Hamburguesa Móvil */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-900 text-slate-900 dark:text-white w-full sticky top-0 z-50">
        <Link href="/superadmin">
          <SmartNFCLogo size={24} variant="default" className="dark:hidden" />
          <SmartNFCLogo size={24} variant="dark" className="hidden dark:flex" />
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white text-lg focus:outline-none"
        >
          {isOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-45"
        />
      )}

      {/* Sidebar de Superadmin */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-slate-900 dark:bg-slate-950 text-white flex flex-col justify-between z-40 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } pt-16 lg:pt-6 pb-6 px-4`}
      >
        <div className="space-y-6">
          <div className="hidden lg:block px-3">
            <Link href="/superadmin">
              <SmartNFCLogo size={26} variant="dark" />
            </Link>
            <span className="text-[9px] uppercase font-black text-blue-400 block tracking-widest mt-1.5 leading-none">
              Superadministración
            </span>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "text-slate-350 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 pt-6 border-t border-slate-800 px-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
          >
            <span>🏠</span>
            <span>Volver a Smart NFC</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-left"
          >
            <span>🚪</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
