import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LeadForm from "./LeadForm";
import TrackButton from "./TrackButton";
import { headers } from "next/headers";
import crypto from "crypto";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

const getTemplateBgColor = (template: string) => {
  switch (template) {
    case "corporate-1":
    case "corporate-2":
    case "corporate-3":
    case "corporate-5":
    case "personal-2":
    case "personal-4":
    case "comercial-1":
    case "comercial-2":
      return "#0f172a";
    case "corporate-4":
      return "#f9f5eb";
    case "personal-1":
    case "creator-3":
    case "business-3":
    case "business-5":
      return "#ffffff";
    case "personal-3":
      return "#1b2226";
    case "personal-5":
      return "#faf8f5";
    case "comercial-3":
      return "#18181b";
    case "comercial-4":
      return "#161238";
    case "comercial-5":
      return "#1b1511";
    case "business-1":
      return "#17110e";
    case "business-2":
      return "#1a1a1a";
    case "business-4":
      return "#0a1128";
    case "creator-1":
      return "#09090b";
    case "creator-2":
      return "#0c1812";
    case "creator-4":
      return "#0d0415";
    case "creator-5":
      return "#080b11";
    default:
      return "#0f172a";
  }
};

const getPhotoStyleConfig = (styleKey: string) => {
  let classes = "w-28 h-28 overflow-hidden flex items-center justify-center ";
  let styles: React.CSSProperties = {};

  switch (styleKey || "circle") {
    case "rounded-square":
      classes += "rounded-2xl border border-slate-400/30 shadow-md";
      break;
    case "hexagon":
      classes += "border border-slate-400/30";
      styles.clipPath = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
      break;
    case "diamond":
      classes += "border border-slate-400/30";
      styles.clipPath = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";
      break;
    case "shield":
      classes += "border border-slate-400/30";
      styles.clipPath = "polygon(0% 0%, 100% 0%, 100% 60%, 50% 100%, 0% 60%)";
      break;
    case "double-ring":
      classes += "rounded-full ring-4 ring-offset-2 ring-amber-500 bg-slate-900";
      break;
    case "neon":
      classes += "rounded-full border border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)]";
      break;
    case "crystal":
      classes += "rounded-full border border-white/40 bg-white/10 backdrop-blur-sm shadow-md";
      break;
    case "glassmorphism":
      classes += "rounded-2xl border border-white/20 bg-white/5 backdrop-blur-md shadow-lg";
      break;
    case "gold-frame":
      classes += "rounded-full border-4 border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.3)]";
      break;
    case "silver-frame":
      classes += "rounded-full border-4 border-slate-300 shadow-[0_0_15px_rgba(200,200,200,0.3)]";
      break;
    case "premium-black":
      classes += "rounded-full border-4 border-neutral-900 shadow-xl";
      break;
    case "no-frame":
      classes += "rounded-none border-0";
      break;
    case "shadow":
      classes += "rounded-xl shadow-2xl shadow-black/80";
      break;
    case "floating":
      classes += "rounded-full shadow-lg hover:-translate-y-1 transition duration-300";
      break;
    case "polaroid":
      classes += "bg-white p-2 pb-6 border border-slate-200 shadow-md rounded-none -rotate-1";
      break;
    case "slanted":
      classes += "rounded-2xl border-2 border-slate-700 rotate-2 hover:rotate-0 transition duration-300";
      break;
    case "tech":
      classes += "border-2 border-cyan-500";
      styles.clipPath = "polygon(15% 0, 100% 0, 100% 85%, 85% 100%, 0 100%, 0 15%)";
      break;
    case "futuristic":
      classes += "rounded-lg border-2 border-purple-500 shadow-[0_0_10px_#a855f7]";
      break;
    case "minimalist":
      classes += "border border-slate-350 rounded-md p-1 bg-white";
      break;
    case "luxury":
      classes += "rounded-full border-2 border-yellow-600 ring-4 ring-yellow-950/40";
      break;
    case "corporate":
      classes += "rounded-xl border-4 border-slate-800";
      break;
    case "gamer":
      classes += "rounded-none border-2 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]";
      break;
    case "industrial":
      classes += "rounded-none border-4 border-amber-600 bg-zinc-900";
      break;
    case "custom-ia":
      classes += "rounded-[2rem] border-4 border-dashed border-sky-400";
      break;
    case "circle":
    default:
      classes += "rounded-full border border-slate-400/30 shadow-md";
      break;
  }
  return { className: classes, style: styles };
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

function hashIp(ip: string) {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

export default async function PublicCardPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { ref } = await searchParams;

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

  // 1. Detección de NFC Scan vs Vista regular
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0] ||
    headersList.get("x-real-ip") ||
    "local";

  const userAgent = headersList.get("user-agent") || "Desconocido";
  const referer = headersList.get("referer") || null;

  const isNfc = ref === "nfc" || ref === "nfc_scan";

  await prisma.event.create({
    data: {
      cardId: card.id,
      eventType: isNfc ? "NFC_SCAN" : "VIEW",
      userAgent,
      referer,
      ipHash: hashIp(ip),
    },
  });

  const themeColor = card.themeColor || "#2563eb";
  
  // 2. Generación de vCard
  const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${card.profileName ?? card.name}
ORG:${card.companyName ?? card.company.name}
TITLE:${card.role ?? ""}
TEL:${card.phone ?? ""}
EMAIL:${card.email ?? ""}
END:VCARD`;
  
  const vcardUrl = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}`;

  // 3. Formateo de canales de contacto con su respectivo interruptor de visibilidad
  const whatsapp = card.showWhatsapp ? formatPhone(card.whatsapp) : null;
  const phone = card.showPhone ? formatPhone(card.phone) : null;
  const safeVideoUrl = getSafeVideoEmbedUrl(card.videoUrl);

  // 4. Filtrado de enlaces sociales con sus respectivos interruptores de visibilidad
  const socialLinks = [
    { label: "LinkedIn", href: card.showLinkedin ? card.linkedin : null },
    { label: "Instagram", href: card.showInstagram ? card.instagram : null },
    { label: "Facebook", href: card.showFacebook ? card.facebook : null },
    { label: "TikTok", href: card.showTiktok ? card.tiktok : null },
    { label: "YouTube", href: card.showYoutube ? card.youtube : null },
  ].filter((item) => Boolean(item.href));  const isDark = card.themeMode === "dark";
  const template = card.template || "corporate-1";
  const isBusiness = template.startsWith("business-");
  const isLightTemplate =
    template === "corporate-4" ||
    template === "personal-1" ||
    template === "personal-5" ||
    template === "business-3" ||
    template === "business-5" ||
    template === "creator-3";
  const actualIsDark = isLightTemplate ? false : isDark;

  // 5. Determinar el estilo del banner de portada
  let activeBannerStyle = card.bannerStyle || "classic";
  if (activeBannerStyle === "classic") {
    if (template === "business-1") activeBannerStyle = "arc";
    else if (template === "business-2") activeBannerStyle = "wave";
    else if (template === "business-3") activeBannerStyle = "wave";
    else if (template === "business-4") activeBannerStyle = "arch";
    else if (template === "business-5") activeBannerStyle = "diagonal";
  }

  let mainClass = "";
  let articleClass = "";
  let avatarContainerClass = "";
  let profileLabelClass = "";
  let profileNameClass = "";
  let profileRoleClass = "";
  let profileCompanyClass = "";
  let sectionContainerClass = "";
  let sectionLabelClass = "";
  let sectionTextClass = "";
  let primaryBtnClass = "";
  let secondaryBtnClass = "";
  let smallSecondaryBtnClass = "";
  let socialBtnClass = "";
  let documentBtnClass = "";
  let videoContainerClass = "";
  let videoTitleClass = "";
  let videoIframeWrapperClass = "";
  let footerClass = "";
  let locationClass = "";
  let poweredByClass = "";
  let linkSectionLabelClass = "";
  let primaryBtnStyle: React.CSSProperties = {};

  if (template === "corporate-2") {
    // Curvas de Oro
    mainClass = "min-h-screen bg-[#030712] text-white flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-[2rem] border border-amber-500/15 bg-slate-900/80 backdrop-blur-md shadow-2xl shadow-black relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-full ring-4 ring-amber-500/80 ring-offset-4 ring-offset-slate-900 bg-slate-950 text-4xl font-black text-white shadow-xl shadow-amber-500/10 overflow-hidden";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-amber-500/80";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-white";
    profileRoleClass = "mt-2 text-sm font-semibold text-amber-300";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-400";
    sectionContainerClass = "mx-6 mt-7 rounded-3xl border border-amber-500/10 bg-slate-950/60 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-500/80";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-200";
    primaryBtnClass = "rounded-2xl px-4 py-4 text-center text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]";
    secondaryBtnClass = "rounded-2xl border border-amber-500/40 bg-slate-950/90 px-4 py-4 text-center text-sm font-bold text-amber-200 shadow-sm transition hover:bg-slate-900 hover:border-amber-400 w-full";
    smallSecondaryBtnClass = "rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-center text-sm font-bold text-slate-300 transition hover:bg-slate-900 w-full";
    socialBtnClass = "rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-400 transition hover:bg-slate-900 hover:text-amber-300";
    documentBtnClass = "flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-sm font-bold text-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:bg-slate-900";
    videoContainerClass = "mx-6 mt-7 rounded-3xl border border-amber-500/10 bg-slate-950/60 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-white";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-2xl border border-slate-800 bg-black";
    footerClass = "mt-8 border-t border-slate-800/80 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-amber-500/80";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-500/80";
  } else if (template === "corporate-3") {
    // Polígonos de Lujo
    mainClass = "min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-[1.5rem] border border-slate-800 bg-slate-900/95 shadow-2xl shadow-black relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-double border-amber-500/60 bg-slate-950 text-4xl font-black text-white shadow-lg overflow-hidden";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-slate-400";
    profileNameClass = "mt-3 text-3xl font-extrabold tracking-tight text-white";
    profileRoleClass = "mt-2 text-sm font-semibold text-slate-300";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-500";
    sectionContainerClass = "mx-6 mt-7 rounded-2xl border border-slate-800 bg-slate-950/50 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-300";
    primaryBtnClass = "rounded-2xl px-4 py-4 text-center text-sm font-bold text-amber-400 shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-slate-950 border border-amber-500/30 hover:bg-slate-900 hover:border-amber-400";
    secondaryBtnClass = "rounded-2xl px-4 py-4 text-center text-sm font-bold text-slate-950 shadow-lg transition hover:-translate-y-0.5 w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 font-black shadow-amber-500/20 hover:brightness-110 cursor-pointer";
    smallSecondaryBtnClass = "rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-center text-sm font-bold text-slate-300 transition hover:bg-slate-900 w-full";
    socialBtnClass = "rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-400 transition hover:bg-slate-900 hover:text-white";
    documentBtnClass = "flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-900";
    videoContainerClass = "mx-6 mt-7 rounded-2xl border border-slate-800 bg-slate-950/50 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-white";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-2xl border border-slate-800 bg-black";
    footerClass = "mt-8 border-t border-slate-800/80 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-500";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400";
  } else if (template === "corporate-4") {
    // Crema y Oro
    mainClass = "min-h-screen bg-[#fdfaf6] text-amber-950 transition-colors duration-300 flex items-center justify-center px-4 py-8 relative overflow-hidden";
    articleClass = "w-full max-w-md overflow-hidden rounded-[2rem] border border-[#dfd0b0] bg-[#f9f5eb]/90 backdrop-blur-md shadow-xl shadow-amber-950/5 relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-full border-2 border-[#bfa26c] bg-[#fdfaf6] text-4xl font-black text-amber-900 shadow-md overflow-hidden";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#8c6d31]";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-[#3c2f1d]";
    profileRoleClass = "mt-2 text-sm font-semibold text-[#8c6d31]";
    profileCompanyClass = "mt-1 text-xs font-semibold text-[#6e5d47]";
    sectionContainerClass = "mx-6 mt-7 rounded-3xl border border-[#e8dfc7] bg-[#faf6ec] px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8c6d31]";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-[#5a4628]";
    primaryBtnClass = "rounded-2xl px-4 py-4 text-center text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-[#8c6d31] hover:bg-[#765c29] shadow-amber-800/10";
    secondaryBtnClass = "rounded-2xl border border-[#bfa26c]/60 bg-[#fdfaf6] px-4 py-4 text-center text-sm font-bold text-[#5a4628] shadow-sm transition hover:bg-[#faf6ed] hover:border-[#a38753] w-full";
    smallSecondaryBtnClass = "rounded-2xl border border-[#e8dfc7] bg-[#fdfaf6] px-4 py-3 text-center text-sm font-bold text-[#5a4628] transition hover:bg-[#faf6ed] w-full";
    socialBtnClass = "rounded-full border border-[#e8dfc7] bg-[#fdfaf6] px-4 py-2 text-xs font-bold text-[#6e5d47] transition hover:bg-[#faf6ed] hover:text-[#3c2f1d] hover:border-[#bfa26c]";
    documentBtnClass = "flex w-full items-center justify-between rounded-2xl border border-[#e8dfc7] bg-[#fdfaf6] px-4 py-4 text-sm font-bold text-[#5a4628] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#faf6ed]";
    videoContainerClass = "mx-6 mt-7 rounded-3xl border border-[#e8dfc7] bg-[#faf6ec] p-4";
    videoTitleClass = "mt-2 text-base font-bold text-[#3c2f1d]";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-2xl border border-[#dfd0b0] bg-black";
    footerClass = "mt-8 border-t border-[#dfd0b0]/80 px-6 py-6 text-center";
    locationClass = "text-xs text-[#6e5d47]";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#8c6d31]/80";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8c6d31]";
  } else if (template === "corporate-5") {
    // Horizonte Elite / Skyline
    mainClass = "min-h-screen bg-slate-950 text-white transition-colors duration-300 flex items-center justify-center px-4 py-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black relative overflow-hidden";
    articleClass = "w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-2xl shadow-black relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-full border-2 border-slate-700 bg-slate-950 text-4xl font-black text-white shadow-lg overflow-hidden";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-slate-400";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-white";
    profileRoleClass = "mt-2 text-sm font-semibold text-slate-300";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-400";
    sectionContainerClass = "mx-6 mt-7 rounded-3xl border border-slate-800/80 bg-slate-950/40 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-300";
    primaryBtnClass = "rounded-2xl px-4 py-4 text-center text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border border-slate-700 hover:border-slate-500";
    secondaryBtnClass = "rounded-2xl border border-amber-500/40 bg-slate-950 px-4 py-4 text-center text-sm font-bold text-amber-300 shadow-sm transition hover:bg-slate-900 hover:border-amber-400 w-full";
    smallSecondaryBtnClass = "rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-center text-sm font-bold text-slate-200 transition hover:bg-slate-900 w-full";
    socialBtnClass = "rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-400 transition hover:bg-slate-900 hover:text-white";
    documentBtnClass = "flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm font-bold text-slate-250 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-900";
    videoContainerClass = "mx-6 mt-7 rounded-3xl border border-slate-800/80 bg-slate-950/40 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-white";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-2xl border border-slate-800 bg-black";
    footerClass = "mt-8 border-t border-slate-800/80 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-500";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400";
  } else if (template === "personal-1") {
    // Minimalista Notion
    mainClass = "min-h-screen bg-[#fafafa] text-black transition-colors duration-300 flex items-center justify-center px-4 py-8 relative overflow-hidden";
    articleClass = "w-full max-w-md overflow-hidden rounded-xl border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative z-10 pb-6";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-full border-2 border-black bg-white text-4xl font-black text-black overflow-hidden";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-slate-500";
    profileNameClass = "mt-3 text-3xl font-bold tracking-tight text-black font-sans";
    profileRoleClass = "mt-2 text-sm font-semibold text-slate-700";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-500";
    sectionContainerClass = "mx-6 mt-7 rounded-xl border border-slate-300 bg-[#f4f4f5] px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-800";
    primaryBtnClass = "rounded-xl px-4 py-4 text-center text-sm font-bold text-white shadow-sm transition hover:translate-x-[1px] hover:translate-y-[1px] w-full flex items-center justify-center gap-2 cursor-pointer bg-black hover:bg-slate-900 border-2 border-black";
    secondaryBtnClass = "rounded-xl border-2 border-black bg-white px-4 py-4 text-center text-sm font-bold text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:bg-slate-50 w-full";
    smallSecondaryBtnClass = "rounded-xl border-2 border-black bg-white px-4 py-3 text-center text-sm font-bold text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:bg-slate-50 w-full";
    socialBtnClass = "rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-black hover:border-black";
    documentBtnClass = "flex w-full items-center justify-between rounded-xl border-2 border-black bg-white px-4 py-4 text-sm font-bold text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition hover:bg-slate-50";
    videoContainerClass = "mx-6 mt-7 rounded-xl border border-slate-300 bg-[#f4f4f5] p-4";
    videoTitleClass = "mt-2 text-base font-bold text-black";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-xl border border-slate-350 bg-black";
    footerClass = "mt-8 border-t border-slate-200 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-500";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500";
  } else if (template === "personal-2") {
    // Vibrante Stripe
    mainClass = "min-h-screen bg-[#0b0f19] text-white flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/70 backdrop-blur-xl shadow-2xl shadow-black relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-white/20 bg-slate-950 text-4xl font-black text-white shadow-xl overflow-hidden";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-violet-400";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-white";
    profileRoleClass = "mt-2 text-sm font-semibold text-slate-200";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-400";
    sectionContainerClass = "mx-6 mt-7 rounded-3xl border border-white/5 bg-slate-950/40 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-violet-400";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-300";
    primaryBtnClass = "rounded-2xl px-4 py-4 text-center text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-500 hover:to-indigo-500 shadow-violet-500/20";
    secondaryBtnClass = "rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-4 text-center text-sm font-bold text-slate-200 shadow-sm transition hover:bg-slate-900 w-full";
    smallSecondaryBtnClass = "rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-center text-sm font-bold text-slate-200 transition hover:bg-slate-900 w-full";
    socialBtnClass = "rounded-full border border-white/10 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-400 transition hover:bg-slate-900 hover:text-white";
    documentBtnClass = "flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-950/85 px-4 py-4 text-sm font-bold text-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:bg-slate-900";
    videoContainerClass = "mx-6 mt-7 rounded-3xl border border-white/5 bg-slate-950/40 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-white";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black";
    footerClass = "mt-8 border-t border-white/5 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-violet-400";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-violet-400";
  } else if (template === "personal-3") {
    // LinkedIn Premium
    mainClass = "min-h-screen bg-[#0f172a] text-white flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-800 bg-[#1b2226]/95 shadow-2xl shadow-black relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-full ring-4 ring-[#c7a75c] ring-offset-4 ring-offset-[#1b2226] bg-[#1d2226] text-4xl font-black text-white shadow-xl overflow-hidden";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#c7a75c]";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-white";
    profileRoleClass = "mt-2 text-sm font-semibold text-slate-200";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-400";
    sectionContainerClass = "mx-6 mt-7 rounded-3xl border border-slate-800 bg-slate-950/40 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#c7a75c]";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-300";
    primaryBtnClass = "rounded-2xl px-4 py-4 text-center text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-[#0a66c2] hover:bg-[#004182]";
    secondaryBtnClass = "rounded-2xl border border-[#c7a75c] bg-[#1b2226] px-4 py-4 text-center text-sm font-bold text-[#c7a75c] shadow-sm transition hover:bg-[#c7a75c]/10 w-full";
    smallSecondaryBtnClass = "rounded-2xl border border-slate-800 bg-[#1d2226] px-4 py-3 text-center text-sm font-bold text-slate-250 transition hover:bg-slate-950 w-full";
    socialBtnClass = "rounded-full border border-slate-800 bg-[#1d2226] px-4 py-2 text-xs font-bold text-slate-400 transition hover:bg-slate-950 hover:text-white";
    documentBtnClass = "flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-[#1d2226] px-4 py-4 text-sm font-bold text-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:bg-slate-950";
    videoContainerClass = "mx-6 mt-7 rounded-3xl border border-slate-800 bg-slate-950/40 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-white";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-2xl border border-slate-800 bg-black";
    footerClass = "mt-8 border-t border-slate-800/80 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#c7a75c]";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#c7a75c]";
  } else if (template === "personal-4") {
    // Tarjeta Creadora / Neon Grid
    mainClass = "min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-[2.5rem] border border-slate-850 bg-slate-900/90 backdrop-blur-md shadow-[0_0_50px_-12px_rgba(255,255,255,0.1)] relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-pink-500/50 bg-slate-950 text-4xl font-black text-white shadow-lg overflow-hidden";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-pink-500";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-white";
    profileRoleClass = "mt-2 text-sm font-semibold text-slate-300";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-500";
    sectionContainerClass = "mx-6 mt-7 rounded-3xl border border-slate-800/80 bg-slate-950/60 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-pink-500";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-350";
    primaryBtnClass = "rounded-2xl px-4 py-4 text-center text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 hover:brightness-110 shadow-pink-500/10";
    secondaryBtnClass = "rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-center text-sm font-bold text-slate-200 shadow-sm transition hover:bg-slate-900 w-full";
    smallSecondaryBtnClass = "rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-center text-sm font-bold text-slate-200 transition hover:bg-slate-900 w-full";
    socialBtnClass = "rounded-2xl border border-pink-500/30 bg-slate-950 px-4 py-2.5 text-xs font-bold text-pink-400 transition hover:border-pink-500 hover:text-white";
    documentBtnClass = "flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-sm font-bold text-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:bg-slate-900";
    videoContainerClass = "mx-6 mt-7 rounded-3xl border border-slate-850 bg-slate-950/60 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-white";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-2xl border border-slate-800 bg-black";
    footerClass = "mt-8 border-t border-slate-800/80 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-pink-500";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-pink-500";
  } else if (template === "personal-5") {
    // Coach Cálido
    mainClass = "min-h-screen bg-[#f7f2ea] text-[#5c4a3c] flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-[2.5rem] border border-[#e5ded0] bg-[#faf8f5] shadow-xl shadow-[#5c4a3c]/5 relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-[#d48c70] bg-[#f7f2ea] text-4xl font-black text-[#5c4a3c] shadow-md overflow-hidden";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#d48c70]";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-[#423327]";
    profileRoleClass = "mt-2 text-sm font-semibold text-[#d48c70]";
    profileCompanyClass = "mt-1 text-xs font-semibold text-[#806c5d]";
    sectionContainerClass = "mx-6 mt-7 rounded-[2rem] border border-[#eee9df] bg-[#fdfdfc] px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#d48c70]";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-[#5c4a3c]";
    primaryBtnClass = "rounded-2xl px-4 py-4 text-center text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-[#d48c70] hover:bg-[#bf7a5f]";
    secondaryBtnClass = "rounded-2xl border border-[#d48c70]/60 bg-[#fdfdfc] px-4 py-4 text-center text-sm font-bold text-[#5c4a3c] shadow-sm transition hover:bg-[#faf8f5] w-full";
    smallSecondaryBtnClass = "rounded-2xl border border-[#eee9df] bg-[#fdfdfc] px-4 py-3 text-center text-sm font-bold text-[#5c4a3c] transition hover:bg-[#faf8f5] w-full";
    socialBtnClass = "rounded-full border border-[#eee9df] bg-[#fdfdfc] px-4 py-2 text-xs font-bold text-[#806c5d] transition hover:bg-[#faf8f5] hover:text-[#423327] hover:border-[#d48c70]";
    documentBtnClass = "flex w-full items-center justify-between rounded-2xl border border-[#eee9df] bg-[#fdfdfc] px-4 py-4 text-sm font-bold text-[#5c4a3c] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#faf8f5]";
    videoContainerClass = "mx-6 mt-7 rounded-[2rem] border border-[#eee9df] bg-[#fdfdfc] p-4";
    videoTitleClass = "mt-2 text-base font-bold text-[#423327]";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-2xl border border-[#eee9df] bg-black";
    footerClass = "mt-8 border-t border-[#eee9df] px-6 py-6 text-center";
    locationClass = "text-xs text-[#806c5d]";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#d48c70]/80";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#d48c70]";
  } else if (template === "comercial-1") {
    // WhatsApp Pro
    mainClass = "min-h-screen bg-[#070b12] text-white flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-[2rem] border border-emerald-500/15 bg-slate-900/90 backdrop-blur-md shadow-2xl shadow-black relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-emerald-500 bg-slate-950 text-4xl font-black text-white shadow-xl overflow-hidden";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-emerald-400";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-white";
    profileRoleClass = "mt-2 text-sm font-semibold text-emerald-300";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-400";
    sectionContainerClass = "mx-6 mt-7 rounded-3xl border border-emerald-500/10 bg-slate-950/60 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-400";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-200";
    primaryBtnClass = "rounded-2xl px-4 py-5 text-center text-base font-extrabold text-white shadow-lg transition hover:scale-[1.02] w-full flex items-center justify-center gap-2 cursor-pointer bg-emerald-500 hover:bg-emerald-600 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse";
    secondaryBtnClass = "rounded-2xl border border-emerald-500/30 bg-slate-950 px-4 py-4 text-center text-sm font-bold text-emerald-300 shadow-sm transition hover:bg-slate-900 w-full";
    smallSecondaryBtnClass = "rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-center text-sm font-bold text-slate-350 transition hover:bg-slate-900 w-full";
    socialBtnClass = "rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-400 transition hover:bg-slate-900 hover:text-emerald-400";
    documentBtnClass = "flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-sm font-bold text-slate-250 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-900";
    videoContainerClass = "mx-6 mt-7 rounded-3xl border border-emerald-500/10 bg-slate-950/60 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-white";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-2xl border border-slate-800 bg-black";
    footerClass = "mt-8 border-t border-slate-800/80 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-emerald-400/80";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-400";
  } else if (template === "comercial-2") {
    // Inmobiliaria Elegante
    mainClass = "min-h-screen bg-[#060a16] text-white flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-[2rem] border border-[#c7a75c]/15 bg-slate-900/90 backdrop-blur-md shadow-2xl shadow-black relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-[#c7a75c] bg-slate-950 text-4xl font-black text-white shadow-xl overflow-hidden";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#c7a75c]";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-white";
    profileRoleClass = "mt-2 text-sm font-semibold text-[#c7a75c]";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-400";
    sectionContainerClass = "mx-6 mt-7 rounded-3xl border border-[#c7a75c]/10 bg-slate-950/60 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#c7a75c]";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-200";
    primaryBtnClass = "rounded-2xl px-4 py-5 text-center text-sm font-black tracking-wider text-slate-950 shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-[#c7a75c] hover:bg-[#b0934f] uppercase";
    secondaryBtnClass = "rounded-2xl border border-[#c7a75c]/50 bg-slate-950 px-4 py-4 text-center text-sm font-bold text-[#c7a75c] shadow-sm transition hover:bg-[#c7a75c]/10 w-full";
    smallSecondaryBtnClass = "rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-center text-sm font-bold text-slate-300 transition hover:bg-slate-900 w-full";
    socialBtnClass = "rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-400 transition hover:bg-slate-900 hover:text-[#c7a75c]";
    documentBtnClass = "flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-sm font-bold text-slate-250 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-900";
    videoContainerClass = "mx-6 mt-7 rounded-3xl border border-[#c7a75c]/10 bg-slate-950/60 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-white";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-2xl border border-slate-800 bg-black";
    footerClass = "mt-8 border-t border-slate-800/80 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#c7a75c]/80";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#c7a75c]";
  } else if (template === "comercial-3") {
    // Automotriz Dinámico
    mainClass = "min-h-screen bg-[#0c0c0e] text-white flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-[2rem] border border-red-650/15 bg-zinc-900/90 backdrop-blur-md shadow-2xl shadow-black relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-red-600 bg-slate-950 text-4xl font-black text-white shadow-xl overflow-hidden";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-red-500";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-white";
    profileRoleClass = "mt-2 text-sm font-semibold text-red-400";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-400";
    sectionContainerClass = "mx-6 mt-7 rounded-3xl border border-red-650/10 bg-zinc-950/60 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-red-500";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-200";
    primaryBtnClass = "rounded-2xl px-4 py-5 text-center text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-red-600 hover:bg-red-700 shadow-red-650/20";
    secondaryBtnClass = "rounded-2xl border border-red-500/40 bg-slate-950 px-4 py-4 text-center text-sm font-bold text-red-400 shadow-sm transition hover:bg-zinc-900 w-full";
    smallSecondaryBtnClass = "rounded-2xl border border-zinc-800 bg-slate-950/80 px-4 py-3 text-center text-sm font-bold text-slate-350 transition hover:bg-zinc-900 w-full";
    socialBtnClass = "rounded-full border border-zinc-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-400 transition hover:bg-zinc-900 hover:text-red-500";
    documentBtnClass = "flex w-full items-center justify-between rounded-2xl border border-zinc-800 bg-slate-950/80 px-4 py-4 text-sm font-bold text-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:bg-zinc-900";
    videoContainerClass = "mx-6 mt-7 rounded-3xl border border-red-650/10 bg-zinc-955/60 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-white";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-2xl border border-zinc-800 bg-black";
    footerClass = "mt-8 border-t border-zinc-800/80 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-red-500/80";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-red-500";
  } else if (template === "comercial-4") {
    // Agenda Express
    mainClass = "min-h-screen bg-[#0f0c29] text-white flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-[2rem] border border-indigo-500/15 bg-[#161238]/90 backdrop-blur-md shadow-2xl shadow-black relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-indigo-500 bg-slate-950 text-4xl font-black text-white shadow-xl overflow-hidden";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-indigo-400";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-white";
    profileRoleClass = "mt-2 text-sm font-semibold text-indigo-300";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-450";
    sectionContainerClass = "mx-6 mt-7 rounded-3xl border border-indigo-500/10 bg-[#0c0820]/60 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-indigo-400";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-200";
    primaryBtnClass = "rounded-2xl px-4 py-5 text-center text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-indigo-500 to-purple-600 shadow-indigo-500/20";
    secondaryBtnClass = "rounded-2xl border border-indigo-500/40 bg-slate-950 px-4 py-4 text-center text-sm font-bold text-indigo-300 shadow-sm transition hover:bg-[#0c0820] w-full";
    smallSecondaryBtnClass = "rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-3 text-center text-sm font-bold text-slate-350 transition hover:bg-[#0c0820] w-full";
    socialBtnClass = "rounded-full border border-slate-800/80 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-450 transition hover:bg-[#0c0820] hover:text-[#c7a75c]";
    documentBtnClass = "flex w-full items-center justify-between rounded-2xl border border-slate-850 bg-slate-950/80 px-4 py-4 text-sm font-bold text-slate-200 shadow-sm transition hover:bg-[#0c0820]";
    videoContainerClass = "mx-6 mt-7 rounded-3xl border border-indigo-500/10 bg-[#0c0820]/60 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-white";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-2xl border border-slate-855 bg-black";
    footerClass = "mt-8 border-t border-slate-850/80 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-indigo-400/80";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-indigo-400";
  } else if (template === "comercial-5") {
    // Catálogo Express
    mainClass = "min-h-screen bg-[#110d0a] text-white flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-[2rem] border border-amber-500/15 bg-[#1b1511]/90 backdrop-blur-md shadow-2xl shadow-black relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-amber-500 bg-slate-950 text-4xl font-black text-white shadow-xl overflow-hidden";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-amber-500";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-white";
    profileRoleClass = "mt-2 text-sm font-semibold text-amber-400";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-400";
    sectionContainerClass = "mx-6 mt-7 rounded-3xl border border-amber-500/10 bg-[#0d0907]/60 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-500";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-200";
    primaryBtnClass = "rounded-2xl px-4 py-5 text-center text-sm font-black text-slate-950 shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-amber-500 hover:bg-amber-600 shadow-amber-500/20";
    secondaryBtnClass = "rounded-2xl border border-amber-500/40 bg-slate-950 px-4 py-4 text-center text-sm font-bold text-amber-350 shadow-sm transition hover:bg-[#0d0907] w-full";
    smallSecondaryBtnClass = "rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-3 text-center text-sm font-bold text-slate-350 transition hover:bg-[#0d0907] w-full";
    socialBtnClass = "rounded-full border border-slate-800/80 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-400 transition hover:bg-[#0d0907] hover:text-[#c7a75c]";
    documentBtnClass = "flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-sm font-bold text-slate-250 shadow-sm transition hover:bg-[#0d0907]";
    videoContainerClass = "mx-6 mt-7 rounded-3xl border border-amber-500/10 bg-[#0d0907]/60 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-white";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-2xl border border-slate-800 bg-black";
    footerClass = "mt-8 border-t border-slate-850/80 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-amber-500/80";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-500";

  } else if (template === "business-1") {
    // Restaurante / Gourmet
    mainClass = "min-h-screen bg-[#0d0907] text-white flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-[2rem] border border-amber-600/15 bg-[#17110e]/95 backdrop-blur-md shadow-2xl shadow-black relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-amber-500 bg-slate-950 text-4xl font-black text-white shadow-xl overflow-hidden";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-amber-500";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-white font-serif";
    profileRoleClass = "mt-2 text-sm font-semibold text-amber-400";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-400";
    sectionContainerClass = "mx-6 mt-7 rounded-3xl border border-amber-600/10 bg-slate-950/60 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-500";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-200";
    primaryBtnClass = "rounded-2xl px-4 py-4 text-center text-sm font-bold text-slate-950 shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 font-extrabold hover:brightness-110 shadow-amber-500/10";
    secondaryBtnClass = "rounded-2xl border border-amber-500/30 bg-slate-950 px-4 py-4 text-center text-sm font-bold text-amber-300 shadow-sm transition hover:bg-slate-900 w-full";
    smallSecondaryBtnClass = "rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-center text-sm font-bold text-slate-300 transition hover:bg-slate-900 w-full";
    socialBtnClass = "rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-450 transition hover:bg-slate-900 hover:text-amber-500";
    documentBtnClass = "flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-sm font-bold text-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-900";
    videoContainerClass = "mx-6 mt-7 rounded-3xl border border-amber-600/10 bg-slate-950/60 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-white";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-2xl border border-slate-800 bg-black";
    footerClass = "mt-8 border-t border-slate-800/80 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-amber-500/80";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-500";
  } else if (template === "business-2") {
    // Construcción / Obras
    mainClass = "min-h-screen bg-[#111111] text-white flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-3xl border border-yellow-500/10 bg-[#1a1a1a] shadow-2xl relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-2xl border-4 border-yellow-550 bg-[#111] text-4xl font-black text-white shadow-xl overflow-hidden";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-yellow-500";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-white uppercase";
    profileRoleClass = "mt-2 text-sm font-semibold text-yellow-450";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-400";
    sectionContainerClass = "mx-6 mt-7 rounded-2xl border border-zinc-800 bg-zinc-955/60 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-yellow-500";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-200";
    primaryBtnClass = "rounded-xl px-4 py-4 text-center text-sm font-black text-[#111] shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-yellow-500 hover:bg-yellow-600 uppercase";
    secondaryBtnClass = "rounded-xl border border-yellow-500/30 bg-[#111] px-4 py-4 text-center text-sm font-bold text-yellow-450 shadow-sm transition hover:bg-zinc-900 w-full";
    smallSecondaryBtnClass = "rounded-xl border border-zinc-800 bg-[#111] px-4 py-3 text-center text-sm font-bold text-slate-300 transition hover:bg-zinc-900 w-full";
    socialBtnClass = "rounded-xl border border-zinc-800 bg-[#111] px-4 py-2.5 text-xs font-bold text-slate-400 transition hover:bg-zinc-900 hover:text-yellow-500";
    documentBtnClass = "flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-[#111] px-4 py-4 text-sm font-bold text-slate-200 shadow-sm transition hover:bg-zinc-900";
    videoContainerClass = "mx-6 mt-7 rounded-2xl border border-zinc-800 bg-zinc-955/60 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-white";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-xl border border-zinc-850 bg-black";
    footerClass = "mt-8 border-t border-zinc-850/80 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-yellow-500/80";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-yellow-500";
  } else if (template === "business-3") {
    // Clínica / Salud (Claro)
    mainClass = "min-h-screen bg-[#eef6f9] text-[#1e3a8a] flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-[2.5rem] border border-sky-100 bg-white/95 backdrop-blur-md shadow-xl shadow-sky-900/5 relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-sky-400 bg-white text-4xl font-black text-sky-600 shadow-md overflow-hidden";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-sky-650";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-[#1e293b]";
    profileRoleClass = "mt-2 text-sm font-semibold text-sky-500";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-500";
    sectionContainerClass = "mx-6 mt-7 rounded-3xl border border-sky-50 bg-sky-50/50 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-sky-600";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-600";
    primaryBtnClass = "rounded-2xl px-4 py-4 text-center text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-sky-500 hover:bg-sky-600";
    secondaryBtnClass = "rounded-2xl border border-sky-200 bg-white px-4 py-4 text-center text-sm font-bold text-sky-600 shadow-sm transition hover:bg-sky-50 w-full";
    smallSecondaryBtnClass = "rounded-2xl border border-slate-100 bg-white px-4 py-3 text-center text-sm font-bold text-slate-600 transition hover:bg-sky-50 w-full";
    socialBtnClass = "rounded-full border border-sky-100 bg-white px-4 py-2 text-xs font-bold text-sky-500 transition hover:bg-sky-50 hover:text-sky-600";
    documentBtnClass = "flex w-full items-center justify-between rounded-2xl border border-sky-100 bg-white px-4 py-4 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-sky-50";
    videoContainerClass = "mx-6 mt-7 rounded-3xl border border-sky-50 bg-sky-50/50 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-[#1e293b]";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-2xl border border-sky-100 bg-black";
    footerClass = "mt-8 border-t border-slate-100 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-sky-600/80";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-sky-600";
  } else if (template === "business-4") {
    // Empresa Corporativa (Claro)
    mainClass = "min-h-screen bg-[#f3f4f6] text-[#0f172a] flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-4xl font-black text-slate-800 shadow-sm overflow-hidden";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-slate-500";
    profileNameClass = "mt-3 text-3xl font-extrabold tracking-tight text-slate-900";
    profileRoleClass = "mt-2 text-sm font-semibold text-slate-650";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-400";
    sectionContainerClass = "mx-6 mt-7 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-600";
    primaryBtnClass = "rounded-xl px-4 py-4 text-center text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-slate-900 hover:bg-slate-800";
    secondaryBtnClass = "rounded-xl border border-slate-300 bg-white px-4 py-4 text-center text-sm font-bold text-slate-805 shadow-sm transition hover:bg-slate-50 w-full";
    smallSecondaryBtnClass = "rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-600 transition hover:bg-slate-50 w-full";
    socialBtnClass = "rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900";
    documentBtnClass = "flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50";
    videoContainerClass = "mx-6 mt-7 rounded-2xl border border-slate-100 bg-slate-50 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-slate-900";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-xl border border-slate-200 bg-black";
    footerClass = "mt-8 border-t border-slate-100 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-500/80";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500";
  } else if (template === "business-5") {
    // Catálogo Galería
    mainClass = "min-h-screen bg-[#08080a] text-white flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-[2rem] border border-[#d4af37]/15 bg-slate-900/95 backdrop-blur-md shadow-2xl shadow-black relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-[#d4af37] bg-slate-950 text-4xl font-black text-white shadow-xl overflow-hidden";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#d4af37]";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-white";
    profileRoleClass = "mt-2 text-sm font-semibold text-[#d4af37]";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-450";
    sectionContainerClass = "mx-6 mt-7 rounded-3xl border border-slate-800 bg-slate-950/60 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#d4af37]";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-200";
    primaryBtnClass = "rounded-2xl px-4 py-5 text-center text-sm font-black text-slate-950 shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-amber-400 to-[#d4af37] shadow-amber-500/10";
    secondaryBtnClass = "rounded-2xl border border-[#d4af37]/50 bg-slate-950 px-4 py-4 text-center text-sm font-bold text-[#d4af37] shadow-sm transition hover:bg-[#d4af37]/10 w-full";
    smallSecondaryBtnClass = "rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-center text-sm font-bold text-slate-350 transition hover:bg-slate-900 w-full";
    socialBtnClass = "rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-400 transition hover:bg-slate-900 hover:text-[#d4af37]";
    documentBtnClass = "flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-sm font-bold text-[#d4af37] shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-900";
    videoContainerClass = "mx-6 mt-7 rounded-3xl border border-[#d4af37]/10 bg-slate-950/60 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-white";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-2xl border border-slate-800 bg-black";
    footerClass = "mt-8 border-t border-slate-800/80 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#d4af37]/80";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#d4af37]";
  } else if (template === "creator-1") {
    // Minería (MegaSSO)
    mainClass = "min-h-screen bg-[#111111] text-white flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-3xl border border-orange-500/15 bg-zinc-950/95 shadow-2xl relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-2xl border-4 border-orange-500 bg-zinc-900 text-white font-bold overflow-hidden shadow-lg";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-orange-500";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-white uppercase";
    profileRoleClass = "mt-2 text-sm font-semibold text-orange-455";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-400";
    sectionContainerClass = "mx-6 mt-7 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-orange-500";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-350";
    primaryBtnClass = "rounded-xl px-4 py-4 text-center text-sm font-black text-slate-950 shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-orange-500 hover:bg-orange-600 uppercase shadow-orange-500/10";
    secondaryBtnClass = "rounded-xl border border-orange-550/30 bg-zinc-950 px-4 py-4 text-center text-sm font-bold text-orange-450 shadow-sm transition hover:bg-zinc-900 w-full";
    smallSecondaryBtnClass = "rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-center text-sm font-bold text-slate-300 transition hover:bg-zinc-900 w-full";
    socialBtnClass = "rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs font-bold text-slate-450 transition hover:bg-[#1a1a1a] hover:text-orange-500";
    documentBtnClass = "flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-sm font-bold text-slate-200 shadow-sm transition hover:bg-zinc-900";
    videoContainerClass = "mx-6 mt-7 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-white";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-xl border border-zinc-850 bg-black";
    footerClass = "mt-8 border-t border-zinc-850/80 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-orange-500/80";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-orange-500";
  } else if (template === "creator-2") {
    // Energía Solar
    mainClass = "min-h-screen bg-[#070f0b] text-white flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-[2.5rem] border border-emerald-500/10 bg-[#0c1812]/95 backdrop-blur-md shadow-2xl relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-yellow-500 bg-slate-950 text-white font-bold overflow-hidden shadow-lg";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-yellow-500";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-white";
    profileRoleClass = "mt-2 text-sm font-semibold text-emerald-400";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-400";
    sectionContainerClass = "mx-6 mt-7 rounded-3xl border border-emerald-500/10 bg-emerald-950/20 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-yellow-500";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-200";
    primaryBtnClass = "rounded-2xl px-4 py-4 text-center text-sm font-bold text-slate-950 shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-yellow-400 to-amber-500 hover:brightness-110 shadow-yellow-500/10";
    secondaryBtnClass = "rounded-2xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-4 text-center text-sm font-bold text-emerald-300 shadow-sm transition hover:bg-emerald-950 w-full";
    smallSecondaryBtnClass = "rounded-2xl border border-slate-800 bg-emerald-950/30 px-4 py-3 text-center text-sm font-bold text-slate-350 transition hover:bg-emerald-900 w-full";
    socialBtnClass = "rounded-full border border-slate-800 bg-[#0c1812] px-4 py-2 text-xs font-bold text-slate-400 transition hover:bg-emerald-900 hover:text-yellow-500";
    documentBtnClass = "flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-[#0c1812] px-4 py-4 text-sm font-bold text-emerald-300 shadow-sm transition hover:bg-emerald-900";
    videoContainerClass = "mx-6 mt-7 rounded-3xl border border-emerald-500/10 bg-emerald-950/20 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-white";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-2xl border border-slate-850 bg-black";
    footerClass = "mt-8 border-t border-slate-850/80 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-yellow-500/80";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-yellow-500";
  } else if (template === "creator-3") {
    // Educación
    mainClass = "min-h-screen bg-[#f1f5f9] text-[#1e293b] flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-indigo-650 bg-white text-indigo-750 font-bold overflow-hidden shadow-md";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-indigo-650";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-[#0f172a]";
    profileRoleClass = "mt-2 text-sm font-semibold text-slate-500";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-450";
    sectionContainerClass = "mx-6 mt-7 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-indigo-600";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-650";
    primaryBtnClass = "rounded-xl px-4 py-4 text-center text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10";
    secondaryBtnClass = "rounded-xl border border-indigo-200 bg-white px-4 py-4 text-center text-sm font-bold text-indigo-600 shadow-sm transition hover:bg-indigo-50 w-full";
    smallSecondaryBtnClass = "rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-600 transition hover:bg-slate-50 w-full";
    socialBtnClass = "rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-indigo-650";
    documentBtnClass = "flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50";
    videoContainerClass = "mx-6 mt-7 rounded-2xl border border-slate-100 bg-slate-50 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-[#0f172a]";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-xl border border-slate-200 bg-black";
    footerClass = "mt-8 border-t border-slate-100 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-indigo-650/80";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-indigo-650";
  } else if (template === "creator-4") {
    // Evento
    mainClass = "min-h-screen bg-[#07020d] text-white flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-[2.5rem] border border-fuchsia-500/15 bg-[#0d0415]/95 shadow-[0_0_40px_rgba(217,70,239,0.05)] relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-fuchsia-500 bg-slate-950 text-white font-bold overflow-hidden shadow-lg";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-fuchsia-500";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-white uppercase";
    profileRoleClass = "mt-2 text-sm font-semibold text-fuchsia-400";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-400";
    sectionContainerClass = "mx-6 mt-7 rounded-3xl border border-fuchsia-500/10 bg-[#160a23]/60 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-fuchsia-400";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-200";
    primaryBtnClass = "rounded-2xl px-4 py-4 text-center text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:brightness-110 shadow-fuchsia-600/20";
    secondaryBtnClass = "rounded-2xl border border-fuchsia-500/40 bg-slate-950 px-4 py-4 text-center text-sm font-bold text-fuchsia-350 shadow-sm transition hover:bg-slate-900 w-full";
    smallSecondaryBtnClass = "rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-center text-sm font-bold text-slate-300 transition hover:bg-slate-900 w-full";
    socialBtnClass = "rounded-full border border-slate-855 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-450 transition hover:bg-[#160a23] hover:text-fuchsia-400";
    documentBtnClass = "flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-[#160a23]/60 px-4 py-4 text-sm font-bold text-fuchsia-350 shadow-sm transition hover:bg-[#160a23]";
    videoContainerClass = "mx-6 mt-7 rounded-3xl border border-fuchsia-500/10 bg-[#160a23]/60 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-white";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-2xl border border-slate-800 bg-black";
    footerClass = "mt-8 border-t border-slate-850/80 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-fuchsia-455/80";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-fuchsia-400";
  } else if (template === "creator-5") {
    // Startup
    mainClass = "min-h-screen bg-[#03060a] text-white flex items-center justify-center px-4 py-8 relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-3xl border border-blue-500/10 bg-[#080b11]/95 shadow-2xl relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-2xl border-4 border-blue-550 bg-slate-950 text-white font-bold overflow-hidden shadow-lg";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-blue-500";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-white";
    profileRoleClass = "mt-2 text-sm font-semibold text-blue-400";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-400";
    sectionContainerClass = "mx-6 mt-7 rounded-2xl border border-blue-900/20 bg-blue-950/20 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-blue-400";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-350";
    primaryBtnClass = "rounded-xl px-4 py-4 text-center text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-500 shadow-blue-600/20";
    secondaryBtnClass = "rounded-xl border border-blue-500/30 bg-[#080b11] px-4 py-4 text-center text-sm font-bold text-blue-450 shadow-sm transition hover:bg-blue-955 w-full";
    smallSecondaryBtnClass = "rounded-xl border border-slate-800 bg-[#080b11] px-4 py-3 text-center text-sm font-bold text-slate-300 transition hover:bg-blue-955 w-full";
    socialBtnClass = "rounded-full border border-slate-800 bg-[#080b11] px-4 py-2 text-xs font-bold text-slate-400 transition hover:bg-[#0c1018] hover:text-blue-400";
    documentBtnClass = "flex w-full items-center justify-between rounded-xl border border-slate-800 bg-[#080b11] px-4 py-4 text-sm font-bold text-slate-200 shadow-sm transition hover:bg-blue-955";
    videoContainerClass = "mx-6 mt-7 rounded-2xl border border-blue-900/20 bg-blue-955/20 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-white";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-xl border border-slate-800 bg-black";
    footerClass = "mt-8 border-t border-slate-850/80 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-blue-450/80";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-blue-400";
  } else {
    // corporate-1 (Clásica Dorada) o por defecto
    mainClass = "min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black relative overflow-hidden transition-colors duration-300";
    articleClass = "w-full max-w-md overflow-hidden rounded-[2rem] border-t-4 border-t-amber-500/90 border-x border-b border-slate-800/80 bg-slate-900/90 shadow-2xl shadow-black relative z-10";
    avatarContainerClass = "mx-auto flex h-28 w-28 items-center justify-center rounded-full border-2 border-amber-500/60 bg-slate-950 text-4xl font-black text-white shadow-lg overflow-hidden";
    profileLabelClass = "mt-6 text-[10px] font-extrabold uppercase tracking-[0.3em] text-slate-400";
    profileNameClass = "mt-3 text-3xl font-black tracking-tight text-white";
    profileRoleClass = "mt-2 text-sm font-semibold text-amber-400";
    profileCompanyClass = "mt-1 text-xs font-semibold text-slate-400";
    sectionContainerClass = "mx-6 mt-7 rounded-3xl border border-slate-800/80 bg-slate-950/40 px-5 py-5";
    sectionLabelClass = "text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400";
    sectionTextClass = "mt-2.5 text-sm leading-6 text-slate-300";
    primaryBtnClass = "rounded-2xl px-4 py-4 text-center text-sm font-bold text-slate-950 shadow-md transition hover:-translate-y-0.5 w-full flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-amber-500 to-yellow-600 font-extrabold hover:brightness-110 shadow-amber-500/10";
    secondaryBtnClass = "rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-center text-sm font-bold text-amber-300 shadow-sm transition hover:bg-amber-500/10 hover:border-amber-500/50 w-full";
    smallSecondaryBtnClass = "rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-center text-sm font-bold text-slate-300 transition hover:bg-slate-900 w-full";
    socialBtnClass = "rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-400 transition hover:bg-slate-900 hover:text-amber-400 hover:border-amber-500/30";
    documentBtnClass = "flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-4 text-sm font-bold text-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:bg-slate-900/80";
    videoContainerClass = "mx-6 mt-7 rounded-3xl border border-slate-800/80 bg-slate-950/40 p-4";
    videoTitleClass = "mt-2 text-base font-bold text-white";
    videoIframeWrapperClass = "mt-3 overflow-hidden rounded-2xl border border-slate-800 bg-black";
    footerClass = "mt-8 border-t border-slate-800/80 px-6 py-6 text-center";
    locationClass = "text-xs text-slate-500";
    poweredByClass = "mt-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-500";
    linkSectionLabelClass = "mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400";
  }

  // Fallback styling using brand color if template has no custom designed primary CTA button
  if (
    !template.startsWith("corporate-") &&
    !template.startsWith("personal-") &&
    !template.startsWith("comercial-") &&
    !template.startsWith("business-") &&
    !template.startsWith("creator-")
  ) {
    primaryBtnStyle = { backgroundColor: themeColor };
  }

  return (
    <main className={mainClass} style={template === "corporate-3" ? { backgroundColor: "#020617", backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l20 20-20 20L0 20z' fill='%23d4af37' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E")` } : template === "personal-4" ? { backgroundColor: "#030712", backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='20' height='20' fill='none'/%3E%3Ccircle cx='1' cy='1' r='1' fill='%23ffffff' fill-opacity='0.03'/%3E%3C/svg%3E")` } : template === "corporate-2" ? { backgroundImage: `radial-gradient(circle at 100% 0%, rgba(245, 158, 11, 0.08) 0%, transparent 40%), radial-gradient(circle at 0% 100%, rgba(245, 158, 11, 0.05) 0%, transparent 40%)` } : undefined}>
      {template === "corporate-2" && (
        <>
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-500/3 rounded-full blur-[100px] pointer-events-none" />
        </>
      )}

      {template === "personal-2" && (
        <div className="absolute top-0 left-0 w-full h-[35%] bg-gradient-to-r from-violet-600 via-indigo-650 to-pink-500 -skew-y-6 origin-top-left transform scale-y-110 opacity-90 pointer-events-none z-0" />
      )}
      <article className={articleClass}>
        {isBusiness ? (
          /* MOLDES DE BANNER PARA EMPRESAS */
          <div className="w-full flex flex-col relative">
            {/* Header Bar above the photo */}
            <div className={`pt-6 pb-4 flex flex-col items-center justify-center ${
              template === "business-1" ? "bg-[#17110e]" :
              template === "business-2" ? "bg-[#1a1a1a]" :
              template === "business-3" ? "bg-white" :
              template === "business-4" ? "bg-[#0d162a]" :
              template === "business-5" ? "bg-slate-950" : "bg-[#17110e]"
            }`}>
              {card.logoUrl && template === "business-2" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.logoUrl} alt={card.companyName ?? card.company.name} className="max-h-12 max-w-[80%] object-contain" />
              ) : (
                <div className="flex flex-col items-center">
                  {template === "business-1" && (
                    <>
                      <svg className="w-6 h-6 text-amber-500 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v20" />
                        <path d="M18 2v6c0 2-1 4-3 5v9" />
                        <path d="M6 2v6a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V2" />
                      </svg>
                      <span className="font-serif tracking-widest text-[#d4af37] text-base font-bold uppercase">
                        {card.companyName ?? card.company.name}
                      </span>
                      <span className="text-slate-400 font-sans tracking-[0.25em] text-[8px] font-extrabold uppercase mt-0.5">
                        RESTAURANTE
                      </span>
                    </>
                  )}
                  {template === "business-2" && (
                    <>
                      <svg className="w-6 h-6 text-yellow-500 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="2" width="20" height="20" rx="2" />
                        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
                        <path d="M10 6h4M10 10h4M10 14h4" />
                      </svg>
                      <span className="font-sans font-black tracking-tight text-white text-lg uppercase">
                        {card.companyName ?? card.company.name}
                      </span>
                      <span className="text-[#d4af37] font-sans tracking-[0.25em] text-[8px] font-extrabold uppercase mt-0.5">
                        CONSTRUCCIONES
                      </span>
                    </>
                  )}
                  {template === "business-3" && (
                    <>
                      <svg className="w-6 h-6 text-sky-500 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      <span className="font-sans font-extrabold tracking-tight text-sky-955 text-lg uppercase">
                        {card.companyName ?? card.company.name}
                      </span>
                      <span className="text-sky-500 font-sans tracking-[0.2em] text-[8px] font-extrabold uppercase mt-0.5">
                        CLÍNICA INTEGRAL
                      </span>
                    </>
                  )}
                  {template === "business-4" && (
                    <>
                      <span className="font-serif text-amber-500 text-xl font-bold mb-0.5 tracking-wider">H</span>
                      <span className="font-serif tracking-widest text-[#d4af37] text-base font-bold uppercase">
                        {card.companyName ?? card.company.name}
                      </span>
                      <span className="text-amber-500/80 font-sans tracking-[0.3em] text-[8px] font-extrabold uppercase mt-0.5">
                        HOTEL BOUTIQUE
                      </span>
                    </>
                  )}
                  {template === "business-5" && (
                    <>
                      <svg className="w-6 h-6 text-purple-400 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                      <span className="font-sans font-black tracking-tight text-white text-lg uppercase">
                        {card.companyName ?? card.company.name}
                      </span>
                      <span className="text-purple-400 font-sans tracking-[0.25em] text-[8px] font-extrabold uppercase mt-0.5">
                        AGENCIA DIGITAL
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Banner Cover Photo */}
            <div className={`${card.coverUrl ? "h-48" : "h-32"} w-full relative bg-slate-800`}>
              {card.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.coverUrl}
                  alt="Portada de perfil"
                  className="w-full h-full object-cover block"
                />
              ) : (
                <div 
                  className="w-full h-full opacity-75"
                  style={{
                    background: template === "business-1" ? "linear-gradient(135deg, #17110e 0%, #0d0907 100%)" :
                                template === "business-2" ? "linear-gradient(135deg, #334155 0%, #0f172a 100%)" :
                                template === "business-3" ? "linear-gradient(135deg, #bae6fd 0%, #38bdf8 100%)" :
                                template === "business-4" ? "linear-gradient(135deg, #0d162a 0%, #020617 100%)" :
                                template === "business-5" ? "linear-gradient(135deg, #ddd6fe 0%, #c084fc 100%)" :
                                "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
                  }}
                />
              )}

              {/* Curvas del Banner de Portada de acuerdo al activeBannerStyle */}
              {activeBannerStyle !== "classic" && activeBannerStyle !== "straight" && (
                <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-10 pointer-events-none">
                  {activeBannerStyle === "arc" && (
                    <>
                      <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-10 fill-current" style={{ color: getTemplateBgColor(template) }}>
                        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0C26.9,4.75,55.05,16.32,80,29.35,140.75,61,207.77,77.51,321.39,56.44Z" />
                      </svg>
                      <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full h-10 text-amber-500/40 stroke-current stroke-2 fill-none">
                        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3" />
                      </svg>
                    </>
                  )}

                  {activeBannerStyle === "wave" && (
                    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-8 fill-current" style={{ color: getTemplateBgColor(template) }}>
                      <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86C207.77,77.51,140.75,61,80,29.35,55.05,16.32,26.9,4.75,0,0V120H1200V95.83C1132.19,118.92,1055.71,111.31,985.66,92.83Z" />
                    </svg>
                  )}

                  {activeBannerStyle === "arch" && (
                    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-8 fill-current" style={{ color: getTemplateBgColor(template) }}>
                      <path d="M0,0V120H1200V0C1023.2,54.39,813.06,86.5,600,86.5S176.8,54.39,0,0Z" />
                    </svg>
                  )}

                  {activeBannerStyle === "diagonal" && (
                    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-10 fill-current" style={{ color: getTemplateBgColor(template) }}>
                      <path d="M0,0V120H1200V0C1055.71,61.31,906.67,52,743.84,24.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86C207.77,77.51,140.75,61,80,29.35,55.05,16.32,26.9,4.75,0,0Z" />
                    </svg>
                  )}
                </div>
              )}

              {/* Insignia Central Overlapping (Solo para business-1, 3, 4, 5) */}
              {template !== "business-2" && (
                <div className="absolute bottom-[-32px] left-1/2 transform -translate-x-1/2 z-20">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-2 overflow-hidden ${
                    template === "business-1" ? "border-amber-500 bg-[#17110e] text-amber-500" :
                    template === "business-3" ? "border-sky-400 bg-sky-500 text-white" :
                    template === "business-4" ? "border-amber-500 bg-[#0d162a] text-amber-500" :
                    template === "business-5" ? "border-purple-500 bg-white text-purple-650" : "border-slate-500 bg-slate-900"
                  }`}>
                    {card.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={card.logoUrl} alt="Logo" className="w-full h-full object-contain p-2.5 bg-white" />
                    ) : (
                      <>
                        {template === "business-1" && (
                          <svg className="w-7 h-7 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2v20" />
                            <path d="M18 2v6c0 2-1 4-3 5v9" />
                            <path d="M6 2v6a3 3 0 0 0 3 3h0a3 3 0 0 0 3-3V2" />
                          </svg>
                        )}
                        {template === "business-3" && (
                          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        )}
                        {template === "business-4" && (
                          <span className="font-serif text-[#d4af37] text-2xl font-bold">H</span>
                        )}
                        {template === "business-5" && (
                          <svg className="w-7 h-7 text-purple-650" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                          </svg>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* TRADICIONAL MOLDES DE PORTADA */
          <div className={`${card.coverUrl ? "h-auto" : "h-32"} w-full relative bg-slate-800`}>
            {card.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.coverUrl}
                alt="Portada de perfil"
                className="w-full h-auto block"
              />
            ) : template === "corporate-5" ? (
              <div className="w-full h-full relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 flex items-end">
                <div className="absolute inset-0 w-full h-full opacity-35 mix-blend-screen pointer-events-none">
                  <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0,150 L0,120 L20,120 L20,100 L45,100 L45,130 L60,130 L60,85 L85,85 L85,115 L105,115 L105,70 L135,70 L135,125 L150,125 L150,95 L175,95 L175,130 L190,130 L190,60 L220,60 L220,110 L240,110 L240,80 L270,80 L270,125 L290,125 L290,105 L315,105 L315,135 L330,135 L330,50 L365,50 L365,115 L385,115 L385,90 L415,90 L415,130 L430,130 L430,75 L460,75 L460,120 L480,120 L480,110 L500,110 L500,150 Z" fill="#d4af37" />
                    <path d="M0,150 L0,130 L30,130 L30,115 L55,115 L55,135 L70,135 L70,100 L95,100 L95,120 L115,120 L115,80 L145,80 L145,130 L160,130 L160,110 L185,110 L185,135 L200,135 L200,75 L230,75 L230,120 L250,120 L250,90 L280,90 L280,130 L300,130 L300,115 L325,115 L325,138 L340,138 L340,65 L375,65 L375,125 L395,125 L395,100 L425,100 L425,135 L440,135 L440,85 L470,85 L470,125 L490,125 L490,115 L500,115 L500,150 Z" fill="#94a3b8" fillOpacity="0.4" />
                  </svg>
                </div>
              </div>
            ) : template === "personal-3" ? (
              <div className="w-full h-full bg-gradient-to-r from-[#1d2226] to-[#0a66c2]" />
            ) : (
              <div 
                className="w-full h-full opacity-65"
                style={{
                  background: `linear-gradient(135deg, ${themeColor} 0%, #0f172a 100%)`
                }}
              />
            )}

            {/* Curvas del Banner de Portada de acuerdo al activeBannerStyle */}
            {activeBannerStyle !== "classic" && activeBannerStyle !== "straight" && (
              <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-10 pointer-events-none">
                {activeBannerStyle === "arc" && (
                  <>
                    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-10 fill-current" style={{ color: getTemplateBgColor(template) }}>
                      <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0C26.9,4.75,55.05,16.32,80,29.35,140.75,61,207.77,77.51,321.39,56.44Z" />
                    </svg>
                    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full h-10 text-amber-500/40 stroke-current stroke-2 fill-none">
                      <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3" />
                    </svg>
                  </>
                )}

                {activeBannerStyle === "wave" && (
                  <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-8 fill-current" style={{ color: getTemplateBgColor(template) }}>
                    <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86C207.77,77.51,140.75,61,80,29.35,55.05,16.32,26.9,4.75,0,0V120H1200V95.83C1132.19,118.92,1055.71,111.31,985.66,92.83Z" />
                  </svg>
                )}

                {activeBannerStyle === "arch" && (
                  <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-8 fill-current" style={{ color: getTemplateBgColor(template) }}>
                    <path d="M0,0V120H1200V0C1023.2,54.39,813.06,86.5,600,86.5S176.8,54.39,0,0Z" />
                  </svg>
                )}

                {activeBannerStyle === "diagonal" && (
                  <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-10 fill-current" style={{ color: getTemplateBgColor(template) }}>
                    <path d="M0,0V120H1200V0C1055.71,61.31,906.67,52,743.84,24.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86C207.77,77.51,140.75,61,80,29.35,55.05,16.32,26.9,4.75,0,0Z" />
                  </svg>
                )}
              </div>
            )}
          </div>
        )}

        {/* Contenido principal */}
        <div className={`px-7 text-center ${
          isBusiness 
            ? (template === "business-2" ? "pt-6" : "pt-12") 
            : "pt-4"
        }`}>
          {/* Foto de Perfil sobrepuesta tradicional (con photoStyle dinámico) */}
          {!isBusiness && (
            <div className="relative -mt-16 mb-6 flex justify-center z-20">
              <div 
                className={getPhotoStyleConfig(card.photoStyle).className}
                style={getPhotoStyleConfig(card.photoStyle).style}
              >
                {card.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.avatarUrl}
                    alt={card.profileName ?? card.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    className="flex h-full w-full items-center justify-center font-bold text-2xl uppercase"
                    style={template === "corporate-4" ? { backgroundColor: "#8c6d31", color: "#fff" } : { backgroundColor: themeColor, color: "#fff" }}
                  >
                    {(card.profileName ?? card.name).slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          )}

          {!isBusiness && card.logoUrl && (
            <div className="mb-6 flex justify-center px-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.logoUrl}
                alt={card.companyName ?? card.company.name}
                className="max-h-16 max-w-full w-auto h-auto object-contain"
              />
            </div>
          )}

          <p className={profileLabelClass}>
            {isBusiness ? "Ficha de Empresa" : "Perfil corporativo"}
          </p>

          <h1 className={profileNameClass}>
            {isBusiness ? (card.companyName ?? card.company.name) : (card.profileName ?? card.name)}
          </h1>

          {isBusiness ? (
            card.role && (
              <p className={profileRoleClass}>
                Servicios y Soluciones
              </p>
            )
          ) : (
            card.role && (
              <p className={profileRoleClass}>
                {card.role}
              </p>
            )
          )}

          {!isBusiness && (
            <p className={profileCompanyClass}>
              {card.companyName ?? card.company.name}
            </p>
          )}
        </div>

        {/* Biografía */}
        {card.bio && (
          <section className={sectionContainerClass}>
            <p className={sectionLabelClass}>
              {isBusiness ? "Nosotros" : "Presentación"}
            </p>
            <p className={sectionTextClass}>
              {card.bio}
            </p>
          </section>
        )}

        {/* Contacto Personal / Representante (solo para plantillas de Empresa si hay datos personales) */}
        {isBusiness && (card.profileName || card.avatarUrl) && (
          <section className={`mx-6 mt-5 p-4 rounded-2xl border flex items-center gap-4 text-left ${
            isLightTemplate
              ? "border-slate-200 bg-slate-50 text-slate-800"
              : "border-slate-800 bg-slate-950/40 text-white"
          }`}>
            {card.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.avatarUrl}
                alt={card.profileName ?? card.name}
                className={`h-12 w-12 rounded-full object-cover border ${
                  isLightTemplate ? "border-slate-300" : "border-slate-700"
                }`}
              />
            )}
            <div>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${
                isLightTemplate ? "text-slate-500" : "text-slate-400"
              }`}>
                Representante Comercial
              </p>
              <h3 className={`text-sm font-bold ${
                isLightTemplate ? "text-slate-900" : "text-white"
              }`}>
                {card.profileName ?? card.name}
              </h3>
              {card.role && (
                <p className={`text-xs ${
                  isLightTemplate ? "text-slate-500" : "text-slate-400"
                }`}>
                  {card.role}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Acciones Rápidas / Canales de contacto */}
        <section className="mx-6 mt-5 grid grid-cols-1 gap-3">
          {whatsapp && (
            <TrackButton
              cardId={card.id}
              eventType="WHATSAPP_CLICK"
              href={`https://wa.me/${whatsapp}`}
              className={primaryBtnClass}
              style={primaryBtnStyle}
            >
              Contactar ahora
            </TrackButton>
          )}

          <TrackButton
            cardId={card.id}
            eventType="VCARD_DOWNLOAD"
            href={vcardUrl}
            className={secondaryBtnClass}
          >
            Guardar contacto
          </TrackButton>

          <div className="grid grid-cols-2 gap-3">
            {phone && (
              <TrackButton
                cardId={card.id}
                eventType="PHONE_CLICK"
                href={`tel:${phone}`}
                className={smallSecondaryBtnClass}
              >
                Llamar
              </TrackButton>
            )}
            {card.email && card.showEmail && (
              <TrackButton
                cardId={card.id}
                eventType="EMAIL_CLICK"
                href={`mailto:${card.email}`}
                className={smallSecondaryBtnClass}
              >
                Email
              </TrackButton>
            )}
          </div>
        </section>

        {/* Enlaces Sociales */}
        {socialLinks.length > 0 && (
          <section className="mx-6 mt-5 flex flex-wrap justify-center gap-2">
            {socialLinks.map((social) => (
              <TrackButton
                key={social.label}
                cardId={card.id}
                eventType="LINK_CLICK"
                href={social.href ?? "#"}
                className={socialBtnClass}
              >
                {social.label}
              </TrackButton>
            ))}
          </section>
        )}

        {/* Enlaces Personalizados */}
        {card.links.length > 0 && (
          <section className="mx-6 mt-7">
            <p className={linkSectionLabelClass}>
              {isBusiness ? "Servicios y Catálogo" : "Documentos y Enlaces"}
            </p>

            <div className="space-y-3">
              {card.links.map((link: any) => (
                <TrackButton
                  key={link.id}
                  cardId={card.id}
                  eventType="LINK_CLICK"
                  href={link.url}
                  className={documentBtnClass}
                >
                  <span>{link.title}</span>
                  <span style={template === "corporate-4" ? { color: "#8c6d31" } : { color: themeColor }}>↗</span>
                </TrackButton>
              ))}
            </div>
          </section>
        )}

        {/* Video Corporativo */}
        {safeVideoUrl && (
          <section className={videoContainerClass}>
            <p className={sectionLabelClass}>
              Video
            </p>

            <h2 className={videoTitleClass}>
              {card.videoTitle ?? "Video corporativo"}
            </h2>

            <div className={videoIframeWrapperClass}>
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

        {/* Formulario de Captura de Leads */}
        <div className="mx-6 mt-7">
          <LeadForm 
            cardId={card.id} 
            themeColor={template === "corporate-4" ? "#8c6d31" : themeColor} 
            themeMode={actualIsDark ? "dark" : "light"} 
          />
        </div>

        {/* Pie de Página */}
        <footer className={footerClass}>
          {card.location && (
            <p className={locationClass}>{card.location}</p>
          )}

          <p className={poweredByClass}>
            Powered by SmartNFC Chile
          </p>
        </footer>
      </article>
    </main>
  );
}
