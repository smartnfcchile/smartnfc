import { notFound } from "next/navigation";
import { requireScopedDesign } from "../../../../lib/physical-card/auth";
import type { CardSideDesign } from "../../../../lib/physical-card/templates";
import PhysicalCardEditor from "./PhysicalCardEditor";
import { getPublicUrl } from "../../../../lib/public-url";

export default async function PhysicalDesignEditorPage({ params }: { params: Promise<{ designId: string }> }) {
  const { designId } = await params;
  const result = await requireScopedDesign(designId).catch(() => null);
  if (!result) notFound();
  const { design } = result;
  return <PhysicalCardEditor initial={{ id: design.id, name: design.name, version: design.version, front: design.frontDesign as unknown as CardSideDesign, back: design.backDesign as unknown as CardSideDesign, publicUrl: getPublicUrl(`/c/${design.card.slug}`), updatedAt: design.updatedAt.toISOString() }} />;
}
