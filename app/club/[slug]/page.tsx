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
    return { title: "Club de Beneficios" };
  }

  const campaign = await prisma.localCampaign.findUnique({
    where: { slug }
  });

  if (!campaign || campaign.status !== "PUBLISHED" || !campaign.publishedSnapshot) {
    return { title: "Club de Beneficios" };
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

  // 2. Consultar campaña exclusivamente por slug (Requisito E-2)
  const campaign = await prisma.localCampaign.findUnique({
    where: { slug }
  });

  // 3. Exigir status = PUBLISHED y publishedSnapshot no nulo (Requisitos E-3 y E-4)
  if (!campaign || campaign.status !== "PUBLISHED" || !campaign.publishedSnapshot) {
    notFound();
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
