import { redirect } from "next/navigation";
import { getCurrentUserContext } from "../../../lib/permissions";
import { prisma } from "../../../lib/prisma";

export default async function MyCardPage() {
  const user = await getCurrentUserContext();
  const card = await prisma.card.findFirst({
    where: { userId: user.id, companyId: user.companyId },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!card) {
    redirect("/dashboard?profile=missing");
  }

  redirect(`/dashboard/editor/${card.id}`);
}
