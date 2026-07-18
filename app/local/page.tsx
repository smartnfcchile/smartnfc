import React from "react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Smart NFC Local | Fidelización por WhatsApp y Club de Beneficios Presenciales",
  description: "Atrae y fideliza clientes presenciales en tu tienda o local. Captación de leads mediante códigos QR y redirección automática a WhatsApp.",
};

export default function LocalLandingPage() {
  const whatsappUrl = `https://wa.me/56912345678?text=${encodeURIComponent("Hola, me gustaría cotizar Smart NFC Local para mi negocio presencial.")}`;

  const plans = [
    {
      name: "Impulsa",
      price: "$29.900 + IVA",
      period: "/mes",
      limits: "Implementación: $149.900 + IVA (pago único)",
      description: "La solución completa de fidelización digital para locales físicos e independientes.",
      features: [
        "1 Club de beneficios digital",
        "3 Puntos de contacto QR/NFC físicos",
        "Redirección a WhatsApp para promociones",
        "Métricas mensuales y analíticas en tiempo real",
        "Sucursal adicional por $19.900 + IVA/mes",
        "Soporte adicional por $39.900 + IVA (opcional)",
      ],
      isPopular: false,
    },
    {
      name: "Cliente Fundador",
      price: "$19.900 + IVA",
      period: "/mes (por 12 meses)",
      limits: "Implementación: $79.900 + IVA (pago único)",
      description: "Oferta exclusiva de lanzamiento para negocios pioneros locales.",
      features: [
        "1 Club de beneficios digital",
        "3 Puntos de contacto QR/NFC físicos",
        "Redirección a WhatsApp de promociones",
        "Analíticas completas en tiempo real",
        "Máximo 5 negocios de Valdivia",
        "Precio congelado de licencia por 12 meses",
      ],
      isPopular: true,
      priceNote: "Exclusivo para 5 negocios de Valdivia",
    },
    {
      name: "Personalizado",
      price: "Cotizar",
      period: "",
      limits: "Multi-sucursal y capacidades escalables",
      description: "Para cadenas de locales y franquicias que requieren administración centralizada de múltiples sucursales.",
      features: [
        "Campañas e hitos ilimitados",
        "Multi-sucursal con reportes independientes",
        "Touchpoints QR/NFC ilimitados",
        "Integración con sistemas POS / Boletas",
        "Soporte corporativo dedicado",
      ],
      isPopular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#07101F] text-slate-100 flex flex-col font-sans select-none">
      
      {/* Header Comercial */}
      <header className="max-w-7xl mx-auto px-6 h-20 w-full flex items-center justify-between border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-tight text-white">
          <span>Smart</span><span className="text-amber-500">NFC</span>
          <span className="text-[10px] uppercase font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded">Local</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/login" className="text-xs font-bold text-slate-400 hover:text-white transition-all py-2">
            Iniciar Sesión
          </Link>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold px-4 py-2 rounded-xl transition-all"
          >
            Contacto Comercial
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow">
        <section className="max-w-4xl mx-auto px-6 py-16 text-center space-y-6">
          <div className="inline-flex">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-[9px] font-extrabold uppercase tracking-widest text-amber-400">
              FIDELIZACIÓN PRESENCIAL B2C
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Fideliza clientes en tu local físico a través de WhatsApp<span className="text-amber-500">.</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-450 max-w-2xl mx-auto font-medium leading-relaxed">
            Convierte a los clientes casuales en clientes recurrentes. Permíteles escanear un código QR o tarjeta NFC en tu local para sumarse a tu club de beneficios y recibir promociones directo en su WhatsApp.
          </p>
          <div className="pt-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex bg-amber-600 hover:bg-amber-500 text-white text-sm font-black px-8 py-4 rounded-2xl shadow-lg shadow-amber-500/10 transition-all hover:-translate-y-0.5"
            >
              Habilitar mi Negocio Presencial
            </a>
          </div>
        </section>

        {/* Pricing Catalog */}
        <section className="max-w-6xl mx-auto px-6 py-12 scroll-mt-24">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-white">Planes y Tarifas en Español</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Lanza tu propio club de beneficios y digitaliza tu local presencial hoy mismo.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`bg-slate-900/40 border rounded-3xl p-6 shadow-xl flex flex-col justify-between relative transition-all duration-300 hover:border-slate-800 ${
                  p.isPopular ? "border-amber-500 border-2" : "border-slate-850"
                }`}
              >
                {p.isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-amber-400">
                    OFERTA LIMITADA
                  </span>
                )}

                <div className="space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-white">{p.name}</h3>
                    <p className="text-[10px] text-amber-450 font-extrabold uppercase tracking-wider">{p.limits}</p>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">{p.price}</span>
                      <span className="text-xs text-slate-500 font-bold">{p.period}</span>
                    </div>
                    {p.priceNote && (
                      <span className="text-[9px] text-amber-400 font-extrabold mt-0.5">{p.priceNote}</span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">{p.description}</p>

                  <div className="h-px bg-slate-850" />

                  <ul className="space-y-2.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[10.5px] text-slate-350 font-semibold leading-tight">
                        <span className="text-amber-500 shrink-0">✓</span>
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
                        ? "bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/10"
                        : "bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-750"
                    }`}
                  >
                    {p.price === "Cotizar" ? "Contactar Ventas" : "Reservar Licencia"}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 w-full border-t border-white/5 text-center text-xs text-slate-500 font-semibold space-y-2">
        <p>© 2026 Smart NFC Local. Todos los derechos reservados.</p>
        <p className="text-[10px] opacity-80">Fidelización por WhatsApp, analíticas presenciales y captación física para locales en Santiago y regiones de Chile.</p>
      </footer>
    </div>
  );
}
