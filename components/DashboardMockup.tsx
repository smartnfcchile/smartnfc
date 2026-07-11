"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  QrCode,
  UserCheck,
  TrendingUp,
  Settings,
  HelpCircle,
  BarChart3,
  Bell,
  Search,
  FileText,
  Clipboard,
  Link as LinkIcon,
  Shield,
  Activity,
  Cloud,
  Eye,
  Calendar,
  ChevronDown
} from "lucide-react";

export default function DashboardMockup() {
  const [scans, setScans] = useState(842);
  const [activities, setActivities] = useState([
    {
      id: 1,
      name: "Daniela Rojas",
      action: "Actualizó su perfil",
      time: "Hace 2m",
      initials: "DR",
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-450 border-blue-500/20 dark:border-blue-400/10"
    },
    {
      id: 2,
      name: "Felipe Navarro",
      action: "Nuevo contacto generado",
      time: "Hace 8m",
      initials: "FN",
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-455 border-emerald-500/20 dark:border-emerald-400/10"
    },
    {
      id: 3,
      name: "Camila Herrera",
      action: "Tarjeta escaneada",
      time: "Hace 17m",
      initials: "CH",
      color: "bg-amber-500/10 text-amber-605 dark:text-amber-450 border-amber-500/20 dark:border-amber-400/10"
    },
    {
      id: 4,
      name: "Rodrigo Soto",
      action: "Documento actualizado",
      time: "Hace 34m",
      initials: "RS",
      color: "bg-purple-500/10 text-purple-650 dark:text-purple-450 border-purple-500/20 dark:border-purple-400/10"
    }
  ]);

  // Micro-animation: increment scan count and add Nicolás Fuentes activity after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setScans(843);
      setActivities(prev => [
        {
          id: 99,
          name: "Nicolás Fuentes",
          action: "Tarjeta escaneada",
          time: "Hace unos s",
          initials: "NF",
          color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-455 border-emerald-500/20 dark:border-emerald-400/10"
        },
        ...prev.slice(0, 3) // keep max 4 activities
      ]);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Menu items based exactly on reference image
  const menuItems = [
    { name: "Panel de gestión", icon: BarChart3, active: true },
    { name: "Colaboradores", icon: Users, active: false },
    { name: "Tarjetas", icon: QrCode, active: false },
    { name: "Contactos", icon: UserCheck, active: false },
    { name: "Estadísticas", icon: TrendingUp, active: false },
    { name: "Documentos", icon: FileText, active: false },
    { name: "Formularios", icon: Clipboard, active: false },
    { name: "Integraciones", icon: LinkIcon, active: false },
    { name: "Configuración", icon: Settings, active: false },
    { name: "Ayuda", icon: HelpCircle, active: false }
  ];

  // SVG Chart points: smooth, stable, elegant curve matching reference image
  const linePoints = "0,55 80,48 160,50 240,30 320,36 400,16 480,12";

  return (
    <div className="w-full rounded-2xl border border-slate-200/50 dark:border-white/10 bg-slate-50 dark:bg-slate-950 shadow-[0_20px_50px_rgba(0,0,0,0.03)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col text-left font-sans select-none text-[11px]">
      
      {/* 1. BROWSER HEADER BAR (Ultra compact) */}
      <div className="h-8 bg-slate-100/50 dark:bg-slate-900/40 border-b border-slate-200/30 dark:border-white/10 px-3 flex items-center justify-between shrink-0">
        {/* Windows Buttons */}
        <div className="flex items-center gap-1.2">
          <div className="w-2 h-2 rounded-full bg-[#FF5F56] shrink-0" />
          <div className="w-2 h-2 rounded-full bg-[#FFBD2E] shrink-0" />
          <div className="w-2 h-2 rounded-full bg-[#27C93F] shrink-0" />
        </div>
        
        {/* Address Bar */}
        <div className="flex items-center gap-1.2 px-2.5 py-0.5 bg-white dark:bg-slate-950 border border-slate-200/30 dark:border-white/5 rounded text-[8px] font-medium text-slate-500 dark:text-slate-400 font-mono w-40 justify-center">
          <Shield size={8} className="text-emerald-500" />
          <span>app.smartnfc.cl/sidep-chile</span>
        </div>
        
        {/* Right Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[8px] text-slate-450 dark:text-slate-500">
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sincronizado</span>
          </div>
          <div className="relative h-5 w-5 flex items-center justify-center text-slate-400 dark:text-slate-500">
            <Bell size={10} />
            <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-blue-600 border border-white dark:border-slate-950" />
          </div>
          <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center text-white font-extrabold text-[8px] shadow-sm">
            CM
          </div>
        </div>
      </div>

      {/* 2. MAIN LAYOUT CONTAINER (Optimized height for 1080p panoramic look) */}
      <div className="flex flex-row overflow-hidden min-h-[380px] md:min-h-[400px]">
        
        {/* SIDEBAR (Compact padding and gap) */}
        <aside className="w-40 md:w-44 border-r border-slate-200/40 dark:border-white/10 bg-slate-100/40 dark:bg-slate-900/80 p-3 flex flex-col gap-4 shrink-0 hidden sm:flex justify-between">
          <div className="space-y-4">
            {/* Organization Header */}
            <div className="flex items-center gap-1.5 px-0.5">
              <div className="h-6 w-6 rounded bg-blue-600 flex items-center justify-center text-white font-black text-[10px] shadow-sm">
                S
              </div>
              <div className="space-y-0.5">
                <span className="text-[6px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 block leading-none">
                  Organización
                </span>
                <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none">
                  SIDEP Chile
                </h3>
              </div>
            </div>

            {/* Menu Links */}
            <nav className="space-y-0.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-[9px] font-semibold transition-all duration-200 ${
                      item.active
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-600/10"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/40 dark:hover:bg-slate-850/50"
                    }`}
                  >
                    <Icon size={11} className={item.active ? "text-white" : "text-slate-400"} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Lower Sidebar NFC Card Info */}
          <div className="bg-blue-50/30 dark:bg-slate-800/30 border border-blue-500/10 dark:border-white/5 rounded-lg p-2.5 space-y-0.5 text-[8px]">
            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold">
              <QrCode size={10} />
              <span>Tarjetas activas</span>
            </div>
            <div className="text-xs font-black text-slate-850 dark:text-slate-100">
              148
            </div>
            <a href="#tarjetas" className="text-[7px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 pt-0.5">
              Ver todas <span className="translate-y-[-0.5px]">→</span>
            </a>
          </div>
        </aside>

        {/* DASHBOARD CONTENT AREA */}
        <main className="flex-grow p-3 md:p-4 flex flex-col gap-4 bg-[#F8FAFC] dark:bg-slate-950 overflow-y-auto">
          
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-slate-200/20 dark:border-white/10 pb-2.5">
            <div className="space-y-0.5">
              <h2 className="text-sm font-black text-slate-850 dark:text-slate-100 tracking-tight leading-none">
                Hola, Carlos Muñoz
              </h2>
              <div className="flex items-center gap-1.5">
                <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  ADMINISTRADOR - SIDEP CHILE
                </p>
                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[7px] font-extrabold tracking-wide uppercase">
                  <span className="w-0.5 h-0.5 rounded-full bg-emerald-500 animate-pulse" />
                  29 hoy
                </span>
              </div>
            </div>
            
            {/* Date selector button */}
            <button className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/5 rounded-md text-[8px] text-slate-500 dark:text-slate-400 font-bold shadow-sm">
              <Calendar size={9} />
              <span>Últimos 7 días</span>
              <ChevronDown size={8} />
            </button>
          </div>

          {/* Indicators Grid (Extremely compact) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1 */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/10 rounded-lg p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
              <span className="text-[8px] font-bold text-slate-450 dark:text-slate-450 uppercase tracking-wider block leading-none">
                Colaboradores
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-sm font-black text-slate-850 dark:text-slate-100">143</span>
                <span className="text-[7px] text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10 px-1 py-0.5 rounded">96%</span>
              </div>
              <span className="text-[7px] text-slate-400 dark:text-slate-500 mt-0.5 block font-semibold leading-none">vs. anterior</span>
            </div>
            
            {/* Card 2 */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/10 rounded-lg p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
              <span className="text-[8px] font-bold text-slate-450 dark:text-slate-450 uppercase tracking-wider block leading-none">
                Tarjetas activas
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-sm font-black text-slate-850 dark:text-slate-100">148</span>
                <span className="text-[7px] text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10 px-1 py-0.5 rounded">OK</span>
              </div>
              <span className="text-[7px] text-slate-400 dark:text-slate-500 mt-0.5 block font-semibold leading-none">vs. anterior</span>
            </div>

            {/* Card 3 */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/10 rounded-lg p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
              <span className="text-[8px] font-bold text-slate-450 dark:text-slate-450 uppercase tracking-wider block leading-none">
                Contactos
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-sm font-black text-slate-850 dark:text-slate-100">327</span>
                <span className="text-[7px] text-blue-600 dark:text-blue-400 font-extrabold bg-blue-500/10 px-1 py-0.5 rounded">Contactos</span>
              </div>
              <span className="text-[7px] text-slate-400 dark:text-slate-500 mt-0.5 block font-semibold leading-none">vs. anterior</span>
            </div>

            {/* Card 4 */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/10 rounded-lg p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between transition-all duration-355">
              <span className="text-[8px] font-bold text-slate-450 dark:text-slate-450 uppercase tracking-wider block leading-none">
                Escaneos
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-sm font-black text-slate-850 dark:text-slate-100">
                  {scans}
                </span>
                <span className="text-[7px] text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10 px-1 py-0.5 rounded font-mono">+12%</span>
              </div>
              <span className="text-[7px] text-slate-400 dark:text-slate-500 mt-0.5 block font-semibold leading-none">vs. anterior</span>
            </div>
          </div>

          {/* Charts & Activity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            
            {/* Left: General Performance Chart (h-24 only) */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/10 rounded-xl p-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">
                  Rendimiento general
                </span>
                <button className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/30 dark:border-white/5 rounded text-[8px] text-slate-500 dark:text-slate-405 font-bold">
                  <span>Líneas</span>
                  <ChevronDown size={6} />
                </button>
              </div>
              
              {/* Very compact curve area */}
              <div className="h-24 w-full flex items-end justify-center relative pt-2">
                {/* Compact Floating Tooltip */}
                <div className="absolute top-2 right-12 bg-white dark:bg-slate-900 border border-slate-250/20 dark:border-white/10 rounded-md p-1.5 shadow-md text-[8px] space-y-0.5 z-10 select-none">
                  <div className="font-extrabold text-slate-800 dark:text-slate-100 leading-none">{scans}</div>
                  <div className="text-[7px] text-slate-400 dark:text-slate-500 font-semibold leading-none">Escaneos Domingo</div>
                </div>

                <svg className="w-full h-full overflow-visible" viewBox="0 0 480 100" preserveAspectRatio="none">
                  {/* Subtle Grid Lines */}
                  <line x1="0" y1="20" x2="480" y2="20" stroke="rgba(148, 163, 184, 0.03)" strokeWidth="1" />
                  <line x1="0" y1="50" x2="480" y2="50" stroke="rgba(148, 163, 184, 0.03)" strokeWidth="1" />
                  <line x1="0" y1="80" x2="480" y2="80" stroke="rgba(148, 163, 184, 0.03)" strokeWidth="1" />
                  
                  {/* Soft Fill Area Gradient */}
                  <defs>
                    <linearGradient id="curveGradientCompact" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.06" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  <path
                    d={`M 0,100 L ${linePoints} L 480,100 Z`}
                    fill="url(#curveGradientCompact)"
                  />
                  
                  {/* Stable Curve Line */}
                  <path
                    d={`M ${linePoints}`}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* Highlight Point */}
                  <circle cx="400" cy="16" r="3" fill="#2563eb" stroke="#ffffff" strokeWidth="1" />
                </svg>
              </div>

              <div className="flex justify-between text-[7px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest pt-2 border-t border-slate-100 dark:border-white/10 font-mono">
                <span>Lun</span>
                <span>Mar</span>
                <span>Mié</span>
                <span>Jue</span>
                <span>Vie</span>
                <span>Sáb</span>
                <span>Dom</span>
              </div>
            </div>

            {/* Right: Recent Activity Area */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/10 rounded-xl p-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10 mb-2">
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">
                  Actividad reciente
                </span>
                <a href="#actividad" className="text-[8px] font-bold text-blue-600 dark:text-blue-400 hover:underline">
                  Ver todas
                </a>
              </div>
              
              {/* Dynamic activity rows */}
              <div className="space-y-2.5 flex-grow flex flex-col justify-center">
                {activities.map((act) => (
                  <div key={act.id} className="flex items-center justify-between text-[10px] transition-all duration-500">
                    <div className="flex items-center gap-2">
                      <div className={`h-6 w-6 rounded-md flex items-center justify-center font-extrabold text-[8px] border shrink-0 ${act.color}`}>
                        {act.initials}
                      </div>
                      <div className="truncate">
                        <div className="font-extrabold text-slate-700 dark:text-slate-250 leading-none truncate">{act.name}</div>
                        <div className="text-[8px] text-slate-400 dark:text-slate-450 font-medium mt-0.5 leading-none truncate">{act.action}</div>
                      </div>
                    </div>
                    <span className="text-[7px] text-slate-400 dark:text-slate-550 font-bold whitespace-nowrap ml-1 shrink-0">
                      {act.time}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* See all activity link */}
              <div className="border-t border-slate-100 dark:border-white/5 pt-2 mt-2 text-center">
                <a href="#actividad" className="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-0.5">
                  Ver toda la actividad <span>→</span>
                </a>
              </div>
            </div>

          </div>

          {/* Third Row: Lower Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1 */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/10 rounded-lg p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex items-center justify-between">
              <div className="space-y-0.5 text-left truncate">
                <span className="text-[7px] font-bold text-slate-400 dark:text-slate-405 uppercase tracking-wider block truncate">
                  Visitas perfil
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-850 dark:text-slate-100">1.248</span>
                  <span className="text-[6px] text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10 px-1 py-0.2 rounded">+16%</span>
                </div>
              </div>
              <div className="h-6 w-6 rounded bg-blue-50/40 dark:bg-slate-900 border border-blue-500/5 dark:border-white/5 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Eye size={10} />
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/10 rounded-lg p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex items-center justify-between">
              <div className="space-y-0.5 text-left truncate">
                <span className="text-[7px] font-bold text-slate-400 dark:text-slate-405 uppercase tracking-wider block truncate">
                  Contactos guardados
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-850 dark:text-slate-100">327</span>
                  <span className="text-[6px] text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10 px-1 py-0.2 rounded">+22%</span>
                </div>
              </div>
              <div className="h-6 w-6 rounded bg-blue-50/40 dark:bg-slate-900 border border-blue-500/5 dark:border-white/5 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <UserCheck size={10} />
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/10 rounded-lg p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex items-center justify-between">
              <div className="space-y-0.5 text-left truncate">
                <span className="text-[7px] font-bold text-slate-400 dark:text-slate-405 uppercase tracking-wider block truncate">
                  Documentos
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-850 dark:text-slate-100">86</span>
                  <span className="text-[6px] text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10 px-1 py-0.2 rounded">+9%</span>
                </div>
              </div>
              <div className="h-6 w-6 rounded bg-blue-50/40 dark:bg-slate-900 border border-blue-500/5 dark:border-white/5 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <FileText size={10} />
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/10 rounded-lg p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex items-center justify-between">
              <div className="space-y-0.5 text-left truncate">
                <span className="text-[7px] font-bold text-slate-400 dark:text-slate-405 uppercase tracking-wider block truncate">
                  Formularios
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-850 dark:text-slate-100">74</span>
                  <span className="text-[6px] text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10 px-1 py-0.2 rounded">+18%</span>
                </div>
              </div>
              <div className="h-6 w-6 rounded bg-blue-50/40 dark:bg-slate-900 border border-blue-500/5 dark:border-white/5 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Clipboard size={10} />
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* 3. BOTTOM STATUS BAR */}
      <div className="border-t border-slate-200/20 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/20 px-4 py-2 flex flex-col md:flex-row gap-3 justify-between text-[8px] text-slate-500 dark:text-slate-450 select-none">
        <div className="flex items-center gap-1.5">
          <Activity size={10} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="flex gap-1 items-center truncate">
            <span className="font-extrabold uppercase tracking-wide">Sistema Operativo</span>
            <span className="text-slate-400 dark:text-slate-500 truncate">Todos los servicios en línea</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          <Shield size={10} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="flex gap-1 items-center truncate">
            <span className="font-extrabold uppercase tracking-wide">Seguridad</span>
            <span className="text-slate-400 dark:text-slate-500 truncate">Encriptación de extremo a extremo</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Cloud size={10} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="flex gap-1 items-center truncate">
            <span className="font-extrabold uppercase tracking-wide">Respaldo</span>
            <span className="text-slate-400 dark:text-slate-500 truncate">Hoy 08:15 AM</span>
          </div>
        </div>
      </div>

    </div>
  );
}
