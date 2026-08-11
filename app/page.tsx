import type { Metadata } from "next";
import HomeLanding from "../components/HomeLanding";

export const metadata: Metadata = {
  title: "Tarjetas NFC e identidad digital para empresas",
  description: "Comparte contactos con tarjetas NFC y QR, administra la identidad digital de tu equipo y visualiza prospectos desde SmartNFC.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Tarjetas NFC e identidad digital | SmartNFC",
    description: "Tarjetas NFC, perfiles digitales y gestión de contactos para equipos y empresas.",
    url: "/",
    siteName: "SmartNFC",
    locale: "es_CL",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Tarjetas NFC e identidad digital | SmartNFC", description: "Comparte contactos y administra la identidad digital de tu equipo." },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
};

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": "https://smartnfc.cl/#organization", name: "SmartNFC", url: "https://smartnfc.cl/", email: "smartnfcchile@gmail.com", telephone: "+56944891518", address: { "@type": "PostalAddress", addressLocality: "Valdivia", addressCountry: "CL" } },
      { "@type": "WebSite", "@id": "https://smartnfc.cl/#website", url: "https://smartnfc.cl/", name: "SmartNFC", inLanguage: "es-CL", publisher: { "@id": "https://smartnfc.cl/#organization" } },
      { "@type": "Service", name: "Tarjetas NFC e identidad digital para empresas", serviceType: "Tarjetas NFC, tarjetas digitales y gestión de identidad digital", areaServed: { "@type": "Country", name: "Chile" }, provider: { "@id": "https://smartnfc.cl/#organization" } },
      { "@type": "FAQPage", mainEntity: [
        { "@type": "Question", name: "¿Qué es una tarjeta NFC?", acceptedAnswer: { "@type": "Answer", text: "Es una tarjeta física con un chip de proximidad que abre un perfil digital al acercarla a un teléfono compatible." } },
        { "@type": "Question", name: "¿Se necesita una aplicación?", acceptedAnswer: { "@type": "Answer", text: "No. El perfil se abre directamente en el navegador mediante NFC o código QR." } },
        { "@type": "Question", name: "¿SmartNFC sirve para empresas?", acceptedAnswer: { "@type": "Answer", text: "Sí. Permite administrar identidades digitales, diseños, interacciones y prospectos para varios colaboradores desde un dashboard." } },
      ] },
    ],
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} /><HomeLanding /></>;
}
