import type { Metadata } from "next";
import HomeClient from "../components/HomeClient";

// SEO and OpenGraph optimization for corporate audience
export const metadata: Metadata = {
  title: "SmartNFC | Identidad Profesional Inteligente para Empresas",
  description: "La plataforma corporativa líder para centralizar y administrar la identidad digital de tus colaboradores. Perfiles inteligentes, tarjetas NFC, códigos QR y analíticas en tiempo real.",
  keywords: [
    "identidad profesional",
    "tarjetas virtuales",
    "NFC corporativo",
    "QR dinámico",
    "tarjeta digital de presentación",
    "identidad digital RRHH",
    "SmartNFC",
    "trazabilidad comercial"
  ],
  openGraph: {
    title: "SmartNFC | Identidad Profesional Inteligente para Empresas",
    description: "Centraliza la identidad digital de tus colaboradores con perfiles corporativos inteligentes, analíticas en tiempo real y tarjetas físicas.",
    url: "https://smartnfc.cl",
    siteName: "SmartNFC",
    locale: "es_CL",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default function Home() {
  return <HomeClient />;
}