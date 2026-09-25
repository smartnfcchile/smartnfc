import { notFound } from "next/navigation";
import { prisma } from "../../../../../lib/prisma";
import { requireLocalPage } from "../../../../../lib/local/access";
import { findBrandFallbackCampaign } from "../../../../../lib/local/location-brand";
import LocationIdentityEditor from "../../../../../components/local/brand/LocationIdentityEditor";

export const dynamic = "force-dynamic";

export default async function LocationIdentityPage({ params }: { params: Promise<{ locationId: string }> }) {
  const { company } = await requireLocalPage("LOCAL_ACCESS");
  const { locationId } = await params;
  const location = await prisma.localLocation.findFirst({ where: { id: locationId, companyId: company.id, isActive: true } });
  if (!location) notFound();
  const campaign = await findBrandFallbackCampaign(company.id, location.id);
  const v = (value: string | null) => value ?? "";
  return (
    <LocationIdentityEditor
      locationId={location.id}
      companyName={company.name}
      brandUpdatedAt={location.brandUpdatedAt?.toISOString() ?? null}
      campaignFallback={campaign ? { businessName: campaign.businessName, logoUrl: campaign.logoUrl, heroImageUrl: campaign.heroImageUrl,
        primaryColor: campaign.primaryColor, secondaryColor: campaign.secondaryColor, address: campaign.address } : null}
      campaignFallbackName={campaign?.name ?? null}
      initial={{
        name: v(location.name), address: v(location.address), displayName: v(location.displayName), shortDescription: v(location.shortDescription),
        logoUrl: v(location.logoUrl), coverImageUrl: v(location.coverImageUrl), primaryColor: v(location.primaryColor),
        secondaryColor: v(location.secondaryColor), phone: v(location.phone), websiteUrl: v(location.websiteUrl), mapsUrl: v(location.mapsUrl),
      }}
    />
  );
}
