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
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
        <div
          className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full blur-3xl opacity-30"
          style={{ backgroundColor: themeColor }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_35%),linear-gradient(to_bottom,rgba(15,23,42,0.35),#020617)]" />

        <article className="relative z-10 w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/80 shadow-2xl backdrop-blur">
          <div
            className="relative h-36 border-b border-white/10"
            style={{
              background: card.coverUrl
                ? `url(${card.coverUrl}) center/cover`
                : `linear-gradient(135deg, ${themeColor}, #020617 70%)`,
            }}
          >
            {card.logoUrl && (
              <div className="absolute left-5 top-5 rounded-2xl border border-white/10 bg-slate-950/75 px-3 py-2 backdrop-blur">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.logoUrl}
                  alt={card.companyName ?? card.company.name}
                  className="h-8 max-w-32 object-contain"
                />
              </div>
            )}
          </div>

          <div className="px-6 pb-7">
            <div className="-mt-12 flex justify-center">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/20 bg-slate-950 text-3xl font-black shadow-xl"
                style={{ boxShadow: `0 0 45px ${themeColor}55` }}
              >
                {card.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.avatarUrl}
                    alt={card.profileName ?? card.name}
                    className="h-full w-full rounded-3xl object-cover"
                  />
                ) : (
                  <span>
                    {(card.profileName ?? card.name).slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 text-center">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                Tarjeta NFC inteligente
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-tight">
                {card.profileName ?? card.name}
              </h1>

              {card.role && (
                <p className="mt-2 text-sm font-medium text-slate-300">
                  {card.role}
                </p>
              )}

              <p className="mt-1 text-sm text-slate-500">
                {card.companyName ?? card.company.name}
              </p>

              {card.bio && (
                <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-300">
                  {card.bio}
                </p>
              )}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                >
                  WhatsApp
                </a>
              )}

              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                >
                  Llamar
                </a>
              )}

              {card.email && (
                <a
                  href={`mailto:${card.email}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                >
                  Email
                </a>
              )}
            </div>

            {socialLinks.length > 0 && (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.08]"
                  >
                    {social.label}
                  </a>
                ))}
              </div>
            )}

            <div className="mt-6 space-y-3">
              {card.links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-900"
                >
                  <span>{link.title}</span>
                  <span style={{ color: themeColor }}>↗</span>
                </a>
              ))}
            </div>

            {safeVideoUrl && (
              <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Video
                </p>

                <h2 className="mt-2 text-lg font-black">
                  {card.videoTitle ?? "Video corporativo"}
                </h2>

                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black">
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

            <LeadForm cardId={card.id} themeColor={themeColor} />

            <div className="mt-7 border-t border-white/10 pt-5 text-center">
              {card.location && (
                <p className="text-xs text-slate-500">{card.location}</p>
              )}

              <p className="mt-3 text-[11px] uppercase tracking-[0.3em] text-slate-600">
                Powered by NFC Smart Cards Pro
              </p>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}