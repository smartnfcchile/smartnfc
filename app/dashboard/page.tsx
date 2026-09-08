import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../lib/prisma";
import Link from "next/link";
import { getProductLicense, isLicenseValid } from "../../lib/product-access";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as any;
  if (user.role !== "SUPERADMIN") {
    const empresasLicense = await getProductLicense(user.companyId, "EMPRESAS");
    const localLicense = await getProductLicense(user.companyId, "LOCAL");
    if (!isLicenseValid(empresasLicense) && isLicenseValid(localLicense)) redirect("/dashboard/local");
  }

  const isAdmin = user.role === "SUPERADMIN" || user.role === "COMPANY_OWNER" || user.role === "COMPANY_ADMIN";
  const cards = await prisma.card.findMany({
    where: isAdmin ? { companyId: user.companyId } : { userId: user.id },
    select: { id: true, name: true, slug: true, isActive: true },
  });
  const myCard = user.role === "SUPERADMIN" ? null : await prisma.card.findFirst({
    where: { userId: user.id, companyId: user.companyId },
    select: { id: true, slug: true, profileName: true, avatarUrl: true, role: true, phone: true, email: true },
    orderBy: { createdAt: "asc" },
  });
  const profileComplete = Boolean(myCard?.profileName && myCard?.role && (myCard?.phone || myCard?.email));
  const usersCount = isAdmin ? await prisma.user.count({ where: { companyId: user.companyId } }) : 1;
  const leadsCount = await prisma.lead.count({ where: isAdmin ? { card: { companyId: user.companyId } } : { card: { userId: user.id } } });

  return <div className="space-y-8">
    <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-slate-500/10 dark:from-blue-900/40 dark:via-indigo-900/20 dark:to-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
      <div className="relative z-10 space-y-2"><span className="text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-widest">{isAdmin ? "Panel de Administración" : "Panel de Colaborador"}</span><h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">¡Hola, {user.name || "Usuario"}! 👋</h1><p className="text-slate-500 dark:text-slate-400 max-w-2xl text-xs sm:text-sm">{isAdmin ? "Gestiona integrantes, tarjetas, prospectos y analítica de tu empresa. Tu rol administrativo es independiente de tu propia tarjeta SmartNFC." : "Configura tu tarjeta digital, revisa sus interacciones y gestiona tus prospectos."}</p></div>
    </div>

    {myCard && !profileComplete && <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-5 sm:flex sm:items-center sm:justify-between sm:gap-5"><div><p className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Tu tarjeta está creada</p><h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">Completa tu perfil digital</h2><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Agrega tu cargo y al menos un dato de contacto para dejar tu tarjeta lista para compartir.</p></div><Link href="/dashboard/mi-tarjeta" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-xs font-black text-white sm:mt-0">Configurar mi tarjeta</Link></div>}

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {myCard ? <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm"><span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Mi Tarjeta SmartNFC</span><p className="mt-2 text-lg font-black text-slate-900 dark:text-white">{profileComplete ? "Perfil configurado ✓" : "Perfil pendiente"}</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/dashboard/mi-tarjeta" className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white">{profileComplete ? "Editar mi tarjeta" : "Configurar perfil"}</Link><Link href={`/c/${myCard.slug}`} target="_blank" className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200">Ver tarjeta</Link></div></div> : <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm"><span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tarjetas Virtuales</span><div className="mt-2"><span className="text-3xl font-black text-slate-900 dark:text-white">{cards.length}</span><span className="ml-2 text-xs text-slate-500">registradas</span></div></div>}
      {isAdmin && <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm"><span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Integrantes</span><div className="mt-2"><span className="text-3xl font-black text-slate-900 dark:text-white">{usersCount}</span><span className="ml-2 text-xs text-slate-500">usuarios</span></div></div>}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm"><span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Prospectos (CRM)</span><div className="mt-2"><span className="text-3xl font-black text-slate-900 dark:text-white">{leadsCount}</span><span className="ml-2 text-xs text-slate-500">leads capturados</span></div></div>
    </div>

    <div className="space-y-4"><h2 className="text-base font-bold text-slate-800 dark:text-slate-300">Accesos Directos</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {myCard && <Link href="/dashboard/mi-tarjeta" className="group bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl flex gap-5"><div className="text-2xl">🎴</div><div><h3 className="font-bold text-slate-900 dark:text-white">Mi Tarjeta</h3><p className="text-slate-500 text-xs">Edita tu información profesional, contacto, redes y presentación pública.</p></div></Link>}
      <Link href="/dashboard/metrics" className="group bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl flex gap-5"><div className="text-2xl">📊</div><div><h3 className="font-bold text-slate-900 dark:text-white">Métricas y Analíticas</h3><p className="text-slate-500 text-xs">{isAdmin ? "Revisa el rendimiento consolidado de las tarjetas de la empresa." : "Visualiza las estadísticas de tu tarjeta."}</p></div></Link>
      <Link href="/dashboard/leads" className="group bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl flex gap-5"><div className="text-2xl">💰</div><div><h3 className="font-bold text-slate-900 dark:text-white">Prospectos (CRM)</h3><p className="text-slate-500 text-xs">Gestiona los contactos capturados desde las tarjetas SmartNFC.</p></div></Link>
      {isAdmin && <Link href="/dashboard/users" className="group bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl flex gap-5"><div className="text-2xl">👥</div><div><h3 className="font-bold text-slate-900 dark:text-white">Gestionar Integrantes</h3><p className="text-slate-500 text-xs">Invita colaboradores y solicita automáticamente su tarjeta SmartNFC.</p></div></Link>}
      {isAdmin && <Link href="/dashboard/cards" className="group bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl flex gap-5"><div className="text-2xl">🗂️</div><div><h3 className="font-bold text-slate-900 dark:text-white">Tarjetas de la empresa</h3><p className="text-slate-500 text-xs">Consulta las tarjetas asociadas a los integrantes de tu organización.</p></div></Link>}
      {!isAdmin && myCard && <Link href={`/dashboard/qr/${myCard.id}`} className="group bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl flex gap-5"><div className="text-2xl">📷</div><div><h3 className="font-bold text-slate-900 dark:text-white">Mi Código QR</h3><p className="text-slate-500 text-xs">Visualiza y descarga tu QR corporativo.</p></div></Link>}
    </div></div>
  </div>;
}
