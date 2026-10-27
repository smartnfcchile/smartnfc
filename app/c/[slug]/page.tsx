import { hasCardProfileRight, hasCapability } from "@/lib/entitlements";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CardProfileView from "@/components/card-profile/CardProfileView";
import { PROFILE_INACTIVE_TITLE, PROFILE_INACTIVE_DETAIL } from "@/lib/public-profile-status";
import { toPublicCardProfile } from "@/lib/card-profile/public-card";

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

  // Card and Company are active: this is a commercial/entitlement state, never a security suspension.
  // Next 16.2.11 has no supported, non-experimental way to return a 403 from this Server Component
  // page (forbidden()/unauthorized() require enabling experimental.authInterrupts; see
  // node_modules/next/dist/docs/01-app/03-api-reference/04-functions/forbidden.md) without a
  // disproportionate project-wide config change, so this renders normally with an HTTP 200 status.
  if (!(await hasCardProfileRight(card.id, card.companyId))) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-950/80 border border-slate-800 p-8 rounded-2xl text-center space-y-4 max-w-md shadow-2xl">
          <div className="text-4xl">🪪</div>
          <h2 className="text-xl font-black text-white">{PROFILE_INACTIVE_TITLE}</h2>
          <p className="text-slate-400 text-sm leading-relaxed">{PROFILE_INACTIVE_DETAIL}</p>
        </div>
      </main>
    );
  }
  const canCapture = await hasCapability(card.companyId, "LEAD_CAPTURE");

  // Normalizar origen
  let contactSource: "NFC" | "QR" | "DIRECT" = "DIRECT";
  if (ref === "nfc" || ref === "nfc_scan") {
    contactSource = "NFC";
  } else if (ref === "qr" || ref === "qr_scan") {
    contactSource = "QR";
  }

  // Privacidad (BUG-E2E-2): el componente cliente recibe solo la proyección pública. Los datos con «Mostrar»
  // desmarcado y la ficha interna de la empresa nunca llegan al HTML ni a la vCard.
  const publicCard = toPublicCardProfile(card, { shareContactEnabled: card.shareContactEnabled && canCapture });
  return <CardProfileView card={publicCard} isPreview={false} contactSource={contactSource} />;
}
