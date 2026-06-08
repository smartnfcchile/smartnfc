export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-6">
      <div className="max-w-3xl text-center space-y-8">
        
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          NFC Smart Cards Pro
        </h1>
        
        <p className="text-xl text-slate-300">
          El futuro de las tarjetas de presentación es digital. Crea, gestiona y mide tus tarjetas NFC en un solo lugar.
        </p>
        
        <div className="flex gap-4 justify-center pt-8">
          <button className="rounded-full bg-blue-600 px-8 py-3 font-semibold text-white hover:bg-blue-500 transition-colors">
            Iniciar Sesión
          </button>
          <button className="rounded-full border border-slate-700 px-8 py-3 font-semibold text-slate-300 hover:bg-slate-800 transition-colors">
            Ver Demo
          </button>
        </div>

      </div>
    </main>
  );
}