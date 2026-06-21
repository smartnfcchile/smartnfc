import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../../../lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import FileInput from "../../../../components/FileInput";
import { updateCard, deleteLink, addLink } from "./actions";

type EditorPageProps = {
  params: Promise<{
    cardId: string;
  }>;
};

export default async function EditorPage({ params }: EditorPageProps) {
  const { cardId } = await params;

  // 1. Verificamos quién está conectado
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = (session.user as any).id;
  
  // 2. Buscamos la tarjeta específica con sus enlaces
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      links: {
        orderBy: { order: "asc" }
      }
    }
  });

  if (!card) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6">
          <div className="text-4xl">🔍</div>
          <h1 className="text-2xl font-bold text-white">Tarjeta no encontrada</h1>
          <p className="text-slate-400">La tarjeta de presentación que intentas editar no existe.</p>
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

  // 3. Validamos que pertenezca al usuario
  if (card.userId !== userId) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6">
          <div className="text-4xl">🚫</div>
          <h1 className="text-2xl font-bold text-red-500">Acceso Denegado</h1>
          <p className="text-slate-400">No tienes permisos para editar esta tarjeta de presentación.</p>
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

  // Determinar si debemos mostrar imágenes (en Vercel producción evitamos mostrar rutas locales rotas /uploads/...)
  const isProduction = process.env.NODE_ENV === "production";
  const showAvatar = card.avatarUrl && (!isProduction || card.avatarUrl.startsWith("http") || card.avatarUrl.startsWith("https"));
  const showLogo = card.logoUrl && (!isProduction || card.logoUrl.startsWith("http") || card.logoUrl.startsWith("https"));
  const showCover = card.coverUrl && (!isProduction || card.coverUrl.startsWith("http") || card.coverUrl.startsWith("https"));

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
        <form 
          key={card.updatedAt.toISOString()}
          action={updateCard} 
          encType="multipart/form-data" 
          className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6"
        >
          
          {/* Input oculto por seguridad para saber qué tarjeta editar */}
          <input type="hidden" name="cardId" value={card.id} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Campo: Foto de Perfil */}
            <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
              <label className="block text-sm font-medium text-slate-300">
                Foto de Perfil
              </label>
              <div className="flex items-center gap-4">
                {showAvatar ? (
                  <img 
                    src={card.avatarUrl!} 
                    alt="Avatar actual" 
                    className="w-16 h-16 rounded-full object-cover border border-slate-700 bg-slate-850"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs bg-slate-950">
                    Sin foto
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <FileInput
                    name="avatarFile"
                    accept="image/*"
                    className="block w-full text-xs text-slate-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-xs file:font-semibold
                      file:bg-blue-600 file:text-white
                      file:cursor-pointer hover:file:bg-blue-500
                      transition-all"
                  />
                  <input 
                    type="hidden" 
                    name="avatarUrl" 
                    value={card.avatarUrl || ""} 
                  />
                </div>
              </div>
            </div>

            {/* Campo: Logo Empresa */}
            <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
              <label className="block text-sm font-medium text-slate-300">
                Logo de Empresa
              </label>
              <div className="flex items-center gap-4">
                {showLogo ? (
                  <img 
                    src={card.logoUrl!} 
                    alt="Logo actual" 
                    className="h-16 max-w-28 object-contain border border-slate-700 p-1 bg-slate-850 rounded"
                  />
                ) : (
                  <div className="h-16 w-28 rounded border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs bg-slate-950">
                    Sin logo
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <FileInput
                    name="logoFile"
                    accept="image/*"
                    className="block w-full text-xs text-slate-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-xs file:font-semibold
                      file:bg-blue-600 file:text-white
                      file:cursor-pointer hover:file:bg-blue-500
                      transition-all"
                  />
                  <input 
                    type="hidden" 
                    name="logoUrl" 
                    value={card.logoUrl || ""} 
                  />
                </div>
              </div>
            </div>

            {/* Campo: Foto de Portada (Banner) */}
            <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-850 md:col-span-2">
              <label className="block text-sm font-medium text-slate-300">
                Foto de Portada (Banner)
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                {showCover ? (
                  <img 
                    src={card.coverUrl!} 
                    alt="Portada actual" 
                    className="h-20 w-full sm:w-44 object-cover border border-slate-700 bg-slate-850 rounded-lg"
                  />
                ) : (
                  <div className="h-20 w-full sm:w-44 rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs bg-slate-950">
                    Sin banner
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-center space-y-2">
                  <FileInput
                    name="coverFile"
                    accept="image/*"
                    className="block w-full text-xs text-slate-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-xs file:font-semibold
                      file:bg-blue-600 file:text-white
                      file:cursor-pointer hover:file:bg-blue-500
                      transition-all"
                  />
                  <input 
                    type="hidden" 
                    name="coverUrl" 
                    value={card.coverUrl || ""} 
                  />
                  <p className="text-[11px] text-slate-500">
                    Recomendado: Imagen horizontal (ej. 900x300 px) para un banner óptimo.
                  </p>
                </div>
              </div>
            </div>

            {/* Campo: WhatsApp */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">WhatsApp</label>
                <label className="inline-flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    name="showWhatsapp" 
                    defaultChecked={card.showWhatsapp}
                    className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  Mostrar
                </label>
              </div>
              <input
                type="text"
                name="whatsapp"
                defaultValue={card.whatsapp || ""}
                placeholder="56912345678"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Campo: Teléfono */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">Teléfono</label>
                <label className="inline-flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    name="showPhone" 
                    defaultChecked={card.showPhone}
                    className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  Mostrar
                </label>
              </div>
              <input
                type="text"
                name="phone"
                defaultValue={card.phone || ""}
                placeholder="56912345678"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Campo: Email */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">Email</label>
                <label className="inline-flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    name="showEmail" 
                    defaultChecked={card.showEmail}
                    className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  Mostrar
                </label>
              </div>
              <input 
                type="email" 
                name="email"
                defaultValue={card.email || ""}
                placeholder="agustin@smartnfc.cl"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Campo: LinkedIn */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">LinkedIn</label>
                <label className="inline-flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    name="showLinkedin" 
                    defaultChecked={card.showLinkedin}
                    className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  Mostrar
                </label>
              </div>
              <input 
                type="url" 
                name="linkedin"
                defaultValue={card.linkedin || ""}
                placeholder="https://www.linkedin.com/in/tu-perfil"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Campo: Instagram */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">Instagram</label>
                <label className="inline-flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    name="showInstagram" 
                    defaultChecked={card.showInstagram}
                    className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  Mostrar
                </label>
              </div>
              <input 
                type="url" 
                name="instagram"
                defaultValue={card.instagram || ""}
                placeholder="https://www.instagram.com/tu-usuario"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Campo: Facebook */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">Facebook</label>
                <label className="inline-flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    name="showFacebook" 
                    defaultChecked={card.showFacebook}
                    className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  Mostrar
                </label>
              </div>
              <input 
                type="url" 
                name="facebook"
                defaultValue={card.facebook || ""}
                placeholder="https://www.facebook.com/tu-pagina"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Campo: TikTok */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">TikTok</label>
                <label className="inline-flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    name="showTiktok" 
                    defaultChecked={card.showTiktok}
                    className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  Mostrar
                </label>
              </div>
              <input 
                type="url" 
                name="tiktok"
                defaultValue={card.tiktok || ""}
                placeholder="https://www.tiktok.com/@tu-usuario"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Campo: YouTube */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">YouTube</label>
                <label className="inline-flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    name="showYoutube" 
                    defaultChecked={card.showYoutube}
                    className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  Mostrar
                </label>
              </div>
              <input 
                type="url" 
                name="youtube"
                defaultValue={card.youtube || ""}
                placeholder="https://www.youtube.com/@tu-canal"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Campo: Nombre Público */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Nombre Público
              </label>
              <input
                type="text"
                name="profileName"
                defaultValue={card.profileName || ""}
                placeholder="Agustín Ignacio Jara Pradines"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Campo: Ubicación */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Ubicación
              </label>
              <input
                type="text"
                name="location"
                defaultValue={card.location || ""}
                placeholder="Valdivia, Chile"
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

            {/* Campo: Modo del Tema */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Modo de Diseño (Tema)</label>
              <select 
                name="themeMode"
                defaultValue={card.themeMode}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition cursor-pointer"
              >
                <option value="dark">Modo Oscuro Premium</option>
                <option value="light">Modo Claro Corporativo</option>
              </select>
            </div>

            {/* Campo: Selector de Plantilla - Corporate Elite & Personal Brand */}
            <div className="space-y-6 md:col-span-2 border-t border-slate-800/80 pt-6">
              
              {/* Categoría 1: Corporate Elite */}
              <div className="space-y-3">
                <div>
                  <label className="block text-base font-bold text-white mb-1">
                    Plantilla de Diseño: Corporate Elite
                  </label>
                  <p className="text-xs text-slate-400">
                    Selecciona una de las 5 variaciones de diseño de lujo disponibles para tu perfil.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                  
                  {/* Opción 1: corporate-1 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="corporate-1"
                      defaultChecked={card.template === "corporate-1" || !card.template}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">👑</span>
                    <span className="text-xs font-bold text-white">Elite Clásica</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Fondo oscuro con borde dorado y contornos elegantes.
                    </span>
                  </label>

                  {/* Opción 2: corporate-2 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="corporate-2"
                      defaultChecked={card.template === "corporate-2"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">🌀</span>
                    <span className="text-xs font-bold text-white">Curvas de Oro</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Líneas curvas orgánicas de fondo y un aro dorado alrededor del avatar.
                    </span>
                  </label>

                  {/* Opción 3: corporate-3 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="corporate-3"
                      defaultChecked={card.template === "corporate-3"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">💎</span>
                    <span className="text-xs font-bold text-white">Polígonos de Lujo</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Fondo poligonal geométrico en tonos oscuros y botón destacado.
                    </span>
                  </label>

                  {/* Opción 4: corporate-4 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="corporate-4"
                      defaultChecked={card.template === "corporate-4"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">🍦</span>
                    <span className="text-xs font-bold text-white">Crema y Oro</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Fondo claro y crema refinado, con acentos y textos en dorado oscuro.
                    </span>
                  </label>

                  {/* Opción 5: corporate-5 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="corporate-5"
                      defaultChecked={card.template === "corporate-5"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">🏙️</span>
                    <span className="text-xs font-bold text-white">Horizonte Elite</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Silueta nocturna de rascacielos iluminada por el color de tu marca.
                    </span>
                  </label>

                </div>
              </div>

              {/* Categoría 2: Personal Brand */}
              <div className="space-y-3 border-t border-slate-800/50 pt-6">
                <div>
                  <label className="block text-base font-bold text-white mb-1">
                    Plantilla de Diseño: Personal Brand
                  </label>
                  <p className="text-xs text-slate-400">
                    Diseños optimizados para consultores, coaches, creadores y freelancers.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">

                  {/* Opción 1: personal-1 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="personal-1"
                      defaultChecked={card.template === "personal-1"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">📝</span>
                    <span className="text-xs font-bold text-white">Minimalista Notion</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Diseño limpio en blanco y negro, con emojis y bordes definidos.
                    </span>
                  </label>

                  {/* Opción 2: personal-2 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="personal-2"
                      defaultChecked={card.template === "personal-2"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">⚡</span>
                    <span className="text-xs font-bold text-white">Vibrante Stripe</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Cabecera con degradado diagonal inclinado y colores vivos neon.
                    </span>
                  </label>

                  {/* Opción 3: personal-3 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="personal-3"
                      defaultChecked={card.template === "personal-3"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">💼</span>
                    <span className="text-xs font-bold text-white">LinkedIn Premium</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Cabecera profesional azul marino, detalles dorados y avatar destacado.
                    </span>
                  </label>

                  {/* Opción 4: personal-4 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="personal-4"
                      defaultChecked={card.template === "personal-4"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">🎨</span>
                    <span className="text-xs font-bold text-white">Tarjeta Creadora</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Enfoque visual en redes sociales y canales destacados arriba.
                    </span>
                  </label>

                  {/* Opción 5: personal-5 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="personal-5"
                      defaultChecked={card.template === "personal-5"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">☀️</span>
                    <span className="text-xs font-bold text-white">Coach Cálido</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Tonos terracotas y cremas, formas amigables y redondeado pronunciado.
                    </span>
                  </label>

                </div>
              </div>

              {/* Categoría 3: Comercial / Ventas */}
              <div className="space-y-3 border-t border-slate-800/50 pt-6">
                <div>
                  <label className="block text-base font-bold text-white mb-1">
                    Plantilla de Diseño: Comercial / Ventas
                  </label>
                  <p className="text-xs text-slate-400">
                    Diseños orientados a conseguir clientes, con botones grandes y contacto destacado.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">

                  {/* Opción 1: comercial-1 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="comercial-1"
                      defaultChecked={card.template === "comercial-1"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">🟢</span>
                    <span className="text-xs font-bold text-white">WhatsApp Pro</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Acento verde brillante, WhatsApp gigante y botones de acción rápida.
                    </span>
                  </label>

                  {/* Opción 2: comercial-2 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="comercial-2"
                      defaultChecked={card.template === "comercial-2"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">🏠</span>
                    <span className="text-xs font-bold text-white">Inmobiliaria Elegante</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Estilo corporativo inmobiliario. Acentos navy y dorado con botón "Cotizar ahora".
                    </span>
                  </label>

                  {/* Opción 3: comercial-3 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="comercial-3"
                      defaultChecked={card.template === "comercial-3"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">🚗</span>
                    <span className="text-xs font-bold text-white">Automotriz Dinámico</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Estilo audaz en gris carbón y rojo deportivo. Ideal para vendedores.
                    </span>
                  </label>

                  {/* Opción 4: comercial-4 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="comercial-4"
                      defaultChecked={card.template === "comercial-4"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">📅</span>
                    <span className="text-xs font-bold text-white">Agenda Express</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Diseño enfocado a reuniones. Botón de agendamiento destacado y colores índigo.
                    </span>
                  </label>

                  {/* Opción 5: comercial-5 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="comercial-5"
                      defaultChecked={card.template === "comercial-5"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">🛍️</span>
                    <span className="text-xs font-bold text-white">Catálogo Express</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Estilo e-commerce con llamada a la acción gigante para catálogo o tienda.
                    </span>
                  </label>

                </div>
              </div>

              {/* Categoría 4: Empresa / Catálogo */}
              <div className="space-y-3 border-t border-slate-800/50 pt-6">
                <div>
                  <label className="block text-base font-bold text-white mb-1">
                    Plantilla de Diseño: Empresa / Catálogo
                  </label>
                  <p className="text-xs text-slate-400">
                    Diseños institucionales donde la marca y el catálogo toman el rol principal.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">

                  {/* Opción 1: business-1 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="business-1"
                      defaultChecked={card.template === "business-1"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">🍷</span>
                    <span className="text-xs font-bold text-white">Restaurante / Gourmet</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Tonos terracota y bronce. Ideal para gastronomía, cafés o cartas.
                    </span>
                  </label>

                  {/* Opción 2: business-2 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="business-2"
                      defaultChecked={card.template === "business-2"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">🏗️</span>
                    <span className="text-xs font-bold text-white">Construcción / Obras</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Estilo industrial y robusto con colores amarillo y negro de alto impacto.
                    </span>
                  </label>

                  {/* Opción 3: business-3 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="business-3"
                      defaultChecked={card.template === "business-3"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">🩺</span>
                    <span className="text-xs font-bold text-white">Clínica / Salud</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Fondo claro, estética higiénica y azul clínico. Ideal para consultas médicas.
                    </span>
                  </label>

                  {/* Opción 4: business-4 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="business-4"
                      defaultChecked={card.template === "business-4"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">🏢</span>
                    <span className="text-xs font-bold text-white">Empresa Corporativa</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Diseño claro, limpio y minimalista. Perfecto para PYMEs e instituciones.
                    </span>
                  </label>

                  {/* Opción 5: business-5 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="business-5"
                      defaultChecked={card.template === "business-5"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">📔</span>
                    <span className="text-xs font-bold text-white">Catálogo de Marca</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Fondo oscuro con ribetes en oro y estructura limpia de servicios.
                    </span>
                  </label>

                </div>
              </div>

              {/* Categoría 5: Industrias Especializadas & Creadores */}
              <div className="space-y-3 border-t border-slate-800/50 pt-6">
                <div>
                  <label className="block text-base font-bold text-white mb-1">
                    Plantilla de Diseño: Industrias & Creadores
                  </label>
                  <p className="text-xs text-slate-400">
                    Diseños especializados para sectores industriales, educativos, eventos y startups.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">

                  {/* Opción 1: creator-1 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="creator-1"
                      defaultChecked={card.template === "creator-1"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">🚜</span>
                    <span className="text-xs font-bold text-white">Minería (MegaSSO)</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Estilo industrial corporativo con acentos naranja de alta visibilidad.
                    </span>
                  </label>

                  {/* Opción 2: creator-2 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="creator-2"
                      defaultChecked={card.template === "creator-2"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">☀️</span>
                    <span className="text-xs font-bold text-white">Energía Solar</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Estilo ecológico moderno con acentos verde bosque y amarillo solar.
                    </span>
                  </label>

                  {/* Opción 3: creator-3 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="creator-3"
                      defaultChecked={card.template === "creator-3"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">🎓</span>
                    <span className="text-xs font-bold text-white">Educación</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Diseño académico institucional ideal para profesores y capacitadores.
                    </span>
                  </label>

                  {/* Opción 4: creator-4 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="creator-4"
                      defaultChecked={card.template === "creator-4"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">🎟️</span>
                    <span className="text-xs font-bold text-white">Evento / Entrada</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Estilo moderno y vibrante para conferencias, conciertos y exposiciones.
                    </span>
                  </label>

                  {/* Opción 5: creator-5 */}
                  <label className="relative flex flex-col p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-slate-700 cursor-pointer transition select-none has-[input:checked]:border-blue-500 has-[input:checked]:bg-slate-950 has-[input:checked]:ring-1 has-[input:checked]:ring-blue-500">
                    <input
                      type="radio"
                      name="template"
                      value="creator-5"
                      defaultChecked={card.template === "creator-5"}
                      className="absolute top-3 right-3 text-blue-600 bg-slate-950 border-slate-800 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xl mb-1">🚀</span>
                    <span className="text-xs font-bold text-white">Startup / Pitch</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Diseño corporativo tecnológico con enfoque en propuesta de valor y demos.
                    </span>
                  </label>

                </div>
              </div>

            </div>

          </div>

          {/* SECCIÓN NUEVA: PERSONALIZACIÓN DE BANNER Y FOTO */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Personalización de Banner y Foto</h2>
              <p className="text-sm text-slate-400">Modifica el corte del banner superior y el estilo del marco de tu fotografía de perfil.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Estilo de Banner (Cortes SVG) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 block">Estilo del Banner (Corte Inferior)</label>
                <select
                  name="bannerStyle"
                  defaultValue={card.bannerStyle || "classic"}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition cursor-pointer"
                >
                  <option value="classic">Por Defecto del Molde (Recomendado)</option>
                  <option value="straight">Clásico Recto (Straight)</option>
                  <option value="arc">Arco de Oro (Restaurante style)</option>
                  <option value="wave">Ola Marina (Construcción/Clínica style)</option>
                  <option value="arch">Domo / Curva Inversa (Hotel style)</option>
                  <option value="diagonal">Corte Diagonal (Agencia style)</option>
                </select>
                <p className="text-[11px] text-slate-500">Determina cómo se recorta el final de tu imagen de portada.</p>
              </div>

              {/* Estilo de Foto (Marcos) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 block">Estilo de la Foto (Marco)</label>
                <select
                  name="photoStyle"
                  defaultValue={card.photoStyle || "circle"}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition cursor-pointer"
                >
                  <option value="circle">1. Círculo clásico</option>
                  <option value="rounded-square">2. Cuadrado redondeado</option>
                  <option value="hexagon">3. Hexágono</option>
                  <option value="diamond">4. Diamante</option>
                  <option value="shield">5. Escudo</option>
                  <option value="double-ring">6. Anillo doble</option>
                  <option value="neon">7. Neón</option>
                  <option value="crystal">8. Cristal</option>
                  <option value="glassmorphism">9. Glassmorphism</option>
                  <option value="gold-frame">10. Marco dorado</option>
                  <option value="silver-frame">11. Marco plateado</option>
                  <option value="premium-black">12. Marco negro premium</option>
                  <option value="no-frame">13. Foto sin marco</option>
                  <option value="shadow">14. Foto con sombra</option>
                  <option value="floating">15. Foto flotante</option>
                  <option value="polaroid">16. Tarjeta Polaroid</option>
                  <option value="slanted">17. Foto inclinada</option>
                  <option value="tech">18. Marco tecnológico</option>
                  <option value="futuristic">19. Marco futurista</option>
                  <option value="minimalist">20. Marco minimalista</option>
                  <option value="luxury">21. Marco Luxury</option>
                  <option value="corporate">22. Marco Corporate</option>
                  <option value="gamer">23. Marco Gamer</option>
                  <option value="industrial">24. Marco Industrial</option>
                  <option value="custom-ia">25. Marco Personalizado</option>
                </select>
                <p className="text-[11px] text-slate-500">Selecciona el diseño y borde de tu foto de perfil.</p>
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

        {/* Sección: Enlaces Personalizados (CardLinks) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6 mt-8">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Documentos y Enlaces Personalizados</h2>
            <p className="text-sm text-slate-400">Administra botones de enlaces adicionales en tu tarjeta pública (ej: catálogos, PDFs, portafolios).</p>
          </div>

          {/* Listado de Enlaces Actuales */}
          <div className="space-y-3">
            {card.links && card.links.length > 0 ? (
              card.links.map((link: any) => (
                <div key={link.id} className="flex items-center justify-between bg-slate-950 rounded-xl p-4 border border-slate-850">
                  <div className="space-y-1">
                    <div className="font-semibold text-white">{link.title}</div>
                    <div className="text-xs text-slate-500 truncate max-w-md">{link.url}</div>
                  </div>
                  <form action={deleteLink}>
                    <input type="hidden" name="linkId" value={link.id} />
                    <input type="hidden" name="cardId" value={card.id} />
                    <button
                      type="submit"
                      className="rounded-lg bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                    >
                      🗑️ Eliminar
                    </button>
                  </form>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-500 text-sm py-4 border border-dashed border-slate-800 rounded-xl">
                No tienes enlaces personalizados creados.
              </div>
            )}
          </div>

          {/* Formulario de Creación */}
          <form action={addLink} className="pt-6 border-t border-slate-800 space-y-4">
            <input type="hidden" name="cardId" value={card.id} />
            <h3 className="text-md font-semibold text-slate-300">Añadir Nuevo Enlace</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">Título del Botón</label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="Ej: Descargar Catálogo PDF"
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">URL de Destino</label>
                <input
                  type="url"
                  name="url"
                  required
                  placeholder="Ej: https://misitio.cl/catalogo.pdf"
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition shadow-lg shadow-blue-500/10 cursor-pointer"
              >
                ➕ Agregar Enlace
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
