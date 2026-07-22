import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../../../lib/prisma";
import Link from "next/link";
import { hasActiveProduct } from "../../../../lib/product-access";
import SubscribersClient from "./SubscribersClient";

export default async function SubscribersPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const user = session.user as { id: string; role: string; companyId: string };
  const isAdmin = user.role === "SUPERADMIN" || user.role === "COMPANY_OWNER" || user.role === "COMPANY_ADMIN";

  if (!isAdmin) {
    redirect("/dashboard");
  }

  // Verificar licencia de Smart NFC Local
  const hasLocal = await hasActiveProduct(user.companyId, "LOCAL");
  if (!hasLocal) {
    redirect("/dashboard/local");
  }

  // 1. Obtener campañas locales de la empresa
  const campaigns = await prisma.localCampaign.findMany({
    where: { companyId: user.companyId }
  });
  const campaignIds = campaigns.map(c => c.id);

  // 2. Obtener todos los suscriptores de estas campañas
  const subscribers = await prisma.localSubscriber.findMany({
    where: {
      campaignId: { in: campaignIds }
    },
    include: {
      campaign: true,
      consentRecords: { orderBy: { acceptedAt: "desc" } },
      exportItems: {
        include: {
          batch: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  // 3. Obtener todos los lotes de la empresa
  const batches = await prisma.localBroadcastExportBatch.findMany({
    where: { companyId: user.companyId },
    include: {
      campaign: true,
      createdByUser: true,
      items: {
        include: {
          subscriber: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  // 4. Obtener remociones físicas pendientes (completedAt is null) y completadas
  const removals = await prisma.localBroadcastRemoval.findMany({
    where: {
      subscriber: {
        campaignId: { in: campaignIds }
      }
    },
    include: {
      subscriber: {
        include: {
          campaign: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  // Serializar objetos para evitar problemas con campos Date en Client Components
  const serializedSubscribers = JSON.parse(JSON.stringify(subscribers));
  const serializedBatches = JSON.parse(JSON.stringify(batches));
  const serializedRemovals = JSON.parse(JSON.stringify(removals));
  const serializedCampaigns = campaigns.map(c => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-6">
      
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <Link href="/dashboard/local" className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline uppercase tracking-wider block">
            ← Volver a Smart Local
          </Link>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Difusión y Suscriptores</h1>
          <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">
            Gestión semiautomática de listas de difusión de WhatsApp y exportación de contactos.
          </p>
        </div>
      </div>

      {/* Panel interactivo del cliente */}
      <SubscribersClient
        initialSubscribers={serializedSubscribers}
        initialBatches={serializedBatches}
        initialRemovals={serializedRemovals}
        campaigns={serializedCampaigns}
      />

    </div>
  );
}
