import React from "react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Smart NFC Empresas | Identidades Corporativas Inteligentes B2B",
  description: "Digitaliza tu equipo comercial. Tarjetas físicas NFC y perfiles virtuales actualizables con analíticas en tiempo real.",
};

export default function EmpresasLandingPage() {
  const whatsappUrl = `https://wa.me/56912345678?text=${encodeURIComponent("Hola, me gustaría cotizar Smart NFC Empresas para mi equipo.")}`;

  const plans = [
    {
      name: "Conecta",
      price: "$29.990",
      period: "/año",
      identities: "Hasta 5 identidades activas",
      description: "Ideal para microempresas y profesionales independientes que inician su red comercial.",
      features: [
        "5 Perfiles digitales inteligentes",
        "Códigos QR dinámicos",
        "Analíticas básicas de vistas",
        "Soporte por correo electrónico",
      ],
      isPopular: false,
    },
    {
      name: "Crece",
      price: "$79.990",
      period: "/año",
      identities: "Hasta 15 identidades activas",
      description: "Diseñado para equipos de ventas en crecimiento que buscan consistencia en su marca.",
      features: [
        "15 Perfiles digitales inteligentes",
        "Códigos QR dinámicos e ilimitados",
        "Analíticas avanzadas e interacciones",
        "CRM básico de prospectos (leads)",
        "Soporte prioritario",
      ],
      isPopular: true,
    },
    {
      name: "Escala",
      price: "$149.990",
      period: "/año",
      identities: "Hasta 30 identidades activas",
      description: "Perfecto para empresas medianas que requieren múltiples vendedores en terreno.",
      features: [
        "30 Perfiles digitales inteligentes",
        "Logotipos e identidad de marca premium",
        "Analíticas completas de conversión B2B",
        "CRM completo con exportación a Excel",
        "Soporte prioritario por WhatsApp",
      ],
      isPopular: false,
    },
    {
      name: "Corporativo",
      price: "Cotizar",
      period: "",
      identities: "Identidades ilimitadas a medida",
      description: "Para grandes organizaciones que requieren integraciones personalizadas y soporte dedicado.",
      features: [
        "Identidades a medida (50+)",
        "Integración con CRM (HubSpot/Salesforce)",
        "Diseño de tarjetas físicas NFC personalizadas",
        "Ejecutivo de cuentas dedicado",
        "SLA garantizado",
      ],
      isPopular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#07101F] text-slate-100 flex flex-col font-sans select-none">
      
      {/* Header Comercial */}
      <header className="max-w-7xl mx-auto px-6 h-20 w-full flex items-center justify-between border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-tight text-white">
          <span>Smart</span><span className="text-blue-500">NFC</span>
          <span className="text-[10px] uppercase font-bold bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Empresas</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/login" className="text-xs font-bold text-slate-400 hover:text-white transition-all py-2">
            Iniciar Sesión
          </Link>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-4 py-2 rounded-xl transition-all"
          >
            Contacto Comercial
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow">
        <section className="max-w-4xl mx-auto px-6 py-16 text-center space-y-6">
          <div className="inline-flex">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-[9px] font-extrabold uppercase tracking-widest text-blue-400">
              SOLUCIÓN CORPORATIVA B2B
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Digitaliza la fuerza de ventas de tu empresa<span className="text-blue-500">.</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-450 max-w-2xl mx-auto font-medium leading-relaxed">
            Elimina las tarjetas de papel. Smart NFC Empresas te permite centralizar, actualizar y analizar los perfiles comerciales de todo tu equipo desde un único panel administrativo.
          </p>
          <div className="pt-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex bg-blue-600 hover:bg-blue-500 text-white text-sm font-black px-8 py-4 rounded-2xl shadow-lg shadow-blue-500/10 transition-all hover:-translate-y-0.5"
            >
              Iniciar Prueba o Solicitar Demo
            </a>
          </div>
        </section>

        {/* Pricing Catalog */}
        <section className="max-w-7xl mx-auto px-6 py-12 scroll-mt-24">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-white">Catálogo de Planes y Capacidades</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Precios claros y flexibles para el crecimiento de tu red corporativa.</p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-[11px] text-blue-400 font-bold uppercase tracking-wider pt-2">
              <span>* Identidad adicional: $4.990 + IVA/mes</span>
              <span className="hidden sm:inline">•</span>
              <span>* Dispositivos e implementación cotizados separadamente</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`bg-slate-900/40 border rounded-3xl p-6 shadow-xl flex flex-col justify-between relative transition-all duration-300 hover:border-slate-800 ${
                  p.isPopular ? "border-blue-600 border-2" : "border-slate-850"
                }`}
              >
                {p.isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-blue-500">
                    MÁS POPULAR
                  </span>
                )}

                <div className="space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-white">{p.name}</h3>
                    <p className="text-[10px] text-blue-400 font-extrabold uppercase tracking-wider">{p.identities}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{p.price}</span>
                    <span className="text-xs text-slate-500 font-bold">{p.period}</span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">{p.description}</p>

                  <div className="h-px bg-slate-850" />

                  <ul className="space-y-2.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[10.5px] text-slate-350 font-semibold leading-tight">
                        <span className="text-blue-500 shrink-0">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full block py-3 rounded-xl text-xs font-black text-center transition-all ${
                      p.isPopular
                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/10"
                        : "bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-750"
                    }`}
                  >
                    {p.price === "Cotizar" ? "Contactar Ventas" : "Contratar Plan"}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 w-full border-t border-white/5 text-center text-xs text-slate-500 font-semibold space-y-2">
        <p>© 2026 Smart NFC. Todos los derechos reservados.</p>
        <p className="text-[10px] opacity-80">La solución definitiva en identidad digital B2B y tarjetas inteligentes de presentación en Chile.</p>
      </footer>
    </div>
  );
}
