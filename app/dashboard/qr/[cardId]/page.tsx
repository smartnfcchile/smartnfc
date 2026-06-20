import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "../../../../lib/prisma";
import { headers } from "next/headers";
import DownloadButton from "./DownloadButton";
import Link from "next/link";

interface PageProps {
  params: Promise<{
    cardId: string;
  }>;
}

export default async function QrPage({ params }: PageProps) {
  const { cardId } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userId = (session.user as any).id;

  const card = await prisma.card.findUnique({
    where: { id: cardId },
  });

  if (!card) {
    notFound();
  }

  if (card.userId !== userId) {
    redirect("/dashboard");
  }

  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const cardUrl = `${protocol}://${host}/c/${card.slug}`;
  
  // We request a high quality 500x500 QR code
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(cardUrl)}`;

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="max-w-md w-full space-y-8">
        
        {/* Enlace de Regreso */}
        <div className="flex justify-start">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition font-medium text-sm group"
          >
            <span className="transition-transform group-hover:-translate-x-1">←</span> Volver al Dashboard
          </Link>
        </div>

        {/* Tarjeta de Contenido QR con Glassmorphism */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
          {/* Efecto de luz de fondo sutil */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Encabezado */}
          <div className="text-center space-y-2 relative z-10">
            <span className="text-xs font-bold tracking-wider text-blue-400 uppercase bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
              Código QR Dinámico
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2">
              {card.name || "Sin nombre"}
            </h1>
            <p className="text-sm text-slate-400">
              Escanea o descarga este código para compartir tu perfil.
            </p>
          </div>

          {/* Contenedor del Código QR */}
          <div className="flex flex-col items-center justify-center bg-white p-6 rounded-2xl border border-slate-700 shadow-inner relative z-10 group transition-all duration-300 hover:scale-[1.02]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImageUrl}
              alt={`Código QR para ${card.name}`}
              width={250}
              height={250}
              className="w-64 h-64 select-none object-contain"
              draggable={false}
            />
          </div>

          {/* Dirección URL Destino */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 sm:p-4 text-center space-y-1 relative z-10">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
              Enlace de destino
            </span>
            <a
              href={cardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs sm:text-sm font-semibold text-blue-400 hover:text-blue-300 hover:underline transition break-all block"
            >
              {cardUrl}
            </a>
          </div>

          {/* Botón de Descarga Interactiva */}
          <div className="relative z-10 pt-2">
            <DownloadButton qrUrl={qrImageUrl} slug={card.slug} />
          </div>

          {/* Consejos Adicionales */}
          <div className="border-t border-slate-800/60 pt-6 space-y-3 relative z-10">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              💡 Consejos de Uso
            </h4>
            <ul className="text-xs text-slate-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-400">🖨️</span>
                <span><strong>Listo para Imprenta:</strong> Al ser de alta resolución (500x500 px), puedes imprimirlo en tarjetas de presentación, folletos o stands.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400">🔄</span>
                <span><strong>Enlace Inteligente:</strong> Si cambias la información de tu tarjeta en el editor, el QR seguirá funcionando sin necesidad de imprimirlo otra vez.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">📱</span>
                <span><strong>Prueba Rápida:</strong> Abre la cámara de tu teléfono móvil y apunta a la pantalla para verificar el redireccionamiento instantáneo.</span>
              </li>
            </ul>
          </div>
          
        </div>

      </div>
    </main>
  );
}
