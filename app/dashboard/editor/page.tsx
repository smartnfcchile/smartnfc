import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";

export default async function EditorPage() {
  // 1. Verificamos quién está conectado
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = (session.user as any).id;
  
  // 2. Buscamos su tarjeta
  const card = await prisma.card.findFirst({
    where: { userId: userId }
  });

  if (!card) {
    return <div className="p-8 text-white">No tienes una tarjeta asignada aún.</div>;
  }

  // 3. EL MOTOR DE GUARDADO (Server Action)
  async function updateCard(formData: FormData) {
    "use server";
    
    await prisma.card.update({
      where: { id: formData.get("cardId") as string },
      data: {
        profileName: formData.get("profileName") as string,
        role: formData.get("role") as string,
        companyName: formData.get("companyName") as string,
        bio: formData.get("bio") as string,
        themeColor: formData.get("themeColor") as string,
      }
    });

    // Refrescamos la página para ver los cambios instantáneamente
    revalidatePath("/dashboard/editor");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Cabecera y Navegación */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Editor de Tarjeta</h1>
            <p className="text-slate-400">Personaliza la apariencia pública de tu perfil NFC.</p>
          </div>
          <Link 
            href="/dashboard" 
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm transition font-medium"
          >
            ← Volver a Métricas
          </Link>
        </div>

        {/* Formulario de Configuración */}
        <form action={updateCard} className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
          
          {/* Input oculto por seguridad para saber qué tarjeta editar */}
          <input type="hidden" name="cardId" value={card.id} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Campo: Nombre */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Nombre Público</label>
              <input 
                type="text" 
                name="profileName"
                defaultValue={card.profileName || ""}
                placeholder="Ej: Ariel Jara"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Campo: Cargo */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Cargo / Posición</label>
              <input 
                type="text" 
                name="role"
                defaultValue={card.role || ""}
                placeholder="Ej: Product Manager"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Campo: Empresa */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Nombre de la Empresa</label>
              <input 
                type="text" 
                name="companyName"
                defaultValue={card.companyName || ""}
                placeholder="Ej: MegaSSO"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Campo: Color del Tema */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Color Principal (Marca)</label>
              <div className="flex items-center gap-4 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2">
                <input 
                  type="color" 
                  name="themeColor"
                  defaultValue={card.themeColor}
                  className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                />
                <span className="text-slate-400 font-mono">{card.themeColor}</span>
              </div>
            </div>

          </div>

          {/* Campo: Biografía */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Biografía / Descripción corta</label>
            <textarea 
              name="bio"
              defaultValue={card.bio || ""}
              placeholder="Ej: Ayudo a las empresas a digitalizar sus procesos..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition resize-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition shadow-lg shadow-blue-500/20"
            >
              Guardar Cambios
            </button>
          </div>

        </form>
      </div>
    </main>
  );
}