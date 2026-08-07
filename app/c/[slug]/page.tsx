import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
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

  // Normalizar origen
  let contactSource: "NFC" | "QR" | "DIRECT" = "DIRECT";
  if (ref === "nfc" || ref === "nfc_scan") {
    contactSource = "NFC";
  } else if (ref === "qr" || ref === "qr_scan") {
    contactSource = "QR";
  }

  return <CardProfileView card={card} isPreview={false} contactSource={contactSource} />;
}
