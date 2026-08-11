"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ArrowRight, BarChart3, Building2, Check, Menu, Moon, QrCode, Smartphone, Sun, Users, X, Zap } from "lucide-react";
import SmartNFCLogo from "./brand/SmartNFCLogo";
import DashboardMockup from "./DashboardMockup";

const whatsapp = "https://wa.me/56944891518?text=Hola,%20quiero%20conocer%20SmartNFC%20para%20mi%20empresa.";
const benefits = [
  { icon: Smartphone, title: "Identidad digital actualizable", text: "Cambia cargos, teléfonos o enlaces una sola vez, sin volver a imprimir tarjetas." },
  { icon: Users, title: "Gestión para todo el equipo", text: "Centraliza perfiles, permisos, diseños y contactos desde un dashboard corporativo." },
  { icon: BarChart3, title: "Interacciones medibles", text: "Conoce visitas, lecturas NFC y prospectos compartidos para dar seguimiento comercial." },
];
const steps = [
  { icon: QrCode, title: "Acerca o escanea", text: "La persona abre tu identidad digital mediante NFC o código QR." },
  { icon: Smartphone, title: "Comparte información", text: "Guarda tus datos o deja los suyos directamente desde el teléfono." },
  { icon: Building2, title: "Gestiona y mide", text: "Tu equipo visualiza contactos e interacciones desde el dashboard." },
];
const faqs = [
  ["¿Qué es una tarjeta NFC?", "Es una tarjeta física con un chip de proximidad. Al acercarla a un teléfono compatible, abre tu perfil digital para compartir datos de contacto, enlaces y canales comerciales."],
  ["¿La otra persona necesita instalar una aplicación?", "No. El perfil se abre directamente en el navegador del teléfono mediante NFC o código QR."],
  ["¿Qué diferencia hay entre una tarjeta NFC y una tarjeta digital?", "La tarjeta NFC activa la experiencia. La tarjeta digital es el perfil web actualizable donde viven tus datos, enlaces y acciones de contacto."],
  ["¿SmartNFC sirve para empresas con varios colaboradores?", "Sí. Permite administrar identidades digitales, diseños e interacciones para equipos, y visualizar los prospectos que comparten sus datos."],
];

