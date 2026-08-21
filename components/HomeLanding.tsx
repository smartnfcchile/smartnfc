"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowRight, BarChart3, Check, ChevronDown, ContactRound, Menu, Radio, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import SmartNFCLogo from "./brand/SmartNFCLogo";

const demoUrl = "https://wa.me/56944891518?text=Hola%2C%20quiero%20ver%20c%C3%B3mo%20SmartNFC%20puede%20ayudar%20a%20mi%20equipo.";

const faqs = [
  ["¿Qué es una tarjeta NFC?", "Es una tarjeta física reutilizable que, al acercarse a un teléfono compatible, abre un perfil digital. También incluye un código QR para asegurar compatibilidad con cualquier smartphone."],
  ["¿La otra persona debe instalar una aplicación?", "No. El perfil se abre directamente en el navegador. La persona puede ver tus datos, guardarte como contacto o compartir los suyos en segundos."],
  ["¿Puedo cambiar mis datos después de imprimir la tarjeta?", "Sí. El contenido vive en tu perfil digital, por lo que puedes actualizar cargo, teléfono, enlaces o imagen sin reemplazar la tarjeta física."],
  ["¿Cómo funciona para equipos y empresas?", "Un administrador gestiona perfiles, imagen corporativa y usuarios desde un panel central. Además, el equipo puede revisar interacciones y prospectos captados."],
  ["¿Funciona con iPhone y Android?", "Sí. Funciona por NFC en teléfonos compatibles y mediante QR en el resto, sin depender de una aplicación."],
];

function ProductStory() {
  return (
    <div className="product-story product-photo" aria-label="Una tarjeta SmartNFC se acerca a un teléfono para compartir un perfil digital">
      <Image src="/images/smartnfc-tap-hero.webp" alt="Persona acercando una tarjeta NFC premium a un teléfono móvil" fill priority sizes="(max-width: 900px) 100vw, 54vw" />
      <div className="photo-vignette" />
      <div className="photo-brand"><span className="brand-s">S</span><div><b>SmartNFC</b><small>Conecta sin papel</small></div></div>
      <div className="story-label story-label-one"><span>01</span> Acerca</div>
      <div className="story-label story-label-two"><span>02</span> Comparte</div>
      <div className="story-label story-label-three"><Check size={13}/> Contacto captado</div>
    </div>
  );
}

