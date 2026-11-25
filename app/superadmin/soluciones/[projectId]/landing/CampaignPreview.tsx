import type { CampaignContent } from "../../../../../lib/soluciones/campaign-content";
import { campaignForSite } from "../../../../../lib/soluciones/campaign-editor";
import { safeDestination } from "../../../../../lib/local/safe-url";

function PreviewImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  // Keep remote media in the browser and avoid forwarding the admin URL as a referrer.
  // eslint-disable-next-line @next/next/no-img-element
  return safeDestination(src) ? <img src={src} alt={alt} referrerPolicy="no-referrer" className={className} /> :
    <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">Agrega una URL HTTPS de imagen</div>;
}

export default function CampaignPreview({ content, siteId }: { content: CampaignContent; siteId: string }) {
  const { design, blocks } = campaignForSite(content, siteId);
  const bold = design.style === "bold";
  return <section aria-label="Vista previa del borrador" className="min-w-0">
    <h2 className="mb-3 text-sm font-semibold">Vista previa móvil</h2>
    <div className="mx-auto max-w-[350px] rounded-[2rem] bg-slate-900 p-2 shadow-xl">
      <article className={`min-h-[430px] overflow-hidden rounded-[1.6rem] bg-white text-slate-900 ${design.font === "serif" ? "font-serif" : "font-sans"}`}>
        <header className="border-t-4 px-5 pt-5" style={{ borderTopColor: design.color }}>
          {design.logo && <PreviewImage src={design.logo} alt="" className="mb-3 max-h-12 max-w-28 object-contain" />}
          <p className="break-words text-sm font-semibold text-slate-700">{design.name}</p>
        </header>
        <div className="space-y-4 p-5">
          {!blocks.some(block => !block.hidden) && <p className="text-sm text-slate-500">Agrega un bloque visible para previsualizar la landing.</p>}
          {blocks.filter(block => !block.hidden).map(block => {
            switch (block.type) {
              case "hero": return <h3 key={block.id} className={`whitespace-pre-wrap break-words border-l-4 pl-3 ${bold ? "text-3xl font-extrabold" : "text-2xl font-bold"}`} style={{ borderColor: design.color }}>{block.text}</h3>;
              case "text": return <p key={block.id} className="whitespace-pre-wrap break-words text-sm leading-relaxed">{block.text}</p>;
              case "image": return <PreviewImage key={block.id} src={block.src} alt={block.alt} className="max-h-64 w-full rounded-xl object-contain" />;
              case "list": return <ul key={block.id} className="list-disc space-y-2 break-words pl-5 text-sm">{block.items.map((item, i) => <li key={i}>{item}</li>)}</ul>;
              case "faq": return <div key={block.id} className="space-y-2">{block.items.map((item, i) => <details key={i} className="rounded-lg border p-2 text-sm"><summary className="cursor-pointer break-words font-semibold">{item.question}</summary><p className="mt-2 break-words">{item.answer}</p></details>)}</div>;
              case "button": return <span key={block.id} className="block break-words rounded-lg border-2 p-2 text-center text-sm font-semibold" style={{ borderColor: design.color }}>{block.text}</span>;
            }
          })}
        </div>
      </article>
    </div>
  </section>;
}
