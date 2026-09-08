import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../../../lib/prisma";
import Link from "next/link";
import { updateCard, deleteLink, addLink } from "./actions";
import { getProductLicense, isLicenseValid } from "../../../../lib/product-access";
import {
  getCompanyProfileEditPolicy,
  resolveProfileEditScope,
} from "../../../../lib/profile-edit-policy";
import CardEditorClient from "./CardEditorClient";

type EditorPageProps = {
  params: Promise<{
    cardId: string;
  }>;
};

export default async function EditorPage({ params }: EditorPageProps) {
  const { cardId } = await params;

  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as any;

  if (user.role !== "SUPERADMIN") {
    const license = await getProductLicense(user.companyId, "EMPRESAS");
    if (!isLicenseValid(license)) {
      redirect("/dashboard/local");
    }
  }

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      links: {
        orderBy: { order: "asc" },
      },
      company: true,
    },
  });

  if (!card) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6">
          <div className="text-4xl">🔍</div>
          <h1 className="text-2xl font-bold text-white">Tarjeta no encontrada</h1>
          <p className="text-slate-400">La tarjeta de presentación que intentas editar no existe.</p>
          <Link href="/dashboard" className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold transition w-full">
            Volver al Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const userRole = (session.user as any).role;
  const companyId = (session.user as any).companyId;

  if (userRole === "SUPERADMIN") {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6">
          <div className="text-4xl">🛡️</div>
          <h1 className="text-2xl font-bold text-white">Perfil protegido</h1>
          <p className="text-slate-400">
            Puedes administrar la asignación y el estado de esta tarjeta, pero los datos del perfil solo pueden ser editados por la empresa propietaria.
          </p>
          <Link href="/superadmin/tarjetas" className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold transition w-full">
            Volver a Tarjetas
          </Link>
        </div>
      </main>
    );
  }

  if (card.companyId !== companyId) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6">
          <div className="text-4xl">🚫</div>
          <h1 className="text-2xl font-bold text-red-500">Acceso Denegado</h1>
          <p className="text-slate-400">No tienes permisos para configurar tarjetas pertenecientes a otra empresa.</p>
          <Link href="/dashboard" className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold transition w-full">
            Volver al Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const policy = await getCompanyProfileEditPolicy(card.companyId);
  const editScope = resolveProfileEditScope({
    userRole,
    userId: user.id,
    userCompanyId: companyId,
    cardUserId: card.userId,
    cardCompanyId: card.companyId,
    policy,
  });

  if (editScope === "NONE") {
    const isOwnCard = card.userId === user.id;
    const adminOnlyOwnCard = policy === "ADMIN_ONLY" && isOwnCard;

    return (
      <main className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6">
          <div className="text-4xl">🔒</div>
          <h1 className="text-2xl font-bold text-white">
            {adminOnlyOwnCard ? "Tarjeta administrada por tu empresa" : "Acceso Denegado"}
          </h1>
          <p className="text-slate-400 leading-6">
            {adminOnlyOwnCard
              ? "Tu empresa definió que las tarjetas sean configuradas exclusivamente por sus administradores. Puedes seguir utilizando y compartiendo tu tarjeta, pero sus cambios deben ser gestionados por un administrador de la organización."
              : "No tienes permisos para editar esta tarjeta."}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {isOwnCard && (
              <a href={`/c/${card.slug}`} target="_blank" rel="noopener noreferrer" className="inline-block bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-xl font-bold transition">
                Ver mi tarjeta
              </a>
            )}
            <Link href="/dashboard" className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold transition">
              Volver al Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {editScope === "PERSONAL_ONLY" && (
        <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-amber-100">
            <p className="text-sm font-bold">Identidad corporativa protegida por tu empresa</p>
            <p className="mt-1 text-xs leading-5 text-amber-100/80">
              Puedes actualizar tus datos personales, profesionales, de contacto, redes, enlaces y captura CRM. El diseño, las imágenes y la identidad corporativa son administrados por tu empresa y cualquier intento de modificarlos será rechazado por el servidor.
            </p>
          </div>
        </div>
      )}
      <CardEditorClient
        card={card as any}
        updateCardAction={updateCard}
        addLinkAction={addLink}
        deleteLinkAction={deleteLink}
      />
    </div>
  );
}
