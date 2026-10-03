"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import SmartNFCLogo from "./brand/SmartNFCLogo";
import { Store } from "lucide-react";

type SidebarProps = {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
  activeProducts?: string[];
  capabilities?: string[];
};

export default function Sidebar({ user, activeProducts = ["EMPRESAS"], capabilities = [] }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isAdmin = user.role === "SUPERADMIN" || user.role === "COMPANY_OWNER" || user.role === "COMPANY_ADMIN";
  const isSuper = user.role === "SUPERADMIN";
  const hasEmpresas = isSuper || activeProducts.includes("EMPRESAS");

  const can = (capability: string) => capabilities.includes(capability);
  // SmartNFC Local es una herramienta de administración: solo administradores (las páginas también lo validan en servidor).
  const hasLocal = isAdmin && (isSuper || activeProducts.includes("LOCAL"));
  const menuItems: Array<{ title: string; href: string; icon: React.ReactNode; show: boolean; soon?: boolean }> = [
    { title: "Inicio", href: "/dashboard", icon: "🏠", show: true },
    { title: "Mi Tarjeta", href: "/dashboard/mi-tarjeta", icon: "👤", show: hasEmpresas },
    { title: "Métricas y Analíticas", href: "/dashboard/metrics", icon: "📊", show: can("ANALYTICS") },
    { title: "Prospectos (CRM)", href: "/dashboard/leads", icon: "💰", show: can("CRM") },
    { title: "Gestionar Integrantes", href: "/dashboard/users", icon: "👥", show: isAdmin && (can("TEAM_MANAGEMENT") || can("PROFILE")) },
    { title: "Tarjetas Virtuales", href: "/dashboard/cards", icon: "🎴", show: isAdmin && (can("TEAM_MANAGEMENT") || can("PROFILE")) },
    { title: "Política de edición", href: "/dashboard/configuracion/perfiles", icon: "🛡️", show: (user.role === "COMPANY_OWNER" || user.role === "COMPANY_ADMIN") && can("PROFILE_EDIT_POLICY") },
    // Administradores: diseños de la empresa. Colaboradores: solo los de su propia tarjeta (filtrado en servidor).
    { title: "Diseños físicos", href: "/dashboard/physical-designs", icon: "✦", show: hasEmpresas },
    { title: "Smart NFC Local", href: "/dashboard/local", icon: <Store className="h-4.5 w-4.5" />, show: hasLocal },
    { title: "Mis locales", href: "/dashboard/local/locales", icon: "🏪", show: hasLocal && can("LOCAL_ACCESS") },
    { title: "Puntos Inteligentes", href: "/dashboard/local/puntos", icon: "📍", show: hasLocal && can("LOCAL_TOUCHPOINTS") },
    { title: "Campañas y Club", href: "/dashboard/local/campanas", icon: "🎟️", show: hasLocal && can("LOCAL_CLUB") },
    { title: "Suscriptores", href: "/dashboard/local/suscriptores", icon: "📇", show: hasLocal && can("LOCAL_SUBSCRIBERS") },
    { title: "Reportes automáticos", href: "/dashboard/local/reportes", icon: "📈", show: hasLocal && can("LOCAL_REPORTS"), soon: true },
    { title: "Superadministración", href: "/superadmin", icon: "🛠️", show: isSuper },
    { title: "Configuración", href: "/dashboard/configuracion", icon: "⚙️", show: true },
  ];

  return (
    <>
      <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white w-full sticky top-0 z-50">
        <Link href="/">
          <SmartNFCLogo size={24} variant="default" className="dark:hidden" />
          <SmartNFCLogo size={24} variant="dark" className="hidden dark:flex" />
        </Link>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white text-lg focus:outline-none focus:ring-2 focus:ring-blue-600">
          {isOpen ? "✕" : "☰"}
        </button>
      </div>

      {isOpen && <div onClick={() => setIsOpen(false)} className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30" />}

      <aside className={`fixed top-0 bottom-0 left-0 w-64 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-r border-slate-200 dark:border-slate-900 text-slate-800 dark:text-white flex flex-col justify-between overflow-y-auto z-40 transition-transform duration-300 lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"} pt-16 lg:pt-6 pb-6 px-4`}>
        <div className="space-y-6">
          <div className="hidden lg:block px-3">
            <Link href="/">
              <SmartNFCLogo size={26} variant="default" className="dark:hidden" />
              <SmartNFCLogo size={26} variant="dark" className="hidden dark:flex" />
            </Link>
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block tracking-widest mt-1">Plataforma Corporativa</span>
          </div>

          <nav className="space-y-1">
            {menuItems.filter((item) => item.show).map((item) => {
              if (item.soon) {
                return (
                  <div key={item.href} aria-disabled="true" title="Disponible próximamente" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide text-slate-400 dark:text-slate-600 cursor-default select-none">
                    <span className="text-lg opacity-60">{item.icon}</span><span>{item.title}</span>
                    <span className="ml-auto rounded-full bg-slate-100 dark:bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Pronto</span>
                  </div>
                );
              }
              const isActive = pathname === item.href || (item.href === "/dashboard/mi-tarjeta" && pathname.startsWith("/dashboard/editor/"));
              return (
                <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all ${isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/50"}`}>
                  <span className="text-lg">{item.icon}</span><span>{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-900 px-2">
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate text-sm">{user.name || "Usuario"}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
              {user.role === "SUPERADMIN" ? "SuperAdmin" : (user.role === "COMPANY_OWNER" || user.role === "COMPANY_ADMIN" ? "Administrador" : "Colaborador")}
            </span>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide text-red-600 dark:text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-500/20">
            <span>🚪</span><span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
