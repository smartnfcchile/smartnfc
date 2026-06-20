import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import Link from "next/link";

export default async function EditorRedirectPage() {
  // 1. Verificamos quién está conectado
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = (session.user as any).id;

  // 2. Buscamos su primera tarjeta
  const card = await prisma.card.findFirst({
    where: { userId: userId },
    select: { id: true }
  });

  // 3. Si no tiene tarjeta, mostrar aviso
  if (!card) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6">
          <div className="text-4xl">🎴</div>
          <h1 className="text-2xl font-bold text-white">Sin tarjetas asignadas</h1>
          <p className="text-slate-400">No tienes ninguna tarjeta asignada para editar actualmente.</p>
          <Link 
            href="/dashboard" 
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold transition w-full"
          >
            Volver al Dashboard
          </Link>
        </div>
      </main>
    );
  }

  // 4. Si tiene tarjeta, redirigir al editor dinámico de esa tarjeta
  redirect(`/dashboard/editor/${card.id}`);
}