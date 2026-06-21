"use client";

import React, { useState } from "react";
import { upload } from "@vercel/blob/client";

type FileInputProps = {
  name: string;
  urlName: string;
  initialUrl?: string | null;
  accept?: string;
  className?: string;
  type: "avatar" | "logo" | "cover";
};

export default function FileInput({
  name,
  urlName,
  initialUrl,
  accept,
  className,
  type,
}: FileInputProps) {
  const [url, setUrl] = useState<string>(initialUrl || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validación client-side de límite de tamaño (4MB)
    if (file.size > 4 * 1024 * 1024) {
      alert(
        `¡Imagen demasiado grande! El archivo "${file.name}" pesa ${(file.size / (1024 * 1024)).toFixed(
          2
        )} MB. El límite máximo de subida es de 4 MB para garantizar un rendimiento óptimo. Por favor, comprime la imagen o usa otra más liviana.`
      );
      e.target.value = ""; // Resetea el input
      return;
    }

    try {
      setUploading(true);
      setError("");

      // Subida directa al Vercel Blob Store (Bypasseando el servidor Next.js para evitar el error 413)
      const newBlob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
      });

      setUrl(newBlob.url);
    } catch (err: any) {
      console.error("Error al subir archivo a Vercel Blob:", err);
      const errorMessage = err?.message || String(err);
      setError(`Error al subir imagen: ${errorMessage}`);
      alert(`Hubo un error al subir la imagen: ${errorMessage}\n\nAsegúrate de tener Vercel Blob configurado.`);
      e.target.value = ""; // Resetea el input
    } finally {
      setUploading(false);
    }
  };

  // Renderizado del componente visual de la imagen actual
  const renderPreview = () => {
    if (uploading) {
      return (
        <div className={`flex items-center justify-center bg-slate-900 border border-slate-800 rounded-lg text-xs text-blue-400 font-semibold animate-pulse ${
          type === "avatar" ? "w-16 h-16 rounded-full" :
          type === "logo" ? "h-16 w-28" : "h-20 w-full sm:w-44"
        }`}>
          Subiendo...
        </div>
      );
    }

    if (url) {
      if (type === "avatar") {
        return (
          <img
            src={url}
            alt="Avatar actual"
            className="w-16 h-16 rounded-full object-cover border border-slate-700 bg-slate-850"
          />
        );
      } else if (type === "logo") {
        return (
          <img
            src={url}
            alt="Logo actual"
            className="h-16 max-w-28 object-contain border border-slate-700 p-1 bg-slate-850 rounded"
          />
        );
      } else {
        return (
          <img
            src={url}
            alt="Portada actual"
            className="h-20 w-full sm:w-44 object-cover border border-slate-700 bg-slate-850 rounded-lg"
          />
        );
      }
    }

    // Marcadores cuando no hay imagen
    if (type === "avatar") {
      return (
        <div className="w-16 h-16 rounded-full border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs bg-slate-950 select-none">
          Sin foto
        </div>
      );
    } else if (type === "logo") {
      return (
        <div className="h-16 w-28 rounded border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs bg-slate-950 select-none">
          Sin logo
        </div>
      );
    } else {
      return (
        <div className="h-20 w-full sm:w-44 rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs bg-slate-950 select-none">
          Sin banner
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
      {renderPreview()}
      <div className="flex-1 space-y-2">
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          disabled={uploading}
          className="block w-full text-xs text-slate-400
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-xs file:font-semibold
            file:bg-blue-600 file:text-white
            file:cursor-pointer hover:file:bg-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all"
        />
        {/* Input oculto que registra la URL subida y se envía en el Formulario */}
        <input type="hidden" name={urlName} value={url} />
        {error && <p className="text-[10px] text-red-500 font-medium">{error}</p>}
      </div>
    </div>
  );
}
