"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Evita que la página recargue al enviar el formulario
    setLoading(true);
    setError("");

    // Llamamos al "portero" (NextAuth) con las credenciales
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Credenciales incorrectas. Revisa tu correo y contraseña.");
      setLoading(false);
    } else {
      // Si todo sale bien, lo enviamos a su panel de control (que crearemos después)
      router.push("/dashboard");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white p-6">
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-800">
        
        <h1 className="text-3xl font-extrabold text-center mb-2">Bienvenido</h1>
        <p className="text-slate-400 text-center mb-8">Ingresa a tu cuenta de NFC Smart Cards</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg bg-slate-950 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-white transition-all"
              placeholder="admin@nfc.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg bg-slate-950 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-white transition-all"
              placeholder="********"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? "Verificando..." : "Entrar al Sistema"}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-sm text-slate-400 hover:text-white transition font-medium"
          >
            ← Volver al inicio
          </Link>
        </div>

      </div>
    </main>
  );
}