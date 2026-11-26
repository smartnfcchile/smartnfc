import { ArrowUpRight, Eye, Info, Shield, Shirt, Sun, Umbrella } from "lucide-react";
import type { CampaignCard, CampaignRichBlock } from "../../lib/soluciones/campaign-content";
import { safeDestination } from "../../lib/local/safe-url";

const icons = { sun: Sun, shield: Shield, eye: Eye, shirt: Shirt, shade: Umbrella, info: Info };
const tones = {
  green: "bg-[#289500] text-slate-950", yellow: "bg-[#f7e400] text-slate-950",
  orange: "bg-[#f85900] text-slate-950", red: "bg-[#d8001d] text-white", violet: "bg-[#6b49c8] text-white",
};

function InfoCard({ card }: { card: CampaignCard }) {
  const Icon = icons[card.icon];
  return <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
    <Icon aria-hidden="true" className="mb-1 h-5 w-5 text-sky-800" />
    <h3 className="break-words font-bold">{card.title}</h3>
    <p className="mt-1 break-words text-sm text-slate-600">{card.text}</p>
  </div>;
}

export default function CampaignRichContent({ block, preview }: { block: CampaignRichBlock; preview: boolean }) {
  switch (block.type) {
    case "card": return <InfoCard card={block} />;
    case "card-group": return <section className="space-y-3">
      <h2 className="break-words text-lg font-bold">{block.title}</h2>
      <div className="grid grid-cols-2 gap-3">{block.cards.map((card, index) => <InfoCard key={index} card={card} />)}</div>
    </section>;
    case "risk-scale": return <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="break-words font-bold">{block.title}</h2>
      <ul className="flex flex-wrap gap-1">{block.bands.map((band, index) =>
        <li key={index} className={`min-w-[3.6rem] flex-1 rounded-md px-1 py-1.5 text-center ${tones[band.tone]}`}>
          <strong className="block text-base">{band.range}</strong><span className="block text-[0.625rem] font-semibold leading-tight">{band.label}</span>
        </li>)}</ul>
      <p className="break-words text-xs text-slate-600">{block.text}</p>
    </section>;
    case "alert": {
      const Icon = icons[block.icon];
      return <aside className="flex gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-orange-950">
        <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
        <div className="min-w-0 break-words"><h2 className="font-bold">{block.title}</h2><p className="text-sm">{block.text}</p></div>
      </aside>;
    }
    case "indicator": {
      const Icon = icons[block.icon];
      const action = block.action;
      const actionClass = "mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white";
      return <section className="rounded-2xl bg-amber-100 p-5 text-amber-950 shadow-sm">
        <Icon aria-hidden="true" className="mb-3 h-10 w-10 text-amber-700" />
        <h2 className="break-words text-2xl font-black">{block.title}</h2>
        <p className="mt-1 break-words text-sm">{block.text}</p>
        {action && (preview ? <span className={actionClass}>{action.label}</span> : safeDestination(action.href) &&
          <a className={actionClass} href={action.href} rel="noreferrer">{action.label}<ArrowUpRight aria-hidden="true" size={16} /></a>)}
      </section>;
    }
  }
}
