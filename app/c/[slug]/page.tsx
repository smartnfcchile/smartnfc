import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LeadForm from "./LeadForm";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatPhone(phone?: string | null) {
  if (!phone) return null;
  return phone.replace(/\s+/g, "");
}

function getSafeVideoEmbedUrl(videoUrl?: string | null) {
  if (!videoUrl) return null;

  try {
    const url = new URL(videoUrl);

    if (url.hostname.includes("youtube.com")) {
      const videoId = url.searchParams.get("v");
      if (!videoId) return null;
      return `https://www.youtube.com/embed/${videoId}`;
    }

    if (url.hostname.includes("youtu.be")) {
      const videoId = url.pathname.replace("/", "");
      if (!videoId) return null;
      return `https://www.youtube.com/embed/${videoId}`;
    }

    if (url.hostname.includes("vimeo.com")) {
      const videoId = url.pathname.replace("/", "");
      if (!videoId) return null;
      return `https://player.vimeo.com/video/${videoId}`;
    }

    return null;
  } catch {
    return null;
  }
}

export default async function PublicCardPage({ params }: PageProps) {
  const { slug } = await params;

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

  if (!card || !card.isActive) {
    notFound();
  }

  const themeColor = card.themeColor || "#2563eb";
  const whatsapp = formatPhone(card.whatsapp);
  const phone = formatPhone(card.phone);
  const safeVideoUrl = getSafeVideoEmbedUrl(card.videoUrl);

  const socialLinks = [
    { label: "LinkedIn", href: card.linkedin },
    { label: "Instagram", href: card.instagram },
    { label: "Facebook", href: card.facebook },
    { label: "TikTok", href: card.tiktok },
    { label: "YouTube", href: card.youtube },
  ].filter((item) => Boolean(item.href));

 return (
  <main className="min-h-screen bg-slate-100 text-slate-950">
    <section className="flex min-h-screen items-center justify-center px-5 py-10">
      <article className="w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="px-7 pt-8 text-center">
          {card.logoUrl && (
            <div className="mb-6 flex justify-center">
              <img
                src={card.logoUrl}
                alt={card.companyName ?? card.company.name}
                className="h-10 max-w-40 object-contain"
              />
            </div>
          )}

          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-4xl font-black text-white shadow-lg">
            {card.avatarUrl ? (
              <img
                src={card.avatarUrl}
                alt={card.profileName ?? card.name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span
                className="flex h-full w-full items-center justify-center rounded-full"
                style={{ backgroundColor: themeColor }}
              >
                {(card.profileName ?? card.name).slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>

          <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
            Perfil corporativo
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            {card.profileName ?? card.name}
          </h1>

          {card.role && (
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {card.role}
            </p>
          )}

          <p className="mt-1 text-sm text-slate-500">
            {card.companyName ?? card.company.name}
          </p>
        </div>

        {card.bio && (
          <section className="mx-6 mt-7 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
              Presentación
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {card.bio}
            </p>
          </section>
        )}

        <section className="mx-6 mt-5 grid grid-cols-1 gap-3">
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}`}
              className="rounded-2xl px-4 py-4 text-center text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5"
              style={{ backgroundColor: themeColor }}
            >
              Contactar ahora
            </a>
          )}

          <div className="grid grid-cols-2 gap-3">
            {phone && (
              <a
                href={`tel:${phone}`}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Llamar
              </a>
            )}

            {card.email && (
              <a
                href={`mailto:${card.email}`}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Email
              </a>
            )}
          </div>
        </section>

        {socialLinks.length > 0 && (
          <section className="mx-6 mt-5 flex flex-wrap justify-center gap-2">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
              >
                {social.label}
              </a>
            ))}
          </section>
        )}

        {card.links.length > 0 && (
          <section className="mx-6 mt-7">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
              Documentos y enlaces
            </p>

            <div className="space-y-3">
              {card.links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span>{link.title}</span>
                  <span style={{ color: themeColor }}>↗</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {safeVideoUrl && (
          <section className="mx-6 mt-7 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
              Video
            </p>

            <h2 className="mt-2 text-lg font-black text-slate-950">
              {card.videoTitle ?? "Video corporativo"}
            </h2>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-black">
              <iframe
                src={safeVideoUrl}
                title={card.videoTitle ?? "Video corporativo"}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </section>
        )}

        <div className="mx-6 mt-7">
          <LeadForm cardId={card.id} themeColor={themeColor} />
        </div>

        <footer className="mt-8 border-t border-slate-200 px-6 py-6 text-center">
          {card.location && (
            <p className="text-xs text-slate-500">{card.location}</p>
          )}

          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">
            Powered by SmartNFC Chile
          </p>
        </footer>
      </article>
    </section>
  </main>  
 ); 
}
