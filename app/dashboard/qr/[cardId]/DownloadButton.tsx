"use client";

import { useState } from "react";

interface DownloadButtonProps {
  qrUrl: string;
  slug: string;
}

export default function DownloadButton({ qrUrl, slug }: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (downloading) return;
    try {
      setDownloading(true);
      const response = await fetch(qrUrl);
      if (!response.ok) throw new Error("Failed to fetch image");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${slug}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error al descargar el código QR:", err);
      alert("Hubo un error al intentar descargar el código QR. Por favor, intenta de nuevo o haz clic derecho sobre la imagen para guardarla.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg shadow-blue-500/20 cursor-pointer text-center flex items-center justify-center gap-2"
    >
      {downloading ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Procesando descarga...
        </>
      ) : (
        <>
          📥 Descargar Código QR (PNG)
        </>
      )}
    </button>
  );
}