export default function HomeLanding() {
  const [open, setOpen] = useState(false);
  return (
    <div className="marketing-page">
      <header className="site-header">
        <div className="nav-wrap">
          <Link href="/" aria-label="SmartNFC, inicio"><SmartNFCLogo size={30} variant="dark" /></Link>
          <nav className="desktop-nav" aria-label="Navegación principal">
            <a href="#solucion">Solución</a><Link href="/local">Para locales</Link><a href="#empresas">Para empresas</a><a href="#como-funciona">Cómo funciona</a><Link href="/blog">Recursos</Link>
          </nav>
          <div className="nav-actions"><Link href="/login" className="login-link">Ingresar</Link><a className="button button-small" href={demoUrl} target="_blank" rel="noreferrer">Solicitar demo</a></div>
          <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Abrir menú" aria-expanded={open}>{open ? <X /> : <Menu />}</button>
        </div>
        {open && <nav className="mobile-nav"><a href="#solucion" onClick={() => setOpen(false)}>Solución</a><Link href="/local" onClick={() => setOpen(false)}>Para locales</Link><a href="#empresas" onClick={() => setOpen(false)}>Para empresas</a><a href="#como-funciona" onClick={() => setOpen(false)}>Cómo funciona</a><Link href="/blog" onClick={() => setOpen(false)}>Recursos</Link><Link href="/login" onClick={() => setOpen(false)}>Ingresar</Link><a className="button" href={demoUrl}>Solicitar demo</a></nav>}
      </header>

      <main>
        <section className="hero">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="eyebrow"><Sparkles size={15} /> Networking inteligente para empresas</div>
              <h1>Un toque.<br /><span>Una conexión real.</span></h1>
              <p className="hero-lead">Reemplaza las tarjetas de papel por una experiencia que comparte tus datos, captura prospectos y mide cada interacción.</p>
              <div className="hero-actions"><a className="button" href={demoUrl} target="_blank" rel="noreferrer">Ver SmartNFC en acción <ArrowRight size={18} /></a><a className="text-link" href="#como-funciona">Descubrir cómo funciona</a></div>
              <div className="trust-row"><span><Check /> Sin aplicaciones</span><span><Check /> NFC + QR</span><span><Check /> Datos editables</span></div>
            </div>
            <ProductStory />
          </div>
        </section>

        <section className="proof-strip" aria-label="Beneficios destacados"><p>Diseñado para equipos que convierten conversaciones en oportunidades.</p><div><span>Ventas</span><span>Eventos</span><span>Servicios profesionales</span><span>Retail</span></div></section>

        <section id="solucion" className="section solution-section">
          <div className="section-heading"><span className="kicker">Todo conectado</span><h2>Tu presentación profesional.<br />Ahora trabaja para ti.</h2><p>SmartNFC une una tarjeta física premium, un perfil siempre actualizado y herramientas para hacer seguimiento comercial.</p></div>
          <div className="feature-grid">
            <article className="feature feature-large profile-feature"><div><span className="icon-box"><ContactRound /></span><p className="feature-number">01 · PERFIL DIGITAL</p><h3>Comparte más que un número.</h3><p>Contacto, redes, catálogo, documentos y llamados a la acción en una experiencia con tu marca.</p></div><div className="mini-profile"><div className="mini-cover"/><div className="mini-avatar">AM</div><b>Antonia Martínez</b><small>Consultora de negocios</small><div className="mini-buttons"><i/><i/><i/></div></div></article>
            <article className="feature"><span className="icon-box lime"><Users /></span><p className="feature-number">02 · CONTROL DE EQUIPO</p><h3>Una marca consistente, en cada persona.</h3><p>Administra perfiles, roles y cambios desde un único lugar.</p><div className="team-list"><span>CM</span><span>JP</span><span>MV</span><b>+12</b></div></article>
            <article className="feature dark-feature"><span className="icon-box"><BarChart3 /></span><p className="feature-number">03 · RESULTADOS</p><h3>De “mucho gusto” a un dato accionable.</h3><p>Visualiza aperturas, contactos captados y desempeño.</p><div className="chart"><i/><i/><i/><i/><i/><i/></div></article>
          </div>
        </section>

        <section id="como-funciona" className="section how-section">
          <div className="how-intro"><span className="kicker">Así de simple</span><h2>Tres segundos para dejar una impresión.</h2><p>No hay apps, claves ni instrucciones. Solo acercar, descubrir y conectar.</p></div>
          <ol className="steps">
            <li><span>01</span><div className="step-visual tap-visual"><div className="small-card">S</div><Radio /></div><h3>Acerca</h3><p>Tu contacto acerca el teléfono a la tarjeta o escanea el QR.</p></li>
            <li><span>02</span><div className="step-visual"><div className="small-phone"><b>Camila Muñoz</b><i/><i/></div></div><h3>Comparte</h3><p>Tu perfil abre al instante, listo para llamar, guardar o explorar.</p></li>
            <li><span>03</span><div className="step-visual"><div className="success-ring"><Check /></div></div><h3>Convierte</h3><p>Captura los datos del prospecto y continúa la conversación.</p></li>
          </ol>
        </section>

        <section id="empresas" className="section business-section">
          <div className="business-card"><div><span className="kicker kicker-light">SmartNFC para equipos</span><h2>Tu equipo crece.<br />Tu identidad no se fragmenta.</h2><p>Centraliza la presencia digital de cada colaborador y convierte el networking en un canal medible.</p><ul><li><ShieldCheck /> Perfiles administrados y siempre actualizados</li><li><Users /> Altas y cambios sin reimprimir tarjetas</li><li><BarChart3 /> Métricas y prospectos en un solo panel</li></ul><Link className="button button-light" href="/empresas">Explorar solución para empresas <ArrowRight size={18}/></Link></div><div className="dashboard-card"><div className="dash-browser"><i/><i/><i/><span>app.smartnfc.cl/dashboard</span></div><div className="dash-layout"><aside><span className="dash-logo">S</span><i className="active"/><i/><i/><i/></aside><div className="dash-content"><div className="dash-top"><div><small>Panel general</small><span>Resumen del equipo</span></div><em>Últimos 30 días</em></div><div className="metric-row"><div><small>Interacciones</small><b>1.284</b><em>↗ 24%</em></div><div><small>Contactos</small><b>318</b><em>↗ 18%</em></div><div><small>Conversión</small><b>24,8%</b><em>↗ 6%</em></div></div><div className="dash-graph"><div className="graph-head"><span>Actividad del equipo</span><small>Interacciones</small></div><svg viewBox="0 0 460 130" role="img" aria-label="Gráfica ascendente de interacciones"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#246bfd" stopOpacity=".28"/><stop offset="1" stopColor="#246bfd" stopOpacity="0"/></linearGradient></defs><path className="area" d="M0 112 C45 104 54 82 91 89 S151 69 184 74 S243 40 278 52 S345 38 376 27 S427 33 460 8 L460 130 L0 130Z"/><path className="line" d="M0 112 C45 104 54 82 91 89 S151 69 184 74 S243 40 278 52 S345 38 376 27 S427 33 460 8"/></svg></div><div className="dash-activity"><div><span className="activity-avatar">CM</span><p><b>Camila Muñoz</b><small>Compartió su perfil · Evento Retail</small></p><em>Ahora</em></div><div><span className="activity-avatar lime">JP</span><p><b>Javier Pérez</b><small>Nuevo contacto captado</small></p><em>Hace 8 min</em></div></div></div></div></div></div>
        </section>

        <section className="section blog-preview"><div className="blog-head"><div><span className="kicker">Ideas para conectar mejor</span><h2>Recursos para equipos que venden en persona.</h2></div><Link href="/blog">Ver todos los recursos <ArrowRight size={17}/></Link></div><div className="article-grid"><Link href="/blog/que-es-una-tarjeta-nfc"><span>GUÍA · 7 MIN</span><h3>¿Qué es una tarjeta NFC y cómo funciona?</h3><p>Todo lo que necesitas saber antes de digitalizar tu tarjeta de presentación.</p></Link><Link href="/blog/tarjeta-nfc-vs-codigo-qr"><span>COMPARATIVA · 5 MIN</span><h3>Tarjeta NFC vs. código QR: ¿cuál conviene?</h3><p>Diferencias, ventajas y por qué funcionan mejor cuando están juntos.</p></Link><Link href="/blog/networking-empresarial"><span>ESTRATEGIA · 6 MIN</span><h3>Cómo medir el retorno del networking empresarial</h3><p>Convierte conversaciones, ferias y eventos en oportunidades trazables.</p></Link></div></section>

        <section id="preguntas" className="section faq-section"><div><span className="kicker">Preguntas frecuentes</span><h2>Lo esencial,<br />respondido.</h2><p>¿Tienes una necesidad específica? <a href={demoUrl}>Conversemos.</a></p></div><div className="faq-list">{faqs.map(([q,a]) => <details key={q}><summary>{q}<ChevronDown /></summary><p>{a}</p></details>)}</div></section>

        <section className="final-cta"><div><span className="eyebrow dark-eyebrow">Hecho para conexiones reales</span><h2>Tu próxima oportunidad<br />puede empezar con un toque.</h2><p>Descubre cómo SmartNFC puede transformar la forma en que tu equipo se presenta, conecta y crece.</p><a className="button" href={demoUrl} target="_blank" rel="noreferrer">Solicitar una demostración <ArrowRight size={18}/></a></div><div className="cta-card"><span className="brand-s">S</span><div><b>SmartNFC</b><small>Tap to connect</small></div><Radio/></div></section>
      </main>

      <footer className="site-footer"><div className="footer-main"><div><SmartNFCLogo size={29} variant="dark"/><p>La forma inteligente de conectar<br/>personas, marcas y oportunidades.</p></div><div><b>Producto</b><a href="#solucion">Solución</a><Link href="/empresas">Empresas</Link><Link href="/local">Negocios locales</Link></div><div><b>Recursos</b><Link href="/blog">Blog</Link><a href="#preguntas">Preguntas frecuentes</a><a href={demoUrl}>Contacto</a></div></div><div className="footer-bottom"><span>© 2026 SmartNFC · Valdivia, Chile</span><span>Conectamos sin papel.</span></div></footer>
    </div>
  );
}
