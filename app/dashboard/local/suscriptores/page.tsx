import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../../../lib/prisma";
import Link from "next/link";
import { hasActiveProduct } from "../../../../lib/product-access";
import SubscribersClient from "./SubscribersClient";
import { SubscriberDashboardDto, BatchDashboardDto, RemovalDashboardDto } from "./types";

function maskWhatsApp(phone: string) {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d]/g, "");
  if (cleaned.length < 6) return "****";
  return `+${cleaned.substring(0, cleaned.length - 4)} ****`;
}

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
    where: { companyId: user.companyId },
    select: { id: true, name: true }
  });
  const campaignIds = campaigns.map(c => c.id);

  // 2. Obtener todos los suscriptores de estas campañas usando select explícito
  const subscribers = await prisma.localSubscriber.findMany({
    where: {
      campaignId: { in: campaignIds }
    },
    select: {
      id: true,
      name: true,
      whatsapp: true, // Necesario en servidor para mask, no enviado a navegador
      status: true,
      createdAt: true,
      firstSubscribedAt: true,
      lastSubscribedAt: true,
      campaign: {
        select: {
          id: true,
          name: true
        }
      },
      consentRecords: {
        orderBy: { acceptedAt: "desc" },
        take: 1,
        select: {
          id: true,
          acceptedAt: true
        }
      },
      exportItems: {
        select: {
          id: true,
          batchId: true,
          consentRecordId: true,
          batch: {
            select: {
              id: true,
              status: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  // 3. Obtener todos los lotes de la empresa usando select explícito
  const batches = await prisma.localBroadcastExportBatch.findMany({
    where: { companyId: user.companyId },
    select: {
      id: true,
      createdAt: true,
      status: true,
      campaignId: true,
      campaign: {
        select: {
          name: true
        }
      },
      createdByUser: {
        select: {
          name: true
        }
      },
      items: {
        select: {
          id: true,
          subscriber: {
            select: {
              name: true,
              whatsapp: true // Necesario en servidor para mask, no enviado a navegador
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  // 4. Obtener remociones físicas usando select explícito
  const removals = await prisma.localBroadcastRemoval.findMany({
    where: {
      subscriber: {
        campaignId: { in: campaignIds }
      }
    },
    select: {
      id: true,
      createdAt: true,
      reason: true,
      completedAt: true,
      subscriber: {
        select: {
          id: true,
          name: true,
          whatsapp: true, // Necesario en servidor para mask, no enviado a navegador
          campaign: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  // 5. Mapear DTOs explícitos limpios de PII (whatsapp, ipHash, userAgent, consentText, companyId)
  const serializedSubscribers: SubscriberDashboardDto[] = subscribers.map(sub => ({
    id: sub.id,
    name: sub.name,
    whatsappMasked: maskWhatsApp(sub.whatsapp),
    status: sub.status,
    createdAt: sub.createdAt.toISOString(),
    firstSubscribedAt: sub.firstSubscribedAt.toISOString(),
    lastSubscribedAt: sub.lastSubscribedAt ? sub.lastSubscribedAt.toISOString() : null,
    campaign: {
      id: sub.campaign.id,
      name: sub.campaign.name
    },
    consentRecords: sub.consentRecords.map(cr => ({
      id: cr.id,
      acceptedAt: cr.acceptedAt.toISOString()
    })),
    exportItems: sub.exportItems.map(ei => ({
      id: ei.id,
      batchId: ei.batchId,
      consentRecordId: ei.consentRecordId,
      batch: {
        id: ei.batch.id,
        status: ei.batch.status
      }
    }))
  }));

  const serializedBatches: BatchDashboardDto[] = batches.map(batch => ({
    id: batch.id,
    createdAt: batch.createdAt.toISOString(),
    status: batch.status,
    campaignId: batch.campaignId,
    campaign: batch.campaign ? { name: batch.campaign.name } : null,
    createdByUser: batch.createdByUser ? { name: batch.createdByUser.name || "Usuario" } : null,
    items: batch.items.map(item => ({
      id: item.id,
      subscriber: {
        name: item.subscriber.name,
        whatsappMasked: maskWhatsApp(item.subscriber.whatsapp)
      }
    }))
  }));

  const serializedRemovals: RemovalDashboardDto[] = removals.map(rem => ({
    id: rem.id,
    createdAt: rem.createdAt.toISOString(),
    reason: rem.reason,
    completedAt: rem.completedAt ? rem.completedAt.toISOString() : null,
    subscriber: {
      id: rem.subscriber.id,
      name: rem.subscriber.name,
      whatsappMasked: maskWhatsApp(rem.subscriber.whatsapp),
      campaign: {
        name: rem.subscriber.campaign.name
      }
    }
  }));

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
