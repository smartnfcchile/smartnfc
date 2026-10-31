import { prisma } from "@/lib/prisma";
import { hasCardProfileRight } from "@/lib/entitlements";
import { profileVcardResponse } from "@/lib/card-profile/vcard";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  try {
    const { slug } = await params;
    const card = await prisma.card.findUnique({ where: { slug }, include: { company: true } });
    if (!card || !card.isActive || !card.company.isActive) {
      return new Response("Contacto no disponible", { status: 404, headers });
    }
    if (!(await hasCardProfileRight(card.id, card.companyId))) {
      return new Response("Este perfil no está disponible en este momento.", { status: 403, headers });
    }
    return profileVcardResponse(card);
  } catch (error) {
    console.error("PROFILE_VCARD_ERROR", error);
    return new Response("No pudimos abrir el contacto. Vuelve a la tarjeta e inténtalo nuevamente.", { status: 500, headers });
  }
}
