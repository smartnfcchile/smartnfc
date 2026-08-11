import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://smartnfc.cl"),
  title: { default: "SmartNFC | Tarjetas NFC e identidad digital", template: "%s | SmartNFC" },
  description: "Tarjetas NFC, perfiles digitales y gestión de identidad profesional para empresas y negocios en Chile.",
  applicationName: "SmartNFC",
  authors: [{ name: "SmartNFC", url: "https://smartnfc.cl" }],
  creator: "SmartNFC",
  publisher: "SmartNFC",
  formatDetection: { email: false, address: false, telephone: false },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-CL" suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
