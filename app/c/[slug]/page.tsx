import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { hashIp } from "../../../lib/security";
import CardProfileView from "@/components/card-profile/CardProfileView";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

export default async function PublicCardPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { ref } = await searchParams;

  const card = await prisma.card.findUnique({
    where: { slug },
    include: {
      links: {
        where: { isActive: true },
        orderBy: { order: "asc" },
      },
      company: true,
    },
  });

  if (!card || !card.isActive || !card.company.isActive) {
    notFound();
  }

  // 1. Detección de NFC Scan vs Vista regular
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0] ||
    headersList.get("x-real-ip") ||
    "local";

  const userAgent = headersList.get("user-agent") || "Desconocido";
  const referer = headersList.get("referer") || null;

  const isNfc = ref === "nfc" || ref === "nfc_scan";

  await prisma.event.create({
    data: {
      cardId: card.id,
      eventType: isNfc ? "NFC_SCAN" : "VIEW",
      userAgent,
      referer,
      ipHash: hashIp(ip),
    },
  });

  return <CardProfileView card={card} isPreview={false} />;
}
