import CampaignUvForecast from "./CampaignUvForecast";
import type { MetUvSeries } from "../../lib/soluciones/met-uv";
import CampaignRichContent from "./CampaignRichContent";
import type { CampaignBlock, CampaignDesign } from "../../lib/soluciones/campaign-content";
import { safeDestination } from "../../lib/local/safe-url";

function LandingImage({ src, demoSrc, alt, className, preview }: { src: string; demoSrc?: string; alt: string; className: string; preview: boolean }) {
  // Keep remote media in the browser and avoid forwarding the admin URL as a referrer.
  // eslint-disable-next-line @next/next/no-img-element
  return safeDestination(src) ? <img src={demoSrc ?? src} alt={alt} referrerPolicy="no-referrer" className={className} /> : preview ?
    <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">Agrega una URL HTTPS de imagen</div> : null;
}

export default function CampaignLandingContent({ design, blocks, preview = false, demoMedia, forecasts, forecastAt }: {
  design: CampaignDesign; blocks: CampaignBlock[]; preview?: boolean; demoMedia?: Record<string, string>; forecasts?: Record<string, MetUvSeries>; forecastAt?: string;
}) {
  const Name = preview ? "p" : "h1";
  const Hero = preview ? "h3" : "h2";
  const editorial = design.style === "editorial";
  const bold = design.style === "bold";
  return (
      <article className={`${preview ? "min-h-[430px] rounded-[1.6rem]" : "rounded-2xl shadow-sm"} overflow-hidden ${editorial ? "bg-slate-50" : "bg-white"} text-slate-900 ${design.font === "serif" ? "font-serif" : "font-sans"}`}>
        <header className={editorial ? "flex items-center gap-3 border-t-4 bg-white px-5 py-4" : "border-t-4 px-5 pt-5"} style={{ borderTopColor: design.color }}>
          {design.logo && <LandingImage preview={preview} src={design.logo} alt="" className={editorial ? "h-12 max-w-40 shrink-0 object-contain sm:h-14" : "mb-3 max-h-12 max-w-28 object-contain"} />}
          <Name className="break-words text-sm font-semibold text-slate-700">{design.name}</Name>
        </header>
        <div className="space-y-4 p-5">
          {preview && !blocks.some(block => !block.hidden) && <p className="text-sm text-slate-500">Agrega un bloque visible para previsualizar la landing.</p>}
          {blocks.filter(block => !block.hidden).map((block, index) => {
            switch (block.type) {
              case "hero": return editorial ? <section key={index} className="rounded-2xl bg-slate-950 px-5 py-5 text-white sm:px-8">
                <Hero className="break-words text-3xl font-black leading-tight tracking-tight sm:text-4xl">{block.text}</Hero>
                {block.subtitle && <p className="mt-2 break-words text-sm font-medium text-sky-200 sm:text-base">{block.subtitle}</p>}
              </section> : block.subtitle ? <section key={index} className="space-y-2"><Hero className="break-words text-2xl font-bold">{block.text}</Hero><p className="break-words text-sm text-slate-600">{block.subtitle}</p></section> : <Hero key={index} className={`whitespace-pre-wrap break-words border-l-4 pl-3 ${bold ? "text-3xl font-extrabold" : "text-2xl font-bold"}`} style={{ borderColor: design.color }}>{block.text}</Hero>;
              case "card": case "alert": case "indicator": case "risk-scale": case "card-group": return <CampaignRichContent key={index} block={block} preview={preview} />;
              case "uv-forecast": return <CampaignUvForecast key={index} block={block} forecast={forecasts?.[block.id]} asOf={forecastAt} preview={preview} />;
              case "video": return <section key={index} className="relative overflow-hidden rounded-2xl bg-slate-950">
                <LandingImage src={block.thumbnail} demoSrc={demoMedia?.[block.thumbnail]} alt="" className="aspect-video w-full object-cover opacity-70" preview={preview} />
                {preview ? <span className="absolute inset-x-3 bottom-3 rounded-lg bg-slate-950 p-2 text-center font-bold text-white">▶ {block.title}</span>
                  : safeDestination(block.href) && <a href={block.href} rel="noreferrer" className="absolute inset-x-3 bottom-3 rounded-lg bg-slate-950 p-2 text-center font-bold text-white">▶ {block.title}</a>}
              </section>;
              case "text": return <p key={index} className="whitespace-pre-wrap break-words text-sm leading-relaxed">{block.text}</p>;
              case "image": return <LandingImage preview={preview} key={index} src={block.src} demoSrc={demoMedia?.[block.src]} alt={block.alt} className={editorial ? "aspect-video w-full rounded-2xl object-cover" : "max-h-64 w-full rounded-xl object-contain"} />;
              case "list": return <ul key={index} className="list-disc space-y-2 break-words pl-5 text-sm">{block.items.map((item, i) => <li key={i}>{item}</li>)}</ul>;
              case "faq": return <div key={index} className="space-y-2">{block.items.map((item, i) => <details key={i} className="rounded-lg border p-2 text-sm"><summary className="cursor-pointer break-words font-semibold">{item.question}</summary><p className="mt-2 break-words">{item.answer}</p></details>)}</div>;
              case "button": return !preview && safeDestination(block.href) ? <a key={index} href={block.href} rel="noreferrer" className="block break-words rounded-lg border-2 p-2 text-center text-sm font-semibold" style={{ borderColor: design.color }}>{block.text}</a> : preview ? <span key={index} className="block break-words rounded-lg border-2 p-2 text-center text-sm font-semibold" style={{ borderColor: design.color }}>{block.text}</span> : null;
            }
          })}
        </div>
        {editorial && <footer className="border-t border-slate-200 px-5 py-5 text-center text-xs font-semibold text-slate-600">Tecnología SmartNFC · Prevención conectada</footer>}
      </article>
  );
}
