// Estado público neutral de un Punto Inteligente o Club no disponible (licencia, pausa o local inactivo).
// Nunca expone deuda, licencia ni datos administrativos; no responde 404 por un estado comercial.
export default function LocalInactiveState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-6 text-center">
      <p className="text-[15px] font-medium text-slate-600">Punto Inteligente temporalmente inactivo</p>
    </main>
  );
}
