"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Menu,
  X,
  Sun,
  Moon,
  CheckCircle2,
  Users,
  BarChart3,
  Shield,
  Activity,
  Layers,
  QrCode,
  User,
  CreditCard,
  Smartphone,
  ClipboardList,
  FileText,
  TrendingUp,
  Megaphone,
  Calendar,
  Headphones,
  Folder,
  LayoutTemplate,
  Eye,
  Palette,
  Laptop
} from "lucide-react";
import NextLink from "next/link";
import { useTheme } from "next-themes";
import SmartNFCLogo from "./brand/SmartNFCLogo";
import DashboardMockup from "./DashboardMockup";

export default function HomeClient() {
  const { theme, setTheme } = useTheme();
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(0);
  const [syncStatus, setSyncStatus] = useState({
    hubspot: "Conectado",
    google: "Conectado",
    microsoft: "Conectado",
    notificationVisible: false
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTemplate((prev) => (prev + 1) % 5);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(prev => {
        const nextState = { ...prev };
        const rand = Math.floor(Math.random() * 4);
        if (rand === 0) {
          nextState.hubspot = prev.hubspot === "Conectado" ? "Sincronizado" : "Conectado";
        } else if (rand === 1) {
          nextState.google = prev.google === "Conectado" ? "Actualizado" : "Conectado";
        } else if (rand === 2) {
          nextState.notificationVisible = !prev.notificationVisible;
        } else {
          nextState.microsoft = prev.microsoft === "Conectado" ? "Sincronizado" : "Conectado";
        }
        return nextState;
      });
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [size, setSize] = useState("");

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !company || !role || !size) return;
    
    // Simulate API call
    console.log("Demo requested:", { name, email, company, role, size });
    setFormSubmitted(true);
  };

  const handleCloseModal = () => {
    setDemoModalOpen(false);
    // Reset form after exit animation completes
    setTimeout(() => {
      setFormSubmitted(false);
      setName("");
      setEmail("");
      setCompany("");
      setRole("");
      setSize("");
    }, 200);
  };

  const getTemplateStyle = (index: number) => {
    const diff = (index - activeTemplate + 5) % 5;
    if (diff === 0) {
      return {
        transform: "translateX(0px) scale(1) rotate(0deg)",
        zIndex: 30,
        opacity: 1,
        cursor: "default" as const
      };
    } else if (diff === 1) {
      return {
        transform: "translateX(42px) scale(0.86) rotate(3deg)",
        zIndex: 20,
        opacity: 0.88,
        cursor: "pointer" as const
      };
    } else if (diff === 2) {
      return {
        transform: "translateX(78px) scale(0.72) rotate(6deg)",
        zIndex: 10,
        opacity: 0.55,
        cursor: "pointer" as const
      };
    } else if (diff === 3) {
      return {
        transform: "translateX(-78px) scale(0.72) rotate(-6deg)",
        zIndex: 10,
        opacity: 0.55,
        cursor: "pointer" as const
      };
    } else { // diff === 4
      return {
        transform: "translateX(-42px) scale(0.86) rotate(-3deg)",
        zIndex: 20,
        opacity: 0.88,
        cursor: "pointer" as const
      };
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative transition-colors duration-300 select-none">
      
      {/* 1. NAVEGACIÓN HEADER */}
      <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-white/75 dark:bg-slate-950/75 backdrop-blur-xl border-b border-slate-200/30 dark:border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.01)]"
          : "bg-transparent backdrop-blur-sm border-b border-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between">          {/* Logo */}
          <NextLink href="/" className="flex items-center gap-2">
            <SmartNFCLogo size={28} variant="default" className="dark:hidden" />
            <SmartNFCLogo size={28} variant="dark" className="hidden dark:flex" />
          </NextLink>

          {/* Menú Links Escritorio */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#plataforma" className="text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-250">
              Plataforma
            </a>
            <a href="#soluciones" className="text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-250">
              Soluciones
            </a>
            <a href="#plantillas" className="text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-250">
              Plantillas
            </a>
            <a href="#planes" className="text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-250">
              Planes
            </a>
            <a href="#contacto" className="text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-250">
              Contacto
            </a>
          </nav>

          {/* Acciones */}
          <div className="hidden md:flex items-center gap-5">
            {/* Selector de Tema Escritorio (Requisito 4) */}
            <div className="flex items-center bg-slate-100/80 dark:bg-slate-900/60 p-0.5 rounded-xl border border-slate-200/50 dark:border-slate-800/80 shrink-0">
              {[
                { id: "light", icon: Sun, label: "Claro" },
                { id: "dark", icon: Moon, label: "Oscuro" },
                { id: "system", icon: Laptop, label: "Sistema" }
              ].map((opt) => {
                const IconComponent = opt.icon;
                const isSel = isMounted && theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      isSel
                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-slate-450 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                    title={opt.label}
                  >
                    <IconComponent size={13} />
                  </button>
                );
              })}
            </div>

            <a
              href="/login"
              className="text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-250"
            >
              Iniciar Sesión
            </a>

            <button
              onClick={() => setDemoModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(37,99,235,0.15)] dark:shadow-[0_4px_14px_rgba(59,130,246,0.15)] transition-all duration-250 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Solicitar demostración
            </button>
          </div>

          {/* Hamburguesa Móvil */}
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg border border-card-border text-muted hover:text-foreground cursor-pointer"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Menú Móvil */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-card-border bg-background"
            >
              <div className="px-6 py-6 space-y-4 flex flex-col">
                <a
                  href="#plataforma"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-semibold text-muted hover:text-foreground"
                >
                  Plataforma
                </a>
                <a
                  href="#soluciones"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-semibold text-muted hover:text-foreground"
                >
                  Soluciones
                </a>
                <a
                  href="#plantillas"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-semibold text-muted hover:text-foreground"
                >
                  Plantillas
                </a>
                <a
                  href="#planes"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-semibold text-muted hover:text-foreground"
                >
                  Planes
                </a>
                <a
                  href="#contacto"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-semibold text-muted hover:text-foreground"
                >
                  Contacto
                </a>

                {/* Selector de tema móvil (Requisito 4) */}
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 pl-3">Apariencia</span>
                  <div className="flex gap-1">
                    {[
                      { id: "light", icon: Sun, label: "Claro" },
                      { id: "dark", icon: Moon, label: "Oscuro" },
                      { id: "system", icon: Laptop, label: "Sistema" }
                    ].map((opt) => {
                      const IconComponent = opt.icon;
                      const isSel = isMounted && theme === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setTheme(opt.id)}
                          className={`p-2 rounded-lg transition-all cursor-pointer ${
                            isSel
                              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                              : "text-slate-450 dark:text-slate-550"
                          }`}
                          aria-label={opt.label}
                        >
                          <IconComponent size={14} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="h-px bg-card-border my-2" />
                <a
                  href="/login"
                  className="text-base font-bold text-center py-2.5 rounded-xl border border-card-border text-foreground"
                >
                  Iniciar Sesión
                </a>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setDemoModalOpen(true);
                  }}
                  className="w-full bg-blue-600 text-white text-base font-bold py-3 rounded-xl cursor-pointer"
                >
                  Solicitar demostración
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 2. HERO SECTION */}
      <main className="flex-grow flex flex-col overflow-hidden">
        <section className="w-full max-w-7xl mx-auto px-6 pt-6 sm:pt-8 md:pt-10 lg:pt-12 pb-8 sm:pb-12 md:pb-14 lg:pb-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
          
          {/* Lado Izquierdo: Información */}
          <div className="lg:col-span-5 space-y-6 md:space-y-8 flex flex-col text-left">
            {/* Etiqueta superior */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex"
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-[9px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                <Activity size={10} className="animate-pulse" />
                PLATAFORMA PARA RELACIONES PRESENCIALES
              </span>
            </motion.div>

            {/* Título principal */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-4xl lg:text-[38px] xl:text-[44px] font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]"
            >
              Convierte cada interacción en una relación que continúa<span className="text-blue-600 dark:text-blue-400">.</span>
            </motion.h1>

            {/* Subtítulo */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xl"
            >
              Centraliza la identidad digital de tu equipo corporativo con <strong>Smart NFC Empresas</strong> o fideliza a tus clientes presenciales mediante WhatsApp con <strong>Smart NFC Local</strong>.
            </motion.p>

            {/* Botones de acción de doble CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col gap-4 pt-2"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NextLink
                  href="/empresas"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-6 py-4 rounded-2xl shadow-[0_4px_20px_rgba(37,99,235,0.15)] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 flex flex-col justify-center items-center gap-1 text-center"
                >
                  <span className="text-sm">Smart NFC Empresas</span>
                  <span className="text-[9px] opacity-80 uppercase font-extrabold tracking-wider">Identidad Corporativa B2B →</span>
                </NextLink>

                <NextLink
                  href="/local"
                  className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-black px-6 py-4 rounded-2xl shadow-[0_4px_20px_rgba(217,119,6,0.15)] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 flex flex-col justify-center items-center gap-1 text-center"
                >
                  <span className="text-sm">Smart NFC Local</span>
                  <span className="text-[9px] opacity-80 uppercase font-extrabold tracking-wider">Fidelización B2C →</span>
                </NextLink>
              </div>

              <div className="flex justify-center sm:justify-start gap-4">
                <button
                  onClick={() => setDemoModalOpen(true)}
                  className="text-xs font-bold text-slate-650 dark:text-slate-350 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                >
                  Solicitar demostración corporativa
                </button>
              </div>
            </motion.div>

            {/* Línea de confianza / Micro-beneficios */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-6 border-t border-slate-200/40 dark:border-white/10"
            >
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-350 font-semibold uppercase tracking-wider">
                <QrCode size={11} className="text-blue-600 dark:text-blue-400 shrink-0" />
                Compatible con NFC y QR
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-350 font-semibold uppercase tracking-wider">
                <Smartphone size={11} className="text-blue-600 dark:text-blue-400 shrink-0" />
                Sin instalar aplicaciones
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-350 font-semibold uppercase tracking-wider">
                <Shield size={11} className="text-blue-600 dark:text-blue-400 shrink-0" />
                Información centralizada para la empresa
              </div>
            </motion.div>
          </div>

          {/* Lado Derecho: Imagen Principal (Mockup) */}
          <div className="lg:col-span-7 relative flex justify-center items-center">
            {/* Efectos de luz flotantes (Glows muy suaves) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-gradient-to-tr from-blue-500/5 to-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: 30 }}
              animate={{
                opacity: 1,
                scale: 1,
                x: 0,
                y: [0, -4, 0] // Máximo 4px de flotación
              }}
              transition={{
                opacity: { duration: 0.8 },
                scale: { duration: 0.8 },
                x: { duration: 0.8 },
                y: { duration: 6, repeat: Infinity, ease: "easeInOut" }
              }}
              className="relative w-full max-w-[740px] shadow-[0_20px_50px_rgba(15,23,42,0.04),0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.45),0_1px_2px_rgba(255,255,255,0.01)] rounded-2xl overflow-hidden border border-slate-200/40 dark:border-slate-800/80"
            >
              <DashboardMockup />
            </motion.div>
          </div>
        </section>

        {/* 2.5. PLATAFORMA SECTION */}
        <section id="plataforma" className="w-full max-w-7xl mx-auto px-6 py-10 sm:py-14 border-t border-slate-200/40 dark:border-white/10 text-left scroll-mt-24">
          
          {/* Fila Principal: Explicación y Ecosistema */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Columna Izquierda: Mensaje y Flujo (45%) */}
            <div className="lg:col-span-5 space-y-4 flex flex-col justify-center">
              <div className="inline-flex">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-[9px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  <Smartphone size={10} className="text-blue-600 dark:text-blue-400 shrink-0" />
                  Plataforma
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-850 dark:text-slate-100 tracking-tight leading-tight">
                Una plataforma completa para gestionar la identidad digital de tu organización<span className="text-blue-600 dark:text-blue-400">.</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                SmartNFC reúne perfiles digitales, tarjetas NFC, códigos QR, documentos, formularios, estadísticas y administración en una única plataforma diseñada para empresas.
              </p>

              {/* Flujo horizontal de pasos */}
              <div className="pt-2 space-y-2.5">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Flujo de identidad</span>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Paso 1 */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/30 dark:border-white/5 rounded-xl p-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between hover:border-slate-350 dark:hover:border-slate-850 transition-colors">
                    <span className="text-[8px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none">1. Crea</span>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold mt-1.5 leading-tight">Crea perfiles y configura tu organización.</p>
                  </div>

                  {/* Paso 2 */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/30 dark:border-white/5 rounded-xl p-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between hover:border-slate-350 dark:hover:border-slate-850 transition-colors">
                    <span className="text-[8px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none">2. Comparte</span>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold mt-1.5 leading-tight">Comparte con NFC, QR o enlace personalizado.</p>
                  </div>

                  {/* Paso 3 */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/30 dark:border-white/5 rounded-xl p-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between hover:border-slate-350 dark:hover:border-slate-850 transition-colors">
                    <span className="text-[8px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none">3. Conecta</span>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold mt-1.5 leading-tight">Genera conexiones y oportunidades.</p>
                  </div>

                  {/* Paso 4 */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/30 dark:border-white/5 rounded-xl p-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between hover:border-slate-350 dark:hover:border-slate-850 transition-colors">
                    <span className="text-[8px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none">4. Analiza</span>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold mt-1.5 leading-tight">Toma decisiones con datos en tiempo real.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 relative flex items-center justify-center min-h-[350px] bg-slate-50/50 dark:bg-slate-950/40 rounded-3xl border border-slate-200/30 dark:border-white/5 p-4 overflow-hidden shadow-inner select-none">
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Form Link (Top-Left) */}
                <path d="M 200 150 C 150 105, 120 75, 75 70" stroke="#2563eb" strokeWidth="1.2" strokeOpacity="0.10" strokeDasharray="3 3" />
                {/* QR Card Link (Top-Right) */}
                <path d="M 200 150 C 250 125, 280 105, 320 100" stroke="#2563eb" strokeWidth="1.2" strokeOpacity="0.10" strokeDasharray="3 3" />
                {/* Analytics Link (Bottom-Left) */}
                <path d="M 200 150 C 150 195, 120 215, 75 230" stroke="#2563eb" strokeWidth="1.2" strokeOpacity="0.10" strokeDasharray="3 3" />
                {/* Document Link (Bottom-Right) */}
                <path d="M 200 150 C 250 195, 280 215, 320 230" stroke="#2563eb" strokeWidth="1.2" strokeOpacity="0.10" strokeDasharray="3 3" />
                
                {/* Glowing connection dots at anchors */}
                <circle cx="75" cy="70" r="2.5" fill="#2563eb" className="animate-pulse" />
                <circle cx="320" cy="100" r="2.5" fill="#2563eb" className="animate-pulse" />
                <circle cx="75" cy="230" r="2.5" fill="#2563eb" className="animate-pulse" />
                <circle cx="320" cy="230" r="2.5" fill="#2563eb" className="animate-pulse" />
                <circle cx="200" cy="150" r="3.5" fill="#2563eb" />
              </svg>

              {/* Contenedor de Elementos Solapados */}
              <div className="relative w-full h-[320px] max-w-[500px] flex items-center justify-center z-10">
                
                {/* 1. MOCKUP SMARTPHONE (Centro - Primer Plano, iPhone 15/16 Pro style) */}
                <div className="absolute z-30 w-[132px] h-[276px] rounded-[28px] border-[2px] border-slate-900 dark:border-slate-800 bg-slate-900 dark:bg-slate-950 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.3),0_0_0_1px_rgba(0,0,0,0.05)] p-[3px] flex flex-col overflow-hidden transition-transform duration-300 hover:scale-[1.02]">
                  {/* Glass reflection sheen */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none z-30 rounded-[26px]" />
                  
                  {/* Notch / Dynamic Island */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full bg-black z-40" />
                  
                  {/* Ultra-thin inner bezel */}
                  <div className="relative flex-grow bg-white dark:bg-slate-950 rounded-[23px] overflow-hidden flex flex-col justify-between p-2.5">
                    
                    {/* Top status bar spacer */}
                    <div className="h-2 w-full flex justify-between items-center text-[5px] text-slate-400 font-semibold px-2 mt-1">
                      <span>9:41</span>
                      <div className="flex gap-0.5 items-center">
                        <span>📶</span>
                        <span>🔋</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {/* Avatar */}
                      <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-extrabold text-[10px] mx-auto border-2 border-white dark:border-slate-900 shadow-sm mt-1.5">
                        CM
                      </div>
                      
                      {/* Información de Perfil */}
                      <div className="space-y-0.5 text-center">
                        <h4 className="text-[9px] font-black text-slate-850 dark:text-slate-100 leading-none">Carlos Muñoz</h4>
                        <p className="text-[6px] text-slate-400 dark:text-slate-500 font-semibold leading-none">Gerente Comercial</p>
                        <p className="text-[5px] text-slate-405 dark:text-slate-605 font-bold uppercase leading-none">SIDEP Chile</p>
                      </div>

                      {/* Botones de Acción Rápidos */}
                      <div className="flex gap-1 justify-center py-0.5">
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[4px] font-bold shadow-sm">Contacto</span>
                        <span className="px-1.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 text-slate-550 dark:text-slate-400 text-[4px] font-bold">Guardar</span>
                        <span className="px-1.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 text-slate-550 dark:text-slate-400 text-[4px] font-bold">Compartir</span>
                      </div>
                    </div>

                    {/* Datos de Contacto Directo */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 rounded-[14px] p-2 space-y-1.5 border border-slate-150/40 dark:border-white/5 text-left text-[5px] text-slate-550 dark:text-slate-400 font-medium mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-blue-600 dark:text-blue-400 shrink-0">📞</span>
                        <span className="truncate font-semibold text-slate-700 dark:text-slate-300">+56 9 1234 5678</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-blue-600 dark:text-blue-400 shrink-0">✉️</span>
                        <span className="truncate font-semibold text-slate-700 dark:text-slate-300">carlos@sidep.cl</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-blue-600 dark:text-blue-400 shrink-0">🌐</span>
                        <span className="truncate font-semibold text-slate-700 dark:text-slate-300">www.sidep.cl</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. MOCKUP TARJETA QR & NFC (Derecha-Arriba - Segundo Plano, Premium Card) */}
                <div className="absolute z-10 right-4 top-6 w-[124px] h-[176px] rounded-xl border border-slate-200/50 dark:border-white/10 bg-white dark:bg-slate-900 shadow-[0_12px_30px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] p-2.5 flex flex-col justify-between transition-transform duration-300 hover:scale-[1.02] hover:-translate-y-0.5">
                  {/* Tarjeta Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-1.5">
                    <div className="flex items-center gap-1">
                      <div className="h-4 w-4 rounded-[4px] bg-blue-600 flex items-center justify-center text-white font-black text-[6px] shadow-sm shrink-0">S</div>
                      <div className="space-y-0.5">
                        <h5 className="text-[6px] font-black text-slate-850 dark:text-slate-100 leading-none">SIDEP Chile</h5>
                      </div>
                    </div>
                    
                    {/* Sutil NFC Icon */}
                    <svg className="w-3 h-3 text-blue-600 dark:text-blue-400 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" d="M8.5 14.5A2.5 2.5 0 0 0 11 12a2.5 2.5 0 0 0-2.5-2.5" />
                      <path strokeLinecap="round" d="M11.14 17.14a6.25 6.25 0 0 0 0-10.28" />
                    </svg>
                  </div>

                  {/* QR Vectorial Limpio y Realista (Con Quiet Zone Amplia) */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-150/40 shadow-sm flex items-center justify-center mx-auto my-1">
                    <svg viewBox="0 0 25 25" className="h-[34px] w-[34px] text-slate-900" fill="currentColor">
                      {/* Finder pattern Top-Left */}
                      <path d="M0,0 h7 v7 h-7 z M1,1 h5 v5 h-5 z M2,2 h3 v3 h-3 z" fillRule="evenodd" />
                      {/* Finder pattern Top-Right */}
                      <path d="M18,0 h7 v7 h-7 z M19,1 h5 v5 h-5 z M20,2 h3 v3 h-3 z" fillRule="evenodd" />
                      {/* Finder pattern Bottom-Left */}
                      <path d="M0,18 h7 v7 h-7 z M1,19 h5 v5 h-5 z M2,20 h3 v3 h-3 z" fillRule="evenodd" />
                      
                      {/* Timing & format indicators */}
                      <rect x="8" y="0" width="1" height="2" />
                      <rect x="10" y="0" width="2" height="1" />
                      <rect x="13" y="0" width="1" height="3" />
                      <rect x="15" y="1" width="2" height="1" />
                      
                      <rect x="8" y="3" width="3" height="1" />
                      <rect x="12" y="3" width="1" height="2" />
                      <rect x="14" y="4" width="2" height="1" />
                      
                      <rect x="9" y="5" width="1" height="1" />
                      <rect x="11" y="5" width="3" height="1" />
                      <rect x="15" y="5" width="1" height="2" />

                      {/* Left Middle Blocks */}
                      <rect x="0" y="8" width="2" height="1" />
                      <rect x="3" y="8" width="1" height="2" />
                      <rect x="5" y="9" width="1" height="1" />
                      <rect x="0" y="11" width="1" height="1" />
                      <rect x="2" y="11" width="3" height="1" />
                      <rect x="1" y="13" width="2" height="1" />
                      <rect x="4" y="13" width="1" height="3" />
                      <rect x="0" y="15" width="2" height="1" />
                      <rect x="3" y="16" width="1" height="1" />

                      {/* Center Data blocks */}
                      <rect x="7" y="8" width="2" height="1" />
                      <rect x="10" y="8" width="1" height="2" />
                      <rect x="12" y="8" width="3" height="1" />
                      <rect x="16" y="8" width="1" height="1" />
                      <rect x="8" y="9" width="1" height="1" />
                      <rect x="11" y="9" width="2" height="1" />
                      <rect x="14" y="9" width="1" height="3" />
                      <rect x="7" y="11" width="1" height="3" />
                      <rect x="9" y="11" width="2" height="1" />
                      <rect x="12" y="11" width="1" height="1" />
                      <rect x="10" y="13" width="3" height="1" />
                      <rect x="14" y="13" width="2" height="2" />
                      <rect x="8" y="15" width="2" height="1" />
                      <rect x="11" y="15" width="1" height="3" />
                      <rect x="13" y="16" width="3" height="1" />
                      <rect x="7" y="17" width="1" height="1" />
                      <rect x="9" y="17" width="1" height="2" />

                      {/* Timing Sync Lines */}
                      <rect x="8" y="6" width="1" height="1" />
                      <rect x="10" y="6" width="1" height="1" />
                      <rect x="12" y="6" width="1" height="1" />
                      <rect x="14" y="6" width="1" height="1" />
                      <rect x="16" y="6" width="1" height="1" />
                      <rect x="6" y="8" width="1" height="1" />
                      <rect x="6" y="10" width="1" height="1" />
                      <rect x="6" y="12" width="1" height="1" />
                      <rect x="6" y="14" width="1" height="1" />
                      <rect x="6" y="16" width="1" height="1" />

                      {/* Alignment pattern at 18,18 */}
                      <path d="M16,16 h5 v5 h-5 z M17,17 h3 v3 h-3 z M18,18 h1 v1 h-1 z" fillRule="evenodd" />

                      {/* Right-Middle Data Blocks */}
                      <rect x="18" y="8" width="2" height="1" />
                      <rect x="21" y="8" width="3" height="1" />
                      <rect x="19" y="10" width="1" height="2" />
                      <rect x="22" y="10" width="2" height="1" />
                      <rect x="18" y="12" width="3" height="1" />
                      <rect x="23" y="12" width="1" height="3" />
                      <rect x="20" y="14" width="2" height="1" />

                      {/* Bottom-Middle Data Blocks */}
                      <rect x="8" y="18" width="2" height="1" />
                      <rect x="11" y="18" width="3" height="1" />
                      <rect x="8" y="20" width="1" height="2" />
                      <rect x="10" y="21" width="2" height="1" />
                      <rect x="13" y="20" width="1" height="3" />
                      <rect x="8" y="23" width="3" height="1" />
                      <rect x="12" y="23" width="2" height="1" />

                      {/* Right-Bottom Corner Data Blocks */}
                      <rect x="22" y="21" width="2" height="1" />
                      <rect x="21" y="22" width="1" height="2" />
                      <rect x="23" y="23" width="2" height="1" />
                    </svg>
                  </div>

                  {/* Tarjeta Bottom Info */}
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-1.5">
                    {/* Indicador "Activa" */}
                    <div className="flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[5.5px] font-extrabold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Activa</span>
                    </div>
                    <span className="text-[5px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">SmartNFC</span>
                  </div>
                </div>

                {/* 3. MINI TARJETA FORMULARIO COMPLETADO (Izquierda-Arriba - z-20) */}
                <div className="absolute z-20 left-2 top-8 w-28 bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/10 rounded-xl p-2 shadow-lg flex items-center gap-2 text-[8px] transition-transform duration-300 hover:scale-[1.03]">
                  <div className="h-5 w-5 rounded bg-blue-50 dark:bg-slate-850 flex items-center justify-center text-blue-650 dark:text-blue-400 shrink-0">
                    <ClipboardList size={10} />
                  </div>
                  <div className="truncate">
                    <div className="font-extrabold text-slate-750 dark:text-slate-200 leading-none">Formulario</div>
                    <span className="text-[6px] text-emerald-600 dark:text-emerald-400 font-semibold leading-none">Enviado ✓</span>
                  </div>
                </div>

                {/* 4. MINI TARJETA DOCUMENTO COMPARTIDO (Derecha-Abajo - z-25) */}
                <div className="absolute z-25 right-2 bottom-8 w-32 bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/10 rounded-xl p-2 shadow-lg flex items-center gap-2 text-[8px] transition-transform duration-300 hover:scale-[1.03]">
                  <div className="h-5 w-5 rounded bg-blue-50 dark:bg-slate-850 flex items-center justify-center text-blue-650 dark:text-blue-450 shrink-0">
                    <FileText size={10} />
                  </div>
                  <div className="truncate">
                    <div className="font-extrabold text-slate-750 dark:text-slate-200 leading-none truncate">Catálogo Ventas.pdf</div>
                    <span className="text-[6px] text-slate-400 dark:text-slate-500 font-medium leading-none">Compartido</span>
                  </div>
                </div>

                {/* 5. INDICADOR DE ANALÍTICAS (Izquierda-Abajo - z-20) */}
                <div className="absolute z-20 left-4 bottom-12 w-28 bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/10 rounded-xl p-2 shadow-lg flex items-center gap-2 text-[8px] transition-transform duration-300 hover:scale-[1.03]">
                  <div className="h-5 w-5 rounded bg-blue-50 dark:bg-slate-850 flex items-center justify-center text-blue-650 dark:text-blue-405 shrink-0">
                    <TrendingUp size={10} />
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-750 dark:text-slate-200 leading-none">Conversión</div>
                    <span className="text-[6px] text-blue-600 dark:text-blue-400 font-bold leading-none">+22% contactos</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Fila Inferior: Cinco Tarjetas de Características */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-16">
            
            {/* Tarjeta 1: Perfiles inteligentes */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/10 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:border-slate-300 dark:hover:border-slate-800 transition-all duration-300 flex flex-col justify-between text-left">
              <div className="space-y-4">
                <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-slate-950 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-500/5 dark:border-white/5 shrink-0 shadow-sm">
                  <User size={14} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">
                    Perfiles inteligentes
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    Información siempre actualizada para cada colaborador.
                  </p>
                </div>
              </div>
            </div>

            {/* Tarjeta 2: Tarjetas NFC */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/10 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:border-slate-300 dark:hover:border-slate-800 transition-all duration-300 flex flex-col justify-between text-left">
              <div className="space-y-4">
                <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-slate-950 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-500/5 dark:border-white/5 shrink-0 shadow-sm">
                  <CreditCard size={14} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">
                    Tarjetas NFC
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    Comparte tu identidad profesional con un solo toque.
                  </p>
                </div>
              </div>
            </div>

            {/* Tarjeta 3: Códigos QR */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/10 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:border-slate-300 dark:hover:border-slate-800 transition-all duration-300 flex flex-col justify-between text-left">
              <div className="space-y-4">
                <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-slate-950 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-500/5 dark:border-white/5 shrink-0 shadow-sm">
                  <QrCode size={14} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">
                    Códigos QR
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    Acceso inmediato desde cualquier dispositivo.
                  </p>
                </div>
              </div>
            </div>

            {/* Tarjeta 4: Analíticas */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/10 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:border-slate-300 dark:hover:border-slate-800 transition-all duration-300 flex flex-col justify-between text-left">
              <div className="space-y-4">
                <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-slate-950 flex items-center justify-center text-blue-650 dark:text-blue-400 border border-blue-500/5 dark:border-white/5 shrink-0 shadow-sm">
                  <BarChart3 size={14} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">
                    Analíticas
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    Métricas en tiempo real para toda la organización.
                  </p>
                </div>
              </div>
            </div>

            {/* Tarjeta 5: Seguridad empresarial */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/10 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:border-slate-300 dark:hover:border-slate-800 transition-all duration-300 flex flex-col justify-between text-left">
              <div className="space-y-4">
                <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-slate-950 flex items-center justify-center text-blue-650 dark:text-blue-400 border border-blue-500/5 dark:border-white/5 shrink-0 shadow-sm">
                  <Shield size={14} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">
                    Seguridad empresarial
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    Permisos, auditoría y cifrado de extremo a extremo.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </section>

        {/* 2.5.5. EL MÉTODO SMART NFC SECTION */}
        <section id="metodo" className="w-full max-w-7xl mx-auto px-6 py-12 sm:py-16 border-t border-slate-200/40 dark:border-white/10 text-left scroll-mt-24">
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="inline-flex">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-[9px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  <Activity size={10} className="shrink-0" />
                  El método Smart NFC
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-850 dark:text-slate-100 tracking-tight leading-tight">
                El flujo que transforma tus encuentros comerciales<span className="text-blue-600 dark:text-blue-400">.</span>
              </h2>
            </div>

            {/* Cadena Horizontal de 4 Etapas */}
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 select-none">
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-xs font-black">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                  <span className="text-blue-600">1</span> Compartes
                </div>
                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">➔</span>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                  <span className="text-blue-600">2</span> Capturas
                </div>
                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">➔</span>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                  <span className="text-blue-600">3</span> Agregas contexto
                </div>
                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">➔</span>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                  <span className="text-blue-600">4</span> Das seguimiento
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider">
                La empresa conserva el conocimiento
              </div>
            </div>

            {/* Grid de 4 Bloques */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              {/* Bloque 1 */}
              <div className="bg-white dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/10 rounded-2xl p-5 hover:border-slate-350 dark:hover:border-slate-850 transition-colors space-y-3">
                <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-slate-950 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-500/5">
                  <QrCode size={16} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider">Encuentro</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    Comparte tu identidad profesional mediante NFC o QR.
                  </p>
                </div>
              </div>

              {/* Bloque 2 */}
              <div className="bg-white dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/10 rounded-2xl p-5 hover:border-slate-350 dark:hover:border-slate-850 transition-colors space-y-3">
                <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-slate-950 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-500/5">
                  <User size={16} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider">Captura</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    El contacto entrega sus datos en pocos segundos y queda registrado en la cuenta de la empresa.
                  </p>
                </div>
              </div>

              {/* Bloque 3 */}
              <div className="bg-white dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/10 rounded-2xl p-5 hover:border-slate-350 dark:hover:border-slate-850 transition-colors space-y-3">
                <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-slate-950 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-500/5">
                  <FileText size={16} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider">Contexto</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    Registra dónde se conocieron, qué necesitaba y cuál fue el acuerdo o próximo paso.
                  </p>
                </div>
              </div>

              {/* Bloque 4 */}
              <div className="bg-white dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/10 rounded-2xl p-5 hover:border-slate-350 dark:hover:border-slate-850 transition-colors space-y-3">
                <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-slate-950 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-500/5">
                  <CheckCircle2 size={16} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-850 dark:text-slate-100 uppercase tracking-wider">Seguimiento</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    Organiza las acciones pendientes y conserva el historial de la relación comercial.
                  </p>
                </div>
              </div>
            </div>

            {/* Frase de Impacto y Explicación */}
            <div className="mt-12 text-center py-10 px-6 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/30 dark:border-white/5 rounded-3xl space-y-3 max-w-4xl mx-auto">
              <h3 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-slate-850 dark:text-white leading-tight">
                &quot;El conocimiento comercial permanece en la empresa, incluso cuando cambian las personas.&quot;
              </h3>
              <p className="text-xs sm:text-sm text-slate-450 dark:text-slate-400 font-bold max-w-xl mx-auto leading-relaxed">
                Las relaciones comerciales dejan de depender únicamente de la memoria o el teléfono de una persona.
              </p>
            </div>

          </div>
        </section>

        {/* 2.6. SOLUCIONES SECTION */}
        <section id="soluciones" className="w-full max-w-7xl mx-auto px-6 py-10 sm:py-14 border-t border-slate-200/40 dark:border-white/10 text-left scroll-mt-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            
            {/* Columna Izquierda: Mensaje y Tarjetas (45%) */}
            <div className="lg:col-span-5 space-y-4 flex flex-col justify-center">
              <div className="inline-flex">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-[9px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  <Layers size={10} className="shrink-0" />
                  Soluciones
                </span>
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-black text-slate-850 dark:text-slate-100 tracking-tight leading-tight">
                Soluciones inteligentes para cada área de tu organización<span className="text-blue-600 dark:text-blue-400">.</span>
              </h2>
              
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                SmartNFC se adapta a tu empresa para resolver distintos procesos con una única plataforma. Cada área utiliza las mismas herramientas de forma diferente, compartiendo información en tiempo real.
              </p>

              {/* Grilla 2x3 de Tarjetas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* 1. Ventas y Comercial */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/10 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col gap-2 hover:border-slate-350 dark:hover:border-slate-850 transition-colors group">
                  <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-slate-950 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-500/5 dark:border-white/5 shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                    <TrendingUp size={14} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-extrabold text-slate-850 dark:text-slate-105 tracking-tight leading-tight">Ventas y Comercial</h4>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 font-semibold leading-normal mt-1">Comparte perfiles, catálogos y casos de éxito.</p>
                  </div>
                </div>

                {/* 2. Marketing */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/10 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col gap-2 hover:border-slate-350 dark:hover:border-slate-850 transition-colors group">
                  <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-slate-950 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-500/5 dark:border-white/5 shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                    <Megaphone size={14} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-extrabold text-slate-850 dark:text-slate-105 tracking-tight leading-tight">Marketing</h4>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 font-semibold leading-normal mt-1">Campañas, QR y contenido siempre actualizado.</p>
                  </div>
                </div>

                {/* 3. Recursos Humanos */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/10 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col gap-2 hover:border-slate-350 dark:hover:border-slate-850 transition-colors group">
                  <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-slate-950 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-500/5 dark:border-white/5 shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                    <Users size={14} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-extrabold text-slate-850 dark:text-slate-105 tracking-tight leading-tight">Recursos Humanos</h4>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 font-semibold leading-normal mt-1">Onboarding, organigramas y directorios.</p>
                  </div>
                </div>

                {/* 4. Operaciones */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/10 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col gap-2 hover:border-slate-350 dark:hover:border-slate-850 transition-colors group">
                  <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-slate-950 flex items-center justify-center text-blue-650 dark:text-blue-400 border border-blue-500/5 dark:border-white/5 shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                    <ClipboardList size={14} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-extrabold text-slate-850 dark:text-slate-105 tracking-tight leading-tight">Operaciones</h4>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 font-semibold leading-normal mt-1">Procedimientos, formularios y documentación.</p>
                  </div>
                </div>

                {/* 5. Eventos y Ferias */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/10 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col gap-2 hover:border-slate-350 dark:hover:border-slate-850 transition-colors group">
                  <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-slate-950 flex items-center justify-center text-blue-650 dark:text-blue-400 border border-blue-500/5 dark:border-white/5 shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                    <Calendar size={14} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-extrabold text-slate-850 dark:text-slate-105 tracking-tight leading-tight">Eventos y Ferias</h4>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 font-semibold leading-normal mt-1">Networking con tarjetas NFC.</p>
                  </div>
                </div>

                {/* 6. Atención al Cliente */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/10 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col gap-2 hover:border-slate-350 dark:hover:border-slate-850 transition-colors group">
                  <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-slate-950 flex items-center justify-center text-blue-650 dark:text-blue-400 border border-blue-500/5 dark:border-white/5 shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                    <Headphones size={14} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-extrabold text-slate-850 dark:text-slate-105 tracking-tight leading-tight">Atención al Cliente</h4>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 font-semibold leading-normal mt-1">Información inmediata mediante QR.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Ecosistema y Mockup Simplificado (55%) */}
            <div className="lg:col-span-7 relative flex flex-col justify-between bg-slate-50/50 dark:bg-slate-950/40 rounded-3xl border border-slate-200/30 dark:border-white/5 p-5 shadow-inner select-none font-sans overflow-hidden">
              
              {/* Toast Notification (Micro-animation) */}
              <AnimatePresence>
                {syncStatus.notificationVisible && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-4 right-4 bg-blue-600 text-white text-[7px] font-extrabold py-1 px-2.5 rounded-lg shadow-[0_4px_12px_rgba(37,99,235,0.2)] flex items-center gap-1 z-40"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                    ✓ Base de datos sincronizada
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upper Text */}
              <div className="text-center text-[7px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                <span className="opacity-40">• • •</span>
                <span>Una plataforma, infinitas posibilidades</span>
                <span className="opacity-40">• • •</span>
              </div>

              {/* Mockup Container (Smartphone + Side Menu + Dashboard) */}
              <div className="flex-grow flex items-center justify-center gap-3 relative pb-4">
                
                {/* 1. MOCKUP SMARTPHONE (Solapado izquierda) */}
                <div className="w-[106px] h-[218px] rounded-[22px] border-[2px] border-slate-900 bg-slate-900 shadow-2xl flex flex-col shrink-0 relative transition-transform duration-300 hover:scale-[1.02] z-30">
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-1.5 rounded-full bg-black z-40" />
                  <div className="relative flex-grow bg-white dark:bg-slate-950 rounded-[19px] overflow-hidden flex flex-col justify-between p-2 text-[5.5px]">
                    <div className="space-y-1.5 text-center mt-2">
                      <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-extrabold text-[8px] mx-auto border border-white dark:border-slate-900 shadow-sm">
                        CM
                      </div>
                      <div className="space-y-0.2">
                        <h4 className="text-[7.5px] font-black text-slate-850 dark:text-slate-100 leading-none">Carlos Muñoz</h4>
                        <p className="text-[5px] text-slate-400 dark:text-slate-500 font-semibold leading-none">Gerente Comercial</p>
                        <p className="text-[4px] text-slate-405 dark:text-slate-600 font-bold uppercase leading-none">SIDEP Chile</p>
                      </div>
                      <div className="flex gap-0.5 justify-center">
                        <span className="px-1 py-0.2 rounded-full bg-blue-600 text-white text-[3.5px] font-bold">Contacto</span>
                        <span className="px-1 py-0.2 rounded-full border border-slate-200 dark:border-slate-800 text-slate-500 text-[3.5px] font-bold">Guardar</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/60 rounded-lg p-1 space-y-0.5 border border-slate-150/40 dark:border-white/5 text-left text-[4px] text-slate-500 dark:text-slate-400 font-medium mb-1">
                      <div className="flex items-center gap-1"><span>📞</span><span className="truncate">+56 9 1234 5678</span></div>
                      <div className="flex items-center gap-1"><span>✉️</span><span className="truncate">carlos@sidep.cl</span></div>
                      <div className="flex items-center gap-1"><span>🌐</span><span className="truncate">www.sidep.cl</span></div>
                    </div>
                  </div>
                </div>

                {/* 2. MENU LATERAL (Vertical Panel) */}
                <div className="w-[96px] h-[190px] rounded-xl border border-slate-200/30 dark:border-white/10 bg-white dark:bg-slate-900 shadow-lg p-2.5 flex flex-col justify-between shrink-0 z-20 text-[5.5px]">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1 font-black text-slate-850 dark:text-slate-100">
                      <span className="h-2 w-2 rounded bg-blue-600" />
                      <span>SmartNFC</span>
                    </div>
                    <nav className="space-y-0.5 font-semibold text-slate-550 dark:text-slate-400">
                      <div className="px-1.5 py-0.5 rounded bg-blue-600 text-white flex items-center gap-1"><Folder size={6} /><span>Inicio</span></div>
                      <div className="px-1.5 py-0.5 flex items-center gap-1"><CreditCard size={6} /><span>Tarjetas</span></div>
                      <div className="px-1.5 py-0.5 flex items-center gap-1"><User size={6} /><span>Contactos</span></div>
                      <div className="px-1.5 py-0.5 flex items-center gap-1"><TrendingUp size={6} /><span>Estadísticas</span></div>
                      <div className="px-1.5 py-0.5 flex items-center gap-1"><FileText size={6} /><span>Documentos</span></div>
                      <div className="px-1.5 py-0.5 flex items-center gap-1"><ClipboardList size={6} /><span>Formularios</span></div>
                      <div className="px-1.5 py-0.5 flex items-center gap-1"><Megaphone size={6} /><span>Campañas</span></div>
                    </nav>
                  </div>
                  <div className="border-t border-slate-100 dark:border-white/5 pt-2">
                    <div className="font-extrabold text-slate-800 dark:text-slate-200 leading-none">SIDEP Chile</div>
                    <span className="text-[4px] text-slate-400 mt-0.5 block leading-none">Plan Empresa</span>
                  </div>
                </div>

                {/* 3. DASHBOARD SCREEN (Panel de Control Principal) */}
                <div className="flex-grow max-w-[280px] h-[200px] rounded-xl border border-slate-200/30 dark:border-white/10 bg-white dark:bg-slate-900 shadow-lg p-2.5 flex flex-col justify-between z-10 text-[5.5px]">
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-white/5">
                      <span className="font-black text-slate-850 dark:text-slate-100">Resumen general</span>
                      <span className="border border-slate-200 dark:border-slate-800 rounded px-1 text-slate-400 font-bold">Últimos 7 días</span>
                    </div>

                    {/* KPIs grid */}
                    <div className="grid grid-cols-4 gap-1 py-2 text-[5px]">
                      <div className="bg-slate-50/50 dark:bg-slate-950/20 p-1 rounded border border-slate-100 dark:border-white/5">
                        <span className="text-slate-400 block leading-none truncate">Tarjetas</span>
                        <div className="font-black text-slate-800 dark:text-slate-100 mt-0.5">248 <span className="text-emerald-500 text-[4px] font-bold">+12%</span></div>
                      </div>
                      <div className="bg-slate-50/50 dark:bg-slate-950/20 p-1 rounded border border-slate-100 dark:border-white/5">
                        <span className="text-slate-400 block leading-none truncate">Contactos</span>
                        <div className="font-black text-slate-800 dark:text-slate-100 mt-0.5">327 <span className="text-emerald-500 text-[4px] font-bold">+10%</span></div>
                      </div>
                      <div className="bg-slate-50/50 dark:bg-slate-950/20 p-1 rounded border border-slate-100 dark:border-white/5">
                        <span className="text-slate-400 block leading-none truncate">Escaneos</span>
                        <div className="font-black text-slate-800 dark:text-slate-100 mt-0.5">843 <span className="text-emerald-500 text-[4px] font-bold">+8%</span></div>
                      </div>
                      <div className="bg-slate-50/50 dark:bg-slate-950/20 p-1 rounded border border-slate-100 dark:border-white/5">
                        <span className="text-slate-400 block leading-none truncate">Visitas</span>
                        <div className="font-black text-slate-800 dark:text-slate-100 mt-0.5">1.248 <span className="text-emerald-500 text-[4px] font-bold">+10%</span></div>
                      </div>
                    </div>

                    {/* Simple Curve Chart */}
                    <div className="relative h-12 w-full border border-slate-100 dark:border-white/5 rounded p-1 flex items-center justify-center overflow-hidden">
                      <svg className="absolute inset-0 w-full h-full text-blue-500 dark:text-blue-400" viewBox="0 0 100 40" preserveAspectRatio="none" fill="none">
                        <path d="M 0,35 Q 25,20 50,30 T 100,10" stroke="currentColor" strokeWidth="1" />
                      </svg>
                      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 bg-slate-950 dark:bg-slate-900 border border-slate-800 text-white px-1 rounded text-[4px] font-black tracking-wide leading-none shadow-sm z-20">
                        843 Escaneos
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity Mini Feed */}
                  <div className="border-t border-slate-100 dark:border-white/5 pt-2 text-[4.8px] leading-tight space-y-1">
                    <span className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide block">Actividad reciente</span>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                      <span className="truncate">● Nicolás Fuentes escaneó perfil</span>
                      <span className="text-slate-400 shrink-0 font-bold">Hace 1m</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                      <span className="truncate">● Daniela Rojas actualizó su perfil</span>
                      <span className="text-slate-400 shrink-0 font-bold">Hace 3m</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Integraciones Bar (Mockup Pie) */}
              <div className="border-t border-slate-200/30 dark:border-white/5 pt-4">
                <span className="text-[7px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2.5 text-left">Integraciones</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  
                  {/* Google Workspace */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/10 rounded-lg p-1.5 flex items-center justify-between text-[7px] shadow-sm">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-blue-500 font-black shrink-0">🔵</span>
                      <span className="font-extrabold text-slate-750 dark:text-slate-200 leading-none truncate">Google Workspace</span>
                    </div>
                    <span className="text-[5.5px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1 py-0.2 rounded shrink-0">{syncStatus.google}</span>
                  </div>

                  {/* Microsoft 365 */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/10 rounded-lg p-1.5 flex items-center justify-between text-[7px] shadow-sm">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-red-500 font-black shrink-0">🔴</span>
                      <span className="font-extrabold text-slate-750 dark:text-slate-200 leading-none truncate">Microsoft 365</span>
                    </div>
                    <span className="text-[5.5px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1 py-0.2 rounded shrink-0">{syncStatus.microsoft}</span>
                  </div>

                  {/* HubSpot */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/10 rounded-lg p-1.5 flex items-center justify-between text-[7px] shadow-sm">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-orange-500 font-black shrink-0">🟠</span>
                      <span className="font-extrabold text-slate-750 dark:text-slate-200 leading-none truncate">HubSpot</span>
                    </div>
                    <span className="text-[5.5px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1 py-0.2 rounded shrink-0">{syncStatus.hubspot}</span>
                  </div>

                  {/* Zapier */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/10 rounded-lg p-1.5 flex items-center justify-between text-[7px] shadow-sm">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-yellow-600 font-black shrink-0">🟡</span>
                      <span className="font-extrabold text-slate-750 dark:text-slate-200 leading-none truncate">Zapier</span>
                    </div>
                    <span className="text-[5.5px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1 py-0.2 rounded shrink-0">Conectado</span>
                  </div>

                  {/* Slack */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/10 rounded-lg p-1.5 flex items-center justify-between text-[7px] shadow-sm">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-purple-500 font-black shrink-0">🟣</span>
                      <span className="font-extrabold text-slate-750 dark:text-slate-200 leading-none truncate">Slack</span>
                    </div>
                    <span className="text-[5.5px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1 py-0.2 rounded shrink-0">Conectado</span>
                  </div>

                </div>
              </div>

            </div>

          </div>
        </section>

        {/* 2.6.5. PLANTILLAS SECTION */}
        <section id="plantillas" className="w-full max-w-7xl mx-auto px-6 py-10 sm:py-14 border-t border-slate-200/40 dark:border-white/10 text-left scroll-mt-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            
            {/* Columna Izquierda: Información de Plantillas (45%) */}
            <div className="lg:col-span-5 space-y-5 flex flex-col justify-center">
              <div className="inline-flex">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-[9px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  <LayoutTemplate size={10} className="shrink-0" />
                  Plantillas
                </span>
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-black text-slate-850 dark:text-slate-100 tracking-tight leading-tight">
                Plantillas profesionales listas para usar<span className="text-blue-600 dark:text-blue-400">.</span>
              </h2>
              
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Elige una plantilla, personalízala con tu identidad corporativa y publícala en minutos. No necesitas diseñar nada. Todo está preparado para comenzar.
              </p>

              {/* Lista Elegante de Beneficios */}
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-350 font-semibold pt-2">
                <li className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] shrink-0 font-black">✓</span>
                  Diseño profesional de clase mundial
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] shrink-0 font-black">✓</span>
                  Colores y fuentes corporativas adaptables
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] shrink-0 font-black">✓</span>
                  Compatible con tecnología NFC y códigos QR
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] shrink-0 font-black">✓</span>
                  Adaptable a cualquier industria o empresa
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] shrink-0 font-black">✓</span>
                  Diseño 100% responsivo y optimizado
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] shrink-0 font-black">✓</span>
                  Actualizaciones automáticas instantáneas
                </li>
              </ul>

              {/* Chips de Categorías */}
              <div className="pt-3 pb-5">
                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Explora nuestras categorías</span>
                <div className="flex flex-wrap gap-1.5">
                  {["Corporativas", "Ejecutivas", "Creativas", "Salud", "Educación", "Inmobiliarias", "Ventas", "Eventos", "Industria"].map((cat) => (
                    <span key={cat} className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 transition-colors cursor-default">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Columna Derecha: Galería Interactiva Cover Flow (55%) */}
            <div className="lg:col-span-7 relative flex flex-col justify-between bg-slate-50/50 dark:bg-slate-950/40 rounded-3xl border border-slate-200/30 dark:border-white/5 p-5 shadow-inner select-none font-sans overflow-hidden min-h-[380px]">
              
              {/* Botón Vista Previa Superior */}
              <button
                onClick={() => setActiveTemplate((prev) => (prev + 1) % 5)}
                className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200/50 dark:border-white/10 rounded-full px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300 shadow-sm flex items-center gap-1.5 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-105 active:scale-95 group z-40 cursor-pointer"
              >
                <Eye size={10} className="text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
                <span>Ver otra plantilla</span>
              </button>

              <div className="flex-grow flex items-center justify-center gap-4 relative mt-10">
                
                {/* 1. MOCKUP SMARTPHONE (Elegante, más pequeño) */}
                <div className="w-[100px] h-[208px] rounded-[22px] border-[2px] border-slate-900 bg-slate-900 shadow-2xl flex flex-col shrink-0 relative transition-transform duration-300 hover:scale-[1.02] z-30">
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-1.5 rounded-full bg-black z-40" />
                  
                  {/* Smartphone Screen Layout */}
                  <div className={`relative flex-grow rounded-[19px] overflow-hidden flex flex-col justify-between p-2.5 text-[5.5px] transition-colors duration-500 ${
                    activeTemplate === 0 ? "bg-white text-slate-800" :
                    activeTemplate === 1 ? "bg-slate-50 text-slate-800" :
                    activeTemplate === 2 ? "bg-indigo-950 text-indigo-100" :
                    activeTemplate === 3 ? "bg-white text-slate-800" :
                    "bg-slate-950 text-slate-100"
                  }`}>
                    {/* activeTemplate === 0 (Ejecutiva/Corporativa) */}
                    {activeTemplate === 0 && (
                      <div className="flex-grow flex flex-col justify-between h-full">
                        <div className="space-y-1.5 text-center mt-2">
                          <div className="h-6 w-full bg-blue-600 rounded-lg absolute top-0 left-0 right-0 z-0" />
                          <div className="relative z-10 h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center font-extrabold text-[8px] mx-auto border border-white shadow-sm overflow-hidden">
                            <span className="text-[10px]">💼</span>
                          </div>
                          <div className="space-y-0.2 relative z-10">
                            <h4 className="text-[7.5px] font-black text-slate-850 leading-none">Carlos Muñoz</h4>
                            <p className="text-[5px] text-slate-500 font-semibold leading-none">Gerente Comercial</p>
                            <p className="text-[4px] text-blue-600 font-bold uppercase leading-none">SIDEP Chile</p>
                          </div>
                          <div className="flex gap-0.5 justify-center relative z-10">
                            <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[3.5px] font-bold">Contacto</span>
                            <span className="px-1.5 py-0.2 rounded-full border border-slate-200 text-slate-500 text-[3.5px] font-bold">Guardar</span>
                          </div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-1.5 space-y-0.5 border border-slate-150 text-left text-[4.2px] text-slate-600 font-medium mb-1 relative z-10">
                          <div className="flex items-center gap-1"><span>📞</span><span className="truncate">+56 9 1234 5678</span></div>
                          <div className="flex items-center gap-1"><span>✉️</span><span className="truncate">carlos@sidep.cl</span></div>
                        </div>
                      </div>
                    )}

                    {/* activeTemplate === 1 (Minimalista) */}
                    {activeTemplate === 1 && (
                      <div className="flex-grow flex flex-col justify-between h-full">
                        <div className="space-y-2 text-center mt-3">
                          <div className="h-10 w-10 rounded-full bg-slate-300 flex items-center justify-center font-extrabold text-[8px] mx-auto border border-slate-100 shadow-sm overflow-hidden">
                            <span className="text-[12px]">👨</span>
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="text-[8px] font-light text-slate-900 tracking-wide leading-none">Carlos Muñoz</h4>
                            <p className="text-[4.5px] text-slate-450 uppercase tracking-widest font-bold leading-none">SIDEP Chile</p>
                          </div>
                          <div className="flex gap-1 justify-center pt-1">
                            <span className="px-2 py-0.5 rounded border border-slate-900 text-slate-900 text-[3.5px] font-bold uppercase tracking-wider">Conectar</span>
                          </div>
                        </div>
                        <div className="space-y-0.5 text-center text-[4.2px] text-slate-550 font-light mb-2">
                          <div>carlos@sidep.cl</div>
                          <div className="opacity-50">—</div>
                          <div>www.sidep.cl</div>
                        </div>
                      </div>
                    )}

                    {/* activeTemplate === 2 (Creativa) */}
                    {activeTemplate === 2 && (
                      <div className="flex-grow flex flex-col justify-between h-full">
                        <div className="space-y-1.5 text-center mt-2">
                          <div className="h-10 w-full bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg absolute top-0 left-0 right-0 z-0" />
                          <div className="relative z-10 h-8 w-8 rounded-full bg-indigo-900 flex items-center justify-center font-extrabold text-[8px] mx-auto border border-pink-500 shadow-lg overflow-hidden">
                            <span className="text-[10px]">🎨</span>
                          </div>
                          <div className="space-y-0.2 relative z-10">
                            <h4 className="text-[7.5px] font-black text-white leading-none">Carlos Muñoz</h4>
                            <p className="text-[5px] text-pink-400 font-bold leading-none">Gerente Comercial</p>
                            <p className="text-[4px] text-indigo-300 font-medium uppercase leading-none">SIDEP Chile</p>
                          </div>
                          <div className="flex gap-0.5 justify-center relative z-10">
                            <span className="px-1.5 py-0.2 rounded-full bg-pink-600 text-white text-[3.5px] font-bold shadow-md shadow-pink-500/20">Contacto</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-white border border-white/10 text-[3.5px] font-bold">Guardar</span>
                          </div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-1.5 space-y-0.5 border border-white/5 text-left text-[4.2px] text-indigo-200 font-medium mb-1 relative z-10">
                          <div className="flex items-center gap-1"><span>✉️</span><span className="truncate">carlos@sidep.cl</span></div>
                          <div className="flex items-center gap-1"><span>📞</span><span className="truncate">+56 9 1234 5678</span></div>
                        </div>
                      </div>
                    )}

                    {/* activeTemplate === 3 (Salud) */}
                    {activeTemplate === 3 && (
                      <div className="flex-grow flex flex-col justify-between h-full">
                        <div className="space-y-1.5 text-center mt-2">
                          <div className="h-6 w-full bg-emerald-600 rounded-lg absolute top-0 left-0 right-0 z-0" />
                          <div className="relative z-10 h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-extrabold text-[8px] mx-auto border border-white shadow-sm overflow-hidden">
                            <span className="text-[10px]">🩺</span>
                          </div>
                          <div className="space-y-0.2 relative z-10">
                            <h4 className="text-[7.5px] font-black text-slate-850 leading-none">Carlos Muñoz</h4>
                            <p className="text-[5px] text-emerald-600 font-bold leading-none">Gerente Comercial</p>
                            <p className="text-[4px] text-slate-450 uppercase leading-none">SIDEP Chile</p>
                          </div>
                          <div className="flex gap-0.5 justify-center relative z-10">
                            <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[3.5px] font-bold">Contacto</span>
                          </div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-1.5 space-y-0.5 border border-slate-150 text-left text-[4.2px] text-slate-600 font-medium mb-1 relative z-10">
                          <div className="flex items-center gap-1"><span>✉️</span><span className="truncate">carlos@sidep.cl</span></div>
                          <div className="flex items-center gap-1"><span>📞</span><span className="truncate">+56 9 1234 5678</span></div>
                        </div>
                      </div>
                    )}

                    {/* activeTemplate === 4 (Premium Black) */}
                    {activeTemplate === 4 && (
                      <div className="flex-grow flex flex-col justify-between h-full">
                        <div className="space-y-2 text-center mt-3">
                          <div className="h-9 w-9 rounded-full bg-slate-900 border border-amber-500/30 flex items-center justify-center font-black text-[9px] text-amber-400 mx-auto shadow-lg shadow-amber-500/5">
                            CM
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="text-[8px] font-black text-white tracking-wide leading-none uppercase">Carlos Muñoz</h4>
                            <p className="text-[4.5px] text-amber-500/80 tracking-widest font-extrabold uppercase leading-none">Gerente Comercial</p>
                          </div>
                          <div className="flex gap-1 justify-center pt-1">
                            <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[3.5px] font-black uppercase tracking-wider">Contacto</span>
                          </div>
                        </div>
                        <div className="space-y-0.5 text-center text-[4.2px] text-slate-400 font-medium mb-2">
                          <div>carlos@sidep.cl</div>
                          <div className="text-amber-500/40">•</div>
                          <div>SIDEP Chile</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. CAROUSEL COVER FLOW DE PLANTILLAS */}
                <div className="relative w-[150px] sm:w-[220px] h-[190px] flex items-center justify-center z-20">
                  {/* Card 0: Ejecutiva */}
                  <div
                    onClick={() => setActiveTemplate(0)}
                    style={getTemplateStyle(0)}
                    className="absolute w-[86px] h-[156px] bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/10 rounded-xl p-2 shadow-2xl flex flex-col justify-between text-[4.5px] text-slate-800 dark:text-slate-200 transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] select-none hover:scale-[1.02]"
                  >
                    <div className="space-y-1 text-center">
                      <div className="h-5 w-full bg-blue-600 rounded" />
                      <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-800 mx-auto" />
                      <h5 className="font-extrabold text-[6px] text-slate-850 dark:text-white leading-none">Ejecutiva</h5>
                      <span className="text-[3.5px] text-slate-400 leading-none block">Profesional y moderna</span>
                    </div>
                    <div className="h-px bg-slate-100 dark:bg-white/5 my-1" />
                    <div className="space-y-0.5 text-left text-[3.5px] text-slate-550">
                      <div>📞 +56 9 1234 5678</div>
                      <div>✉️ carlos@sidep.cl</div>
                    </div>
                  </div>

                  {/* Card 1: Minimalista */}
                  <div
                    onClick={() => setActiveTemplate(1)}
                    style={getTemplateStyle(1)}
                    className="absolute w-[86px] h-[156px] bg-slate-50 dark:bg-slate-905 border border-slate-200/50 dark:border-white/10 rounded-xl p-2 shadow-2xl flex flex-col justify-between text-[4.5px] text-slate-800 dark:text-slate-200 transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] select-none hover:scale-[1.02]"
                  >
                    <div className="space-y-2 text-center pt-2">
                      <div className="h-7 w-7 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto" />
                      <h5 className="font-light text-[6px] text-slate-900 dark:text-white leading-none uppercase tracking-wide">Minimalista</h5>
                      <span className="text-[3.5px] text-slate-400 leading-none block">Simple y elegante</span>
                    </div>
                    <div className="space-y-0.5 text-center text-[3.5px] text-slate-550 font-light mb-1">
                      <div>carlos@sidep.cl</div>
                      <div>www.sidep.cl</div>
                    </div>
                  </div>

                  {/* Card 2: Creativa */}
                  <div
                    onClick={() => setActiveTemplate(2)}
                    style={getTemplateStyle(2)}
                    className="absolute w-[86px] h-[156px] bg-indigo-950 border border-indigo-500/20 rounded-xl p-2 shadow-2xl flex flex-col justify-between text-[4.5px] text-indigo-200 transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] select-none hover:scale-[1.02]"
                  >
                    <div className="space-y-1 text-center">
                      <div className="h-5 w-full bg-gradient-to-r from-violet-600 to-indigo-600 rounded animate-none" />
                      <div className="h-6 w-6 rounded-full bg-indigo-900 mx-auto border border-pink-500" />
                      <h5 className="font-black text-[6px] text-white leading-none">Creativa</h5>
                      <span className="text-[3.5px] text-pink-400 leading-none block">Diferente e innovadora</span>
                    </div>
                    <div className="h-px bg-white/5 my-1" />
                    <div className="space-y-0.5 text-left text-[3.5px] text-indigo-300">
                      <div>✉️ carlos@sidep.cl</div>
                      <div>📞 +56 9 1234 5678</div>
                    </div>
                  </div>

                  {/* Card 3: Salud */}
                  <div
                    onClick={() => setActiveTemplate(3)}
                    style={getTemplateStyle(3)}
                    className="absolute w-[86px] h-[156px] bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-white/10 rounded-xl p-2 shadow-2xl flex flex-col justify-between text-[4.5px] text-slate-800 dark:text-slate-200 transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] select-none hover:scale-[1.02]"
                  >
                    <div className="space-y-1 text-center">
                      <div className="h-5 w-full bg-emerald-600 rounded" />
                      <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto" />
                      <h5 className="font-extrabold text-[6px] text-slate-850 dark:text-white leading-none">Salud</h5>
                      <span className="text-[3.5px] text-emerald-600 leading-none block font-bold">Profesional de la salud</span>
                    </div>
                    <div className="h-px bg-slate-100 dark:bg-white/5 my-1" />
                    <div className="space-y-0.5 text-left text-[3.5px] text-slate-550">
                      <div>✉️ carlos@sidep.cl</div>
                      <div>📞 +56 9 1234 5678</div>
                    </div>
                  </div>

                  {/* Card 4: Premium Black */}
                  <div
                    onClick={() => setActiveTemplate(4)}
                    style={getTemplateStyle(4)}
                    className="absolute w-[86px] h-[156px] bg-slate-950 border border-amber-500/20 rounded-xl p-2 shadow-2xl flex flex-col justify-between text-[4.5px] text-slate-100 transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] select-none hover:scale-[1.02]"
                  >
                    <div className="space-y-2 text-center pt-2">
                      <div className="h-6 w-6 rounded-full bg-slate-900 border border-amber-500/30 flex items-center justify-center font-black text-[7px] text-amber-400 mx-auto">CM</div>
                      <h5 className="font-black text-[6px] text-white leading-none uppercase tracking-wider">Premium Black</h5>
                      <span className="text-[3.5px] text-amber-500/80 leading-none block font-extrabold">Lujo y exclusividad</span>
                    </div>
                    <div className="space-y-0.5 text-center text-[3.5px] text-slate-400 mb-1">
                      <div>carlos@sidep.cl</div>
                      <div className="text-amber-500/40 text-[5px]">•</div>
                      <div className="truncate">SIDEP Chile</div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Indicador de 5 Puntos Estilo Apple */}
              <div className="flex gap-1.5 justify-center mt-6">
                {[0, 1, 2, 3, 4].map((i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTemplate(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      activeTemplate === i ? "w-4 bg-blue-600" : "w-1.5 bg-slate-300 dark:bg-slate-700"
                    }`}
                  />
                ))}
              </div>

            </div>

          </div>

          {/* Fila Inferior: Cuatro Beneficios Premium */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-16">
            
            {/* Tarjeta 1: Identidad profesional NFC y QR */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/10 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:border-slate-350 dark:hover:border-slate-850 transition-colors flex flex-col justify-between text-left">
              <div className="space-y-4">
                <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-slate-950 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-500/5 dark:border-white/5 shrink-0 shadow-sm">
                  <CreditCard size={16} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-850 dark:text-slate-100 tracking-tight leading-snug">
                    Identidad profesional NFC y QR
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    Comparte información profesional desde una tarjeta NFC o un código QR, sin instalar aplicaciones.
                  </p>
                </div>
              </div>
            </div>

            {/* Tarjeta 2: Captura de contactos */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/10 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:border-slate-350 dark:hover:border-slate-850 transition-colors flex flex-col justify-between text-left">
              <div className="space-y-4">
                <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-slate-950 flex items-center justify-center text-blue-650 dark:text-blue-400 border border-blue-500/5 dark:border-white/5 shrink-0 shadow-sm">
                  <QrCode size={16} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-850 dark:text-slate-100 tracking-tight leading-snug">
                    Captura de contactos
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    Permite que cada encuentro genere un contacto organizado dentro de la cuenta de la empresa.
                  </p>
                </div>
              </div>
            </div>

            {/* Tarjeta 3: Contexto comercial */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/10 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:border-slate-350 dark:hover:border-slate-850 transition-colors flex flex-col justify-between text-left">
              <div className="space-y-4">
                <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-slate-950 flex items-center justify-center text-blue-650 dark:text-blue-400 border border-blue-500/5 dark:border-white/5 shrink-0 shadow-sm">
                  <Palette size={16} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-850 dark:text-slate-100 tracking-tight leading-snug">
                    Contexto comercial
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    Registra dónde ocurrió el encuentro, qué necesitaba el contacto y cuál debe ser el próximo paso.
                  </p>
                </div>
              </div>
            </div>

            {/* Tarjeta 4: Seguimiento y estadísticas */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200/40 dark:border-white/10 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:border-slate-350 dark:hover:border-slate-850 transition-colors flex flex-col justify-between text-left">
              <div className="space-y-4">
                <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-slate-950 flex items-center justify-center text-blue-650 dark:text-blue-400 border border-blue-500/5 dark:border-white/5 shrink-0 shadow-sm">
                  <BarChart3 size={16} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-850 dark:text-slate-100 tracking-tight leading-snug">
                    Seguimiento y estadísticas
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    Conoce qué oportunidades se generaron, cuáles recibieron seguimiento y qué acciones siguen pendientes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2.6.8. PLANES SECTION */}
        <section id="planes" className="w-full max-w-7xl mx-auto px-6 py-10 sm:py-14 border-t border-slate-200/40 dark:border-white/10 text-left scroll-mt-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            
            {/* Columna Izquierda: Mensaje, Diagrama e Ilustración de Conexión (45%) */}
            <div className="lg:col-span-5 space-y-6 flex flex-col justify-center">
              <div className="inline-flex">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-[9px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  <Layers size={10} className="shrink-0" />
                  Plataforma y Escalabilidad
                </span>
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-black text-slate-850 dark:text-slate-100 tracking-tight leading-tight">
                Una plataforma que crece junto a tu organización<span className="text-blue-600 dark:text-blue-400">.</span>
              </h2>
              
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                SmartNFC incluye todo lo necesario para administrar la identidad digital de tu empresa. Comienza con una licencia base y agrega Identidades Activas únicamente cuando las necesites.
              </p>

              {/* Ilustración de Conexión (Apple / Stripe Style) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/10 rounded-3xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col items-center gap-4 relative min-h-[220px]">
                
                {/* Nodo Superior: Empresa */}
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 rounded-xl px-4 py-2 shadow-sm text-center flex items-center gap-2 z-10 transition-transform duration-300 hover:scale-[1.02]">
                  <span className="text-[10px]">🏢</span>
                  <div>
                    <div className="font-extrabold text-[8px] text-slate-800 dark:text-slate-200 leading-none">Mi Empresa</div>
                    <span className="text-[5px] text-slate-400 font-semibold uppercase tracking-wider block mt-0.5">Organización</span>
                  </div>
                </div>

                {/* SVG Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" fill="none" stroke="#2563eb" strokeWidth="1.2" strokeOpacity="0.15" strokeDasharray="3 3">
                  {/* Central Node down to Platform */}
                  <path d="M 190 38 L 190 74" />
                  
                  {/* Platform down to identities */}
                  <path d="M 190 102 L 190 120" />
                  <path d="M 190 120 L 50 120 L 50 148" />
                  <path d="M 190 120 L 140 120 L 140 148" />
                  <path d="M 190 120 L 230 120 L 230 148" />
                  <path d="M 190 120 L 320 120 L 320 148" />
                </svg>

                {/* Nodo Central: Plataforma SmartNFC */}
                <div className="bg-blue-600 dark:bg-blue-600/90 text-white rounded-xl px-5 py-2 shadow-lg text-center flex items-center gap-2 z-10 transition-transform duration-300 hover:scale-[1.02] border border-blue-500/20">
                  <span className="text-[10px] animate-pulse">⚡</span>
                  <div>
                    <div className="font-black text-[9px] leading-none">Plataforma SmartNFC</div>
                    <span className="text-[5.5px] text-blue-100 font-bold uppercase tracking-wider block mt-0.5">Plataforma activa</span>
                  </div>
                </div>

                {/* Grid de Identidades Activas por Área */}
                <div className="grid grid-cols-4 gap-2 w-full pt-4 z-10">
                  {/* Carlos (Ventas) */}
                  <div className="bg-slate-50/80 dark:bg-slate-950/65 border border-slate-200/50 dark:border-white/5 rounded-lg p-1.5 text-center flex flex-col items-center gap-0.5 transition-transform duration-300 hover:scale-[1.03]">
                    <div className="h-5 w-5 rounded-full bg-blue-105 dark:bg-blue-950 flex items-center justify-center font-extrabold text-[8px]">👨</div>
                    <span className="font-black text-[7px] text-slate-800 dark:text-slate-200 leading-none">Carlos Muñoz</span>
                    <span className="text-[5px] text-slate-400 font-semibold bg-slate-100 dark:bg-white/5 px-1 py-0.2 rounded mt-0.5">Ventas</span>
                  </div>

                  {/* María (RRHH) */}
                  <div className="bg-slate-50/80 dark:bg-slate-950/65 border border-slate-200/50 dark:border-white/5 rounded-lg p-1.5 text-center flex flex-col items-center gap-0.5 transition-transform duration-300 hover:scale-[1.03]">
                    <div className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center font-extrabold text-[8px]">👩</div>
                    <span className="font-black text-[7px] text-slate-800 dark:text-slate-200 leading-none">María Rojas</span>
                    <span className="text-[5px] text-slate-400 font-semibold bg-slate-100 dark:bg-white/5 px-1 py-0.2 rounded mt-0.5">RRHH</span>
                  </div>

                  {/* Pedro (Operaciones) */}
                  <div className="bg-slate-50/80 dark:bg-slate-950/65 border border-slate-200/50 dark:border-white/5 rounded-lg p-1.5 text-center flex flex-col items-center gap-0.5 transition-transform duration-300 hover:scale-[1.03]">
                    <div className="h-5 w-5 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center font-extrabold text-[8px]">👨‍💼</div>
                    <span className="font-black text-[7px] text-slate-800 dark:text-slate-200 leading-none">Pedro Soto</span>
                    <span className="text-[5px] text-slate-400 font-semibold bg-slate-100 dark:bg-white/5 px-1 py-0.2 rounded mt-0.5">Operaciones</span>
                  </div>

                  {/* Andrea (Marketing) */}
                  <div className="bg-slate-50/80 dark:bg-slate-950/65 border border-slate-200/50 dark:border-white/5 rounded-lg p-1.5 text-center flex flex-col items-center gap-0.5 transition-transform duration-300 hover:scale-[1.03]">
                    <div className="h-5 w-5 rounded-full bg-pink-100 dark:bg-pink-950 flex items-center justify-center font-extrabold text-[8px]">👩‍🎨</div>
                    <span className="font-black text-[7px] text-slate-800 dark:text-slate-200 leading-none">Andrea Fuentes</span>
                    <span className="text-[5px] text-slate-400 font-semibold bg-slate-100 dark:bg-white/5 px-1 py-0.2 rounded mt-0.5">Marketing</span>
                  </div>
                </div>
              </div>

              {/* Caja de Escalabilidad */}
              <div className="bg-emerald-500/[0.03] dark:bg-emerald-500/[0.01] border border-emerald-500/25 dark:border-emerald-500/10 rounded-2xl p-4 flex gap-3 text-left">
                <div className="h-6 w-6 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <TrendingUp size={12} />
                </div>
                <div>
                  <div className="text-[10px] font-black text-emerald-800 dark:text-emerald-450 uppercase tracking-wide leading-none">
                    No pagas por cambiar de plan
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed mt-1">
                    Tu organización simplemente incorpora nuevas Identidades Activas a medida que crece.
                  </p>
                </div>
              </div>

            </div>

            {/* Columna Derecha: Tarjetas de Modelo Comercial (55%) */}
            <div className="lg:col-span-7 flex flex-col justify-center gap-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                
                {/* Tarjeta Principal: Plataforma SmartNFC (7 de 12 columnas) */}
                <div className="md:col-span-7 bg-white dark:bg-slate-900 border-[2px] border-blue-500 dark:border-blue-500/80 rounded-3xl p-5 shadow-[0_4px_25px_rgba(37,99,235,0.06)] flex flex-col justify-between relative transform hover:scale-[1.01] transition-all">
                  <div className="absolute -top-3 left-6 bg-blue-600 text-white text-[7.5px] font-black uppercase tracking-widest px-2.5 py-0.8 rounded-full shadow-md leading-none select-none">
                    RECOMENDADO
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-1 text-left pt-1">
                      <h3 className="text-sm font-black text-slate-850 dark:text-white leading-none">Plataforma SmartNFC</h3>
                      <p className="text-[9px] text-slate-400 dark:text-slate-555 font-semibold leading-relaxed">
                        Infraestructura completa SaaS para la gestión de identidad corporativa.
                      </p>
                    </div>

                    <div className="text-left pt-2 border-t border-slate-100 dark:border-white/5">
                      <span className="text-[7px] font-bold text-blue-600 dark:text-blue-400 block uppercase leading-none">Licencia Base</span>
                      <span className="text-[11px] font-black text-slate-850 dark:text-white tracking-tight leading-none font-sans mt-1 block">A definir según organización</span>
                    </div>

                    {/* Features list */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[9.5px] text-slate-600 dark:text-slate-350 font-bold text-left pt-2">
                      <div className="flex items-center gap-1.5"><span className="text-blue-500">✔</span> Dashboard</div>
                      <div className="flex items-center gap-1.5"><span className="text-blue-500">✔</span> Administración</div>
                      <div className="flex items-center gap-1.5"><span className="text-blue-500">✔</span> Relaciones</div>
                      <div className="flex items-center gap-1.5"><span className="text-blue-500">✔</span> Analíticas</div>
                      <div className="flex items-center gap-1.5"><span className="text-blue-500">✔</span> Formularios</div>
                      <div className="flex items-center gap-1.5"><span className="text-blue-500">✔</span> Documentos</div>
                      <div className="flex items-center gap-1.5"><span className="text-blue-500">✔</span> Branding corp.</div>
                      <div className="flex items-center gap-1.5"><span className="text-blue-500">✔</span> Actualizaciones</div>
                      <div className="flex items-center gap-1.5"><span className="text-blue-500">✔</span> Seguridad</div>
                      <div className="flex items-center gap-1.5"><span className="text-blue-500">✔</span> Soporte</div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-white/5 pt-3 mt-4 text-left">
                    <p className="text-[8px] text-slate-450 dark:text-slate-500 font-semibold leading-relaxed italic">
                      * Incluye un número inicial de Identidades Activas.
                    </p>
                  </div>
                </div>

                {/* Tarjeta Secundaria: Identidades Activas (5 de 12 columnas) */}
                <div className="md:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/10 rounded-3xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col justify-between hover:border-slate-350 dark:hover:border-slate-850 transition-colors">
                  <div className="space-y-4">
                    <div className="space-y-1 text-left">
                      <h3 className="text-sm font-black text-slate-850 dark:text-white leading-none">Identidades Activas</h3>
                      <p className="text-[9px] text-slate-400 dark:text-slate-555 font-semibold leading-relaxed">
                        Agrega credenciales según las necesidades de tu equipo.
                      </p>
                    </div>

                    <div className="text-left pt-2 border-t border-slate-100 dark:border-white/5">
                      <span className="text-[7px] font-bold text-slate-400 dark:text-slate-550 block uppercase leading-none">Crecimiento flexible</span>
                      <p className="text-[9.5px] text-slate-600 dark:text-slate-400 font-extrabold leading-tight mt-1">
                        Agrega identidades cuando tu empresa lo necesite
                      </p>
                    </div>

                    {/* Flowchart illustration */}
                    <div className="bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl p-3 border border-slate-150 dark:border-white/5 flex flex-col items-center gap-1 my-1">
                      {/* Avatar Card */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/10 rounded-lg px-2 py-1 flex items-center gap-1.5 w-full">
                        <span className="text-[8px]">👤</span>
                        <div className="text-left min-w-0">
                          <div className="font-extrabold text-[6.5px] text-slate-800 dark:text-slate-200 leading-none truncate">Carlos Muñoz</div>
                          <span className="text-[4.5px] text-slate-400 font-bold block truncate mt-0.2">Gerente Comercial • SIDEP</span>
                        </div>
                      </div>
                      <span className="text-blue-500 text-[8px] font-black leading-none my-0.2">↓</span>
                      <span className="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 px-2 py-0.5 rounded-full text-[6px] font-extrabold uppercase tracking-wide leading-none">
                        + Nueva identidad
                      </span>
                      <span className="text-blue-500 text-[8px] font-black leading-none my-0.2">↓</span>
                      <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-450 px-2 py-0.5 rounded-full text-[6px] font-extrabold uppercase tracking-wide leading-none">
                        ✓ Dashboard actualizado
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-white/5 pt-3 mt-4 text-left">
                    <p className="text-[8px] text-slate-450 dark:text-slate-500 font-semibold leading-relaxed italic">
                      * Agrega nuevas identidades en segundos.
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Bloque Explicativo: "¿Cómo funciona?" */}
          <div className="border-t border-slate-200/30 dark:border-white/5 mt-14 pt-8">
            <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider mb-6 text-center">
              ¿Cómo funciona?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              
              {/* Paso 1 */}
              <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/30 dark:border-white/5 rounded-2xl p-5 flex flex-col items-center text-center space-y-3 transition-transform duration-300 hover:scale-[1.01]">
                <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-slate-900 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-500/5 dark:border-white/5 shrink-0 shadow-sm">
                  <Layers size={16} />
                </div>
                <div className="space-y-1">
                  <div className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                    Paso 1
                  </div>
                  <h4 className="text-xs font-black text-slate-850 dark:text-white leading-snug">
                    Adquiere la Plataforma SmartNFC
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    Obtén la infraestructura base con herramientas de administración, branding y analíticas avanzadas.
                  </p>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/30 dark:border-white/5 rounded-2xl p-5 flex flex-col items-center text-center space-y-3 transition-transform duration-300 hover:scale-[1.01]">
                <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-slate-900 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-500/5 dark:border-white/5 shrink-0 shadow-sm">
                  <ClipboardList size={16} />
                </div>
                <div className="space-y-1">
                  <div className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                    Paso 2
                  </div>
                  <h4 className="text-xs font-black text-slate-850 dark:text-white leading-snug">
                    Configura tu organización
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    Define las áreas corporativas, carga tus plantillas personalizadas e integra tus sistemas de TI en minutos.
                  </p>
                </div>
              </div>

              {/* Paso 3 */}
              <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/30 dark:border-white/5 rounded-2xl p-5 flex flex-col items-center text-center space-y-3 transition-transform duration-300 hover:scale-[1.01]">
                <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-slate-900 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-500/5 dark:border-white/5 shrink-0 shadow-sm">
                  <Users size={16} />
                </div>
                <div className="space-y-1">
                  <div className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                    Paso 3
                  </div>
                  <h4 className="text-xs font-black text-slate-850 dark:text-white leading-snug">
                    Agrega Identidades Activas cuando las necesites
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    Asigna credenciales y perfiles inteligentes a tu equipo sin preocuparte por límites ni cambios de plan.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Fila Horizontal de CTAs Finales */}
          <div className="border-t border-slate-200/30 dark:border-white/5 mt-10 pt-6 flex justify-center items-center gap-3">
            <button onClick={() => setDemoModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-extrabold px-6 py-3.5 rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
              Solicitar propuesta
            </button>
            <button onClick={() => setDemoModalOpen(true)} className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-205 dark:border-slate-800 text-slate-750 dark:text-slate-200 text-[10px] font-extrabold px-6 py-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
              Conversemos sobre tu empresa
            </button>
          </div>
        </section>

        {/* 2.6.9. SOBRE SMART NFC SECTION */}
        <section id="sobre-nosotros" className="w-full max-w-7xl mx-auto px-6 py-12 border-t border-slate-200/40 dark:border-white/10 text-left scroll-mt-24">
          <div className="max-w-3xl space-y-4">
            <h3 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none">
              Sobre Smart NFC
            </h3>
            <p className="text-sm sm:text-base text-slate-800 dark:text-slate-250 leading-relaxed font-bold tracking-tight">
              Smart NFC Chile es una plataforma desarrollada en Valdivia para ayudar a empresas y equipos comerciales a gestionar sus identidades profesionales, capturar nuevos contactos y conservar el contexto de sus relaciones comerciales.
            </p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-450 leading-relaxed font-medium">
              La tecnología NFC y QR permite iniciar cada interacción, mientras la plataforma centraliza la información para que las oportunidades no dependan únicamente del teléfono o la memoria de una persona.
            </p>
          </div>
        </section>

        {/* 2.7. CONTACTO / FOOTER SECTION */}
        <section id="contacto" className="w-full max-w-7xl mx-auto px-6 py-12 border-t border-slate-200/40 dark:border-white/10 text-left scroll-mt-24">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Columna Izquierda: Brand & Info */}
            <div className="md:col-span-6 space-y-4">
              <div className="flex items-center gap-2">
                <SmartNFCLogo size={24} variant="default" className="dark:hidden" />
                <SmartNFCLogo size={24} variant="dark" className="hidden dark:flex" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-450 max-w-sm leading-relaxed font-medium">
                La plataforma de relaciones comerciales y gestión de identidades corporativas desarrollada en Valdivia, Chile. Conectando oportunidades mediante tecnología NFC y QR.
              </p>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold space-y-1.5">
                <div className="flex items-center gap-2">
                  <span>✉️</span>
                  <a href="mailto:smartnfcchile@gmail.com" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    smartnfcchile@gmail.com
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span>📞</span>
                  <a href="https://wa.me/56944891518?text=Hola,%20me%20interesa%20conocer%20Smart%20NFC%20para%20mi%20empresa%20y%20quisiera%20solicitar%20una%20demostración." target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    +56 9 4489 1518
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span>📍</span>
                  <span>Valdivia, Chile</span>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Links o Accesos Rápidos */}
            <div className="md:col-span-6 grid grid-cols-2 gap-8 text-xs font-semibold">
              <div className="space-y-3">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Enlaces</span>
                <nav className="flex flex-col gap-2 text-slate-550 dark:text-slate-400">
                  <a href="#plataforma" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Plataforma</a>
                  <a href="#soluciones" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Soluciones</a>
                  <a href="#plantillas" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Plantillas</a>
                  <a href="#planes" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Planes</a>
                </nav>
              </div>
              
              <div className="space-y-3">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Compañía</span>
                <nav className="flex flex-col gap-2 text-slate-550 dark:text-slate-400">
                  <span className="cursor-default opacity-60">Sobre nosotros</span>
                  <span className="cursor-default opacity-60">Términos de servicio</span>
                  <span className="cursor-default opacity-60">Privacidad</span>
                </nav>
              </div>
            </div>

          </div>

          <div className="border-t border-slate-200/30 dark:border-white/5 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
            <span>© 2026 SmartNFC. Todos los derechos reservados.</span>
            <span>Desarrollado con estándares Enterprise</span>
          </div>
        </section>

      </main>

      {/* 3. DEMO FORM MODAL */}
      <AnimatePresence>
        {demoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden z-10"
            >
              {/* Botón de cierre */}
              <button
                onClick={handleCloseModal}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              {!formSubmitted ? (
                /* Formulario */
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                      Solicitar demostración personalizada
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Completa el formulario y un asesor corporativo de SmartNFC te contactará para agendar una llamada y presentarte la plataforma de identidad a la medida de tu equipo.
                    </p>
                  </div>

                  <form onSubmit={handleDemoSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1 text-left">
                        <label htmlFor="form-name" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Nombre Completo
                        </label>
                        <input
                          id="form-name"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ej. Carlos Mendoza"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-1 text-left">
                        <label htmlFor="form-email" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Email Corporativo
                        </label>
                        <input
                          id="form-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Ej. carlos@tuempresa.com"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 text-left">
                      <label htmlFor="form-company" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Nombre de la Empresa
                      </label>
                      <input
                        id="form-company"
                        type="text"
                        required
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Ej. Tecnologías del Sur S.A."
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1 text-left">
                        <label htmlFor="form-role" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Cargo / Función
                        </label>
                        <select
                          id="form-role"
                          required
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                        >
                          <option value="">Selecciona tu cargo</option>
                          <option value="Gerente de RR.HH.">Director / Gerente de RR.HH.</option>
                          <option value="Gerente Comercial">Director / Gerente Comercial</option>
                          <option value="Gerente de TI">Director / Gerente de TI o Sistemas</option>
                          <option value="Socio Fundador">Socio / Director General</option>
                          <option value="Otro">Otro cargo corporativo</option>
                        </select>
                      </div>
                      <div className="space-y-1 text-left">
                        <label htmlFor="form-size" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Tamaño de Empresa
                        </label>
                        <select
                          id="form-size"
                          required
                          value={size}
                          onChange={(e) => setSize(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                        >
                          <option value="">Selecciona dotación</option>
                          <option value="1-50">1 - 50 colaboradores</option>
                          <option value="51-200">51 - 200 colaboradores</option>
                          <option value="201-500">201 - 500 colaboradores</option>
                          <option value="500+">Más de 500 colaboradores</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-4 rounded-xl shadow-[0_4px_20px_var(--glow-shadow)] transition-all cursor-pointer mt-4"
                    >
                      Enviar solicitud de demostración
                    </button>
                  </form>
                </div>
              ) : (
                /* Mensaje de éxito */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6 space-y-5"
                >
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <CheckCircle2 size={36} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                      ¡Solicitud recibida con éxito!
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                      Muchas gracias, <strong>{name}</strong>. Hemos registrado la solicitud para <strong>{company}</strong>. Uno de nuestros asesores comerciales se pondrá en contacto contigo a la brevedad para coordinar la videollamada.
                    </p>
                  </div>
                   <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <a
                      href="https://wa.me/56944891518?text=Hola,%20me%20interesa%20conocer%20Smart%20NFC%20para%20mi%20empresa%20y%20quisiera%20solicitar%20una%20demostración."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-6 py-3 rounded-xl transition-all shadow-md shadow-blue-600/10 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Hablar por WhatsApp de inmediato
                      <ArrowRight size={14} />
                    </a>
                    <button
                      onClick={handleCloseModal}
                      className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold px-6 py-3 rounded-xl transition-all cursor-pointer"
                    >
                      Entendido
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
