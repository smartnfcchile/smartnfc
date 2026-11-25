import type { CampaignContent } from "../../../../../lib/soluciones/campaign-content";
import { campaignForSite } from "../../../../../lib/soluciones/campaign-editor";
import CampaignLandingContent from "../../../../../components/soluciones/CampaignLandingContent";

export default function CampaignPreview({ content, siteId }: { content: CampaignContent; siteId: string }) {
  const { design, blocks } = campaignForSite(content, siteId);
  return <section aria-label="Vista previa del borrador" className="min-w-0">
    <h2 className="mb-3 text-sm font-semibold">Vista previa móvil</h2>
    <div className="mx-auto max-w-[350px] rounded-[2rem] bg-slate-900 p-2 shadow-xl">
      <CampaignLandingContent design={design} blocks={blocks} preview />
    </div>
  </section>;
}
