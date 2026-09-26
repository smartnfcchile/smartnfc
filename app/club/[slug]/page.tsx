import { hasCapability } from "../../../lib/entitlements";
import { findLocalVisit } from "../../../lib/local/tracking";
import { signConsent } from "../../../lib/local/consent";
import { notFound } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import ClubLandingClient from "./ClubLandingClient";
import LocalInactiveState from "../../../components/local/public/LocalInactiveState";
import { isPublicHttpsUrl, resolveLocalBrand } from "../../../lib/local/brand";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string; v?: string }>;
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
      localLocation: true,
      company: {
        include: {
          productLicenses: {
            where: { product: "LOCAL" }
          }
        }
      }
    }
  });

  const isActive = campaign?.company.isActive && (!campaign.localLocation || campaign.localLocation.isActive) && await hasCapability(campaign.companyId, "LOCAL_CLUB");

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
  const { ref, v } = await searchParams;

  // 1. Validar slug (Requisito E-1)
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    notFound();
  }

  // 2. Consultar campaña con su licencia de producto Local
  const campaign = await prisma.localCampaign.findUnique({
    where: { slug },
    include: {
      localLocation: true,
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
  const isActive = campaign?.company.isActive && (!campaign.localLocation || campaign.localLocation.isActive) && await hasCapability(campaign.companyId, "LOCAL_CLUB");

  if (!isActive) return <LocalInactiveState />;

  // 4. Validar la estructura del JSON publicado (Requisito E-7)
  const snapshot = campaign.publishedSnapshot as any;
  if (!snapshot || typeof snapshot !== "object" || !snapshot.businessName || !snapshot.clubName || !snapshot.benefitTitle) {
    notFound();
  }

  // 5. Mapear datos seguros del snapshot para renderizado (Requisito E-5).
  // El Club conserva su identidad publicada como override; la Identidad del Local solo completa
  // logo, portada y dirección que el Club no definió (nunca el nombre interno del local).
  const local = campaign.localLocation ? resolveLocalBrand({ location: campaign.localLocation }) : null;
  const localImage = (value: string | null | undefined) => (value && isPublicHttpsUrl(value) ? value : null);
  const templateData = {
    logoUrl: snapshot.logoUrl || localImage(local?.logoUrl),
    heroImageUrl: snapshot.heroImageUrl || localImage(local?.coverImageUrl),
    businessName: snapshot.businessName,
    clubName: snapshot.clubName,
    headline: snapshot.headline,
    subheadline: snapshot.subheadline,
    address: snapshot.address || local?.address || null,
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
    <main
      style={{
        background: `radial-gradient(circle at 15% 10%, ${snapshot.primaryColor}20, transparent 34%), radial-gradient(circle at 90% 90%, ${snapshot.secondaryColor}22, transparent 32%), #f8fafc`
      }}
      className="min-h-screen flex items-center justify-center p-4 sm:py-8"
    >
      <ClubLandingClient
        slug={slug}
        initialVisitId={(await findLocalVisit(v, campaign.id))?.id}
        consentToken={signConsent({ campaignId: campaign.id, publishedVersion: campaign.publishedVersion,
          consentVersion: Number(snapshot.consentVersion), consentText: String(snapshot.consentText || "") })}
        touchpointCode={ref}
        initialData={templateData}
      />
    </main>
  );
}
