import Link from "next/link";
import { Metadata } from "next";
import QuoteCalculator from "./QuoteCalculator";

export const metadata: Metadata = {
  title: "Smart NFC Empresas | Tarjetas NFC para equipos",
  description: "Cotiza tarjetas NFC corporativas y perfiles digitales para tu equipo. Pago único por tarjeta y plataforma mensual por identidad activa.",
  alternates: { canonical: "/empresas" },
};

const whatsappUrl = `https://wa.me/56944891518?text=${encodeURIComponent("Hola, quiero cotizar SmartNFC Empresas para mi equipo.")}`;

export default function EmpresasLandingPage() {
  return (
    <div className="flex min-h-screen select-none flex-col bg-[#07101F] font-sans text-slate-100">
      <header className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between border-b border-white/5 px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-tight text-white">
          <span>Smart</span><span className="text-blue-500">NFC</span>
          <span className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-400">Empresas</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/login" className="py-2 text-xs font-bold text-slate-400 transition hover:text-white">Iniciar sesión</Link>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-blue-500">Contacto comercial</a>
        </div>
      </header>

      <main className="flex-grow">
        <section className="mx-auto max-w-5xl px-6 pb-12 pt-16 text-center">
          <span className="inline-flex rounded-full border border-blue-500/20 bg-blue-500/5 px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest text-blue-400">Solución corporativa B2B</span>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl">Una tarjeta por persona.<br/><span className="text-blue-500">Una plataforma para todo tu equipo.</span></h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm font-medium leading-relaxed text-slate-400 sm:text-base">Entrega una identidad digital profesional a cada colaborador, administra la información desde un solo lugar y convierte cada encuentro en una oportunidad medible.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 text-[10px] font-extrabold uppercase tracking-wider">
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-300">Tarjeta: pago único</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-300">Plataforma: $6.990 por persona/mes</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-300">Reposición: $14.990</span>
          </div>
          <a href="#cotizador" className="mt-8 inline-flex rounded-2xl bg-blue-600 px-8 py-4 text-sm font-black text-white shadow-lg shadow-blue-500/10 transition hover:-translate-y-0.5 hover:bg-blue-500">Calcular inversión para mi equipo</a>
        </section>

        <QuoteCalculator />
      </main>

      <footer className="mx-auto w-full max-w-7xl border-t border-white/5 px-6 py-12 text-center text-xs font-semibold text-slate-500">
        <p>© 2026 SmartNFC. Todos los derechos reservados.</p>
        <p className="mt-2 text-[10px] opacity-80">Tarjetas NFC, identidades digitales y gestión comercial para equipos en Chile.</p>
      </footer>
    </div>
  );
}
