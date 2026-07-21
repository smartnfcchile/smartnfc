"use client";

import React, { useEffect } from "react";

export default function ClubLandingError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Fallo crítico en el renderizado de la landing del club:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <meta name="robots" content="noindex, follow" />
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center space-y-4 max-w-md shadow-2xl">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-xl font-black text-white">No Disponible</h2>
        <p className="text-slate-300 text-sm leading-relaxed">
          No pudimos cargar esta experiencia. Inténtalo nuevamente.
        </p>
        <button
          onClick={() => reset()}
          className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
