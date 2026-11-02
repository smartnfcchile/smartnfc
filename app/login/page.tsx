"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import SmartNFCLogo from "../../components/brand/SmartNFCLogo";
import { loginNoticesFromParams, type LoginNotices } from "../../lib/login-notices";

// Los avisos (?error=suspended, ?activated=true, ?reset=true) se leen con useSearchParams dentro de un
// Suspense: así aparecen al cargar la URL directamente y tras router.push(), sin error de hidratación
// (BUG-E2E-1). El fallback, prerenderizado en el servidor, es el mismo formulario sin avisos.
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginView notices={{ error: "", success: "" }} />}>
      <LoginWithNotices />
    </Suspense>
  );
}

function LoginWithNotices() {
  const searchParams = useSearchParams();
  const notices = loginNoticesFromParams(searchParams);
  // key: si los avisos cambian sin desmontar la página, el estado inicial se recalcula.
  return <LoginView key={`${notices.error}|${notices.success}`} notices={notices} />;
}

function LoginView({ notices }: { notices: LoginNotices }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(notices.error);
  const [successMessage, setSuccessMessage] = useState(notices.success);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Credenciales incorrectas. Revisa tu correo y contraseña.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-[#07101F] text-slate-900 dark:text-white p-6 transition-colors duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800/80">
        
        {/* Logotipo oficial */}
        <div className="flex justify-center mb-6">
          <SmartNFCLogo size={32} variant="default" className="dark:hidden" />
          <SmartNFCLogo size={32} variant="dark" className="hidden dark:flex" />
        </div>

        <h1 className="text-2xl font-black text-center mb-1 tracking-tight">Acceso al Sistema</h1>
        <p className="text-slate-500 dark:text-slate-400 text-center mb-6 text-xs font-medium">Ingresa a tu cuenta corporativa de SmartNFC</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 dark:text-red-400 p-3 rounded-xl mb-6 text-xs text-center font-semibold">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl mb-6 text-xs text-center font-semibold">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 mb-1.5">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none text-slate-900 dark:text-white transition-all text-xs font-medium"
              placeholder="correo@empresa.com"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-350">Contraseña</label>
              <Link href="/olvide-mi-contrasena" className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none text-slate-900 dark:text-white transition-all text-xs font-medium"
              placeholder="********"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 mt-4 shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 text-xs tracking-wide cursor-pointer"
          >
            {loading ? "Verificando..." : "Entrar al Sistema"}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition font-bold"
          >
            ← Volver al inicio
          </Link>
        </div>

      </div>
    </main>
  );
}