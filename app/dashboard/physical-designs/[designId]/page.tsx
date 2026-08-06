import { notFound } from "next/navigation";
import { requireScopedDesign } from "../../../../lib/physical-card/auth";
import type { CardSideDesign } from "../../../../lib/physical-card/templates";
import PhysicalCardEditor from "./PhysicalCardEditor";

export default async function PhysicalDesignEditorPage({ params }: { params: Promise<{ designId: string }> }) {
  const { designId } = await params;
  const result = await requireScopedDesign(designId).catch(() => null);
  if (!result) notFound();
  const { design } = result;
  const configuredOrigin = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return <PhysicalCardEditor initial={{ id: design.id, name: design.name, version: design.version, front: design.frontDesign as unknown as CardSideDesign, back: design.backDesign as unknown as CardSideDesign, publicUrl: `${configuredOrigin}/c/${design.card.slug}`, updatedAt: design.updatedAt.toISOString() }} />;
}
