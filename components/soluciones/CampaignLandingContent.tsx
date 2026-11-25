import type { CampaignBlock, CampaignDesign } from "../../lib/soluciones/campaign-content";
import { safeDestination } from "../../lib/local/safe-url";

function LandingImage({ src, alt, className, preview }: { src: string; alt: string; className: string; preview: boolean }) {
  // Keep remote media in the browser and avoid forwarding the admin URL as a referrer.
  // eslint-disable-next-line @next/next/no-img-element
  return safeDestination(src) ? <img src={src} alt={alt} referrerPolicy="no-referrer" className={className} /> : preview ?
    <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">Agrega una URL HTTPS de imagen</div> : null;
}

export default function CampaignLandingContent({ design, blocks, preview = false }: {
  design: CampaignDesign; blocks: CampaignBlock[]; preview?: boolean;
}) {
  const Name = preview ? "p" : "h1";
  const Hero = preview ? "h3" : "h2";
  const bold = design.style === "bold";
  return (
      <article className={`${preview ? "min-h-[430px] rounded-[1.6rem]" : "rounded-2xl shadow-sm"} overflow-hidden bg-white text-slate-900 ${design.font === "serif" ? "font-serif" : "font-sans"}`}>
        <header className="border-t-4 px-5 pt-5" style={{ borderTopColor: design.color }}>
          {design.logo && <LandingImage preview={preview} src={design.logo} alt="" className="mb-3 max-h-12 max-w-28 object-contain" />}
          <Name className="break-words text-sm font-semibold text-slate-700">{design.name}</Name>
        </header>
        <div className="space-y-4 p-5">
          {preview && !blocks.some(block => !block.hidden) && <p className="text-sm text-slate-500">Agrega un bloque visible para previsualizar la landing.</p>}
          {blocks.filter(block => !block.hidden).map((block, index) => {
            switch (block.type) {
              case "hero": return <Hero key={index} className={`whitespace-pre-wrap break-words border-l-4 pl-3 ${bold ? "text-3xl font-extrabold" : "text-2xl font-bold"}`} style={{ borderColor: design.color }}>{block.text}</Hero>;
              case "text": return <p key={index} className="whitespace-pre-wrap break-words text-sm leading-relaxed">{block.text}</p>;
              case "image": return <LandingImage preview={preview} key={index} src={block.src} alt={block.alt} className="max-h-64 w-full rounded-xl object-contain" />;
              case "list": return <ul key={index} className="list-disc space-y-2 break-words pl-5 text-sm">{block.items.map((item, i) => <li key={i}>{item}</li>)}</ul>;
              case "faq": return <div key={index} className="space-y-2">{block.items.map((item, i) => <details key={i} className="rounded-lg border p-2 text-sm"><summary className="cursor-pointer break-words font-semibold">{item.question}</summary><p className="mt-2 break-words">{item.answer}</p></details>)}</div>;
              case "button": return !preview && safeDestination(block.href) ? <a key={index} href={block.href} rel="noreferrer" className="block break-words rounded-lg border-2 p-2 text-center text-sm font-semibold" style={{ borderColor: design.color }}>{block.text}</a> : preview ? <span key={index} className="block break-words rounded-lg border-2 p-2 text-center text-sm font-semibold" style={{ borderColor: design.color }}>{block.text}</span> : null;
            }
          })}
        </div>
      </article>
  );
}