export default function HomeLanding() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  return (
    <div className="min-h-screen bg-white text-slate-950 dark:bg-[#07101f] dark:text-white">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-[#07101f]/90">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="SmartNFC, inicio"><SmartNFCLogo size={30} variant="default" className="dark:hidden" /><SmartNFCLogo size={30} variant="dark" className="hidden dark:flex" /></Link>
          <nav aria-label="Navegación principal" className="hidden items-center gap-7 md:flex">
            <a href="#beneficios" className="text-sm font-semibold text-slate-700 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-300">Beneficios</a>
            <a href="#como-funciona" className="text-sm font-semibold text-slate-700 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-300">Cómo funciona</a>
            <a href="#preguntas" className="text-sm font-semibold text-slate-700 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-300">Preguntas frecuentes</a>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <button onClick={toggleTheme} aria-label="Cambiar tema" className="rounded-xl border border-slate-300 p-2.5 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">{mounted && resolvedTheme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>
            <Link href="/login" className="px-2 text-sm font-bold">Ingresar</Link>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Solicitar demostración</a>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label="Abrir menú" className="rounded-xl border border-slate-300 p-2.5 md:hidden dark:border-slate-700">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
        {menuOpen && <nav id="mobile-menu" aria-label="Navegación móvil" className="border-t border-slate-200 bg-white px-5 py-5 md:hidden dark:border-slate-800 dark:bg-[#07101f]"><div className="flex flex-col gap-4"><a href="#beneficios" onClick={() => setMenuOpen(false)} className="font-semibold">Beneficios</a><a href="#como-funciona" onClick={() => setMenuOpen(false)} className="font-semibold">Cómo funciona</a><a href="#preguntas" onClick={() => setMenuOpen(false)} className="font-semibold">Preguntas frecuentes</a><Link href="/login" className="font-semibold">Ingresar</Link><a href={whatsapp} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-blue-600 px-5 py-3 text-center font-bold text-white">Solicitar demostración</a></div></nav>}
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(37,99,235,0.13),transparent_34%),radial-gradient(circle_at_85%_40%,rgba(234,179,8,0.10),transparent_30%)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:py-28">
            <div>
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-blue-800 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200"><Zap size={13} /> Tecnología NFC para empresas</p>
              <h1 className="max-w-3xl text-4xl font-black leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">Tarjetas NFC e identidad digital para conectar mejor.</h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700 dark:text-slate-300">Comparte datos de contacto en segundos, administra las tarjetas digitales de tu equipo y convierte cada encuentro en una oportunidad medible.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row"><a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 font-extrabold text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700">Ver una demostración <ArrowRight size={18} /></a><Link href="/empresas" className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-4 font-extrabold text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white">Soluciones para empresas</Link></div>
              <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-700 dark:text-slate-300"><li className="flex items-center gap-2"><Check size={16} className="text-emerald-600" /> Sin aplicación</li><li className="flex items-center gap-2"><Check size={16} className="text-emerald-600" /> NFC y QR</li><li className="flex items-center gap-2"><Check size={16} className="text-emerald-600" /> Gestión centralizada</li></ul>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-3 shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900"><DashboardMockup /></div>
          </div>
        </section>

        <section id="beneficios" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24">
          <div className="max-w-2xl"><p className="text-sm font-extrabold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">Más que una tarjeta de presentación</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Una plataforma simple para una identidad profesional consistente.</h2></div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">{benefits.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-700 dark:bg-slate-900"><span className="inline-flex rounded-xl bg-blue-50 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><Icon size={23} /></span><h3 className="mt-5 text-xl font-extrabold">{title}</h3><p className="mt-3 leading-7 text-slate-700 dark:text-slate-300">{text}</p></article>)}</div>
        </section>

        <section id="como-funciona" className="scroll-mt-24 border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60"><div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[0.8fr_1.2fr]"><div><p className="text-sm font-extrabold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">Cómo funciona SmartNFC</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">De la presentación al seguimiento, en tres pasos.</h2><p className="mt-5 leading-7 text-slate-700 dark:text-slate-300">La tecnología se ocupa del intercambio; tu equipo conserva el control de la relación comercial.</p></div><ol className="grid gap-4 sm:grid-cols-3">{steps.map(({ icon: Icon, title, text }, index) => <li key={title} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"><div className="flex items-center justify-between"><Icon size={24} className="text-blue-700 dark:text-blue-300" /><span className="text-3xl font-black text-slate-200 dark:text-slate-700">0{index + 1}</span></div><h3 className="mt-5 text-lg font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{text}</p></li>)}</ol></div></section>

        <section id="preguntas" className="mx-auto max-w-4xl scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24"><div className="text-center"><p className="text-sm font-extrabold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">Respuestas claras</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Preguntas sobre tarjetas NFC e identidad digital</h2></div><div className="mt-10 space-y-4">{faqs.map(([question, answer]) => <details key={question} className="rounded-2xl border border-slate-200 bg-white p-6 open:shadow-sm dark:border-slate-700 dark:bg-slate-900"><summary className="cursor-pointer list-none pr-8 text-lg font-extrabold">{question}</summary><p className="mt-4 max-w-3xl leading-7 text-slate-700 dark:text-slate-300">{answer}</p></details>)}</div></section>

        <section className="px-5 pb-20 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 rounded-3xl bg-slate-950 p-8 text-white sm:p-12 lg:flex-row lg:items-center dark:bg-blue-950"><div><h2 className="text-3xl font-black tracking-tight">Haz que cada contacto sea más fácil de compartir y recordar.</h2><p className="mt-3 text-slate-300">Conoce la solución adecuada para tu empresa o negocio local.</p></div><div className="flex shrink-0 flex-col gap-3 sm:flex-row"><Link href="/empresas" className="rounded-xl bg-blue-600 px-6 py-4 text-center font-extrabold text-white">SmartNFC Empresas</Link><Link href="/local" className="rounded-xl border border-slate-600 px-6 py-4 text-center font-extrabold">SmartNFC Local</Link></div></div></section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"><div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between"><div><SmartNFCLogo size={26} variant="default" className="dark:hidden" /><SmartNFCLogo size={26} variant="dark" className="hidden dark:flex" /><p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Tarjetas NFC e identidad digital desde Valdivia, Chile.</p></div><div className="flex flex-wrap gap-5 text-sm font-semibold text-slate-700 dark:text-slate-300"><a href="mailto:smartnfcchile@gmail.com">Contacto</a><Link href="/empresas">Empresas</Link><Link href="/local">Negocios locales</Link></div></div></footer>
    </div>
  );
}
