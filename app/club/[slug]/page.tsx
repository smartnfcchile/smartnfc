import { notFound } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import ClubLandingClient from "./ClubLandingClient";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
};

// Generar metadata segura para SEO (Requisito E-8)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return { title: "No Disponible", robots: "noindex" };
  }

  const campaign = await prisma.localCampaign.findUnique({
    where: { slug },
    include: {
      company: {
        include: {
          productLicenses: {
            where: { product: "LOCAL" }
          }
        }
      }
    }
  });

  const localLicense = campaign?.company?.productLicenses?.[0];
  const now = new Date();
  const isExpired = localLicense?.expiresAt && localLicense.expiresAt <= now;
  const isFuture = localLicense?.startsAt && localLicense.startsAt > now;
  const isActive = localLicense?.status === "ACTIVE" && !isExpired && !isFuture;

  if (!campaign || campaign.status !== "PUBLISHED" || !campaign.publishedSnapshot || !isActive) {
    return {
      title: "No Disponible",
      robots: {
        index: false,
        follow: false
      }
    };
  }

  const snapshot = campaign.publishedSnapshot as any;
  const titleText = snapshot.clubName || snapshot.businessName || "Club de Beneficios";
  const descText = snapshot.subheadline || "Suscríbete y activa tu beneficio exclusivo.";

  return {
    title: titleText,
    description: descText,
    robots: {
      index: false, // noindex por defecto para protección inicial de campañas (Requisito E-9)
      follow: true
    }
  };
}

export default async function ClubLandingPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { ref } = await searchParams;

  // 1. Validar slug (Requisito E-1)
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    notFound();
  }

  // 2. Consultar campaña con su licencia de producto Local
  const campaign = await prisma.localCampaign.findUnique({
    where: { slug },
    include: {
      company: {
        include: {
          productLicenses: {
            where: { product: "LOCAL" }
          }
        }
      }
    }
  });

  // 3. Exigir status = PUBLISHED y publishedSnapshot no nulo (Requisitos E-3 y E-4)
  if (!campaign || campaign.status !== "PUBLISHED" || !campaign.publishedSnapshot) {
    notFound();
  }

  // 3.1. Validar que la licencia Local de la empresa esté activa (Requisito Parte G y Parte 5)
  const localLicense = campaign.company.productLicenses?.[0];
  const now = new Date();
  const isExpired = localLicense?.expiresAt && localLicense.expiresAt <= now;
  const isFuture = localLicense?.startsAt && localLicense.startsAt > now;
  const isActive = localLicense?.status === "ACTIVE" && !isExpired && !isFuture;

  if (!isActive) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-950/80 border border-slate-800 p-8 rounded-2xl text-center space-y-4 max-w-md shadow-2xl">
          <div className="text-4xl">🏪</div>
          <h2 className="text-xl font-black text-white">No Disponible</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Esta experiencia no se encuentra disponible.
          </p>
        </div>
      </main>
    );
  }

  // 4. Validar la estructura del JSON publicado (Requisito E-7)
  const snapshot = campaign.publishedSnapshot as any;
  if (!snapshot || typeof snapshot !== "object" || !snapshot.businessName || !snapshot.clubName || !snapshot.benefitTitle) {
    notFound();
  }

  // 5. Mapear datos seguros del snapshot para renderizado (Requisito E-5)
  const templateData = {
    logoUrl: snapshot.logoUrl,
    businessName: snapshot.businessName,
    clubName: snapshot.clubName,
    headline: snapshot.headline,
    subheadline: snapshot.subheadline,
    address: snapshot.address,
    primaryColor: snapshot.primaryColor,
    secondaryColor: snapshot.secondaryColor,
    benefitLabel: snapshot.benefitLabel,
    benefitTitle: snapshot.benefitTitle,
    benefitDescription: snapshot.benefitDescription,
    benefitConditions: snapshot.benefitConditions,
    consentText: snapshot.consentText,
    whatsappNumber: snapshot.whatsappNumber
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <ClubLandingClient
        slug={slug}
        touchpointCode={ref}
        initialData={templateData}
      />
    </main>
  );
}
