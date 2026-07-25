import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../../../lib/prisma";
import Link from "next/link";
import { updateCard, deleteLink, addLink } from "./actions";
import { getProductLicense, isLicenseValid } from "../../../../lib/product-access";
import CardEditorClient from "./CardEditorClient";

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

  const user = session.user as any;

  if (user.role !== "SUPERADMIN") {
    const license = await getProductLicense(user.companyId, "EMPRESAS");
    if (!isLicenseValid(license)) {
      redirect("/dashboard/local");
    }
  }

  // 2. Buscamos la tarjeta específica con sus enlaces y compañía
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      links: {
        orderBy: { order: "asc" }
      },
      company: true,
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

  // 3. Validamos rol de administrador y pertenencia de empresa
  const userRole = (session.user as any).role;
  const companyId = (session.user as any).companyId;
  const isAdmin = userRole === "SUPERADMIN" || userRole === "COMPANY_OWNER" || userRole === "COMPANY_ADMIN";

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6">
          <div className="text-4xl">🚫</div>
          <h1 className="text-2xl font-bold text-red-500">Acceso Denegado</h1>
          <p className="text-slate-400">
            Solo los administradores autorizados de la empresa pueden configurar o editar los perfiles de las tarjetas virtuales.
          </p>
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

  if (userRole !== "SUPERADMIN" && card.companyId !== companyId) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6">
          <div className="text-4xl">🚫</div>
          <h1 className="text-2xl font-bold text-red-500">Acceso Denegado</h1>
          <p className="text-slate-400">
            No tienes permisos para configurar tarjetas pertenecientes a otra empresa.
          </p>
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

  return (
    <CardEditorClient 
      card={card as any} 
      updateCardAction={updateCard}
      addLinkAction={addLink}
      deleteLinkAction={deleteLink}
    />
  );
}
