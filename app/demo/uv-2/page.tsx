import { notFound } from "next/navigation";
import CampaignLandingContent from "../../../components/soluciones/CampaignLandingContent";
import { uvDemo, uvImage } from "../../../lib/soluciones/uv-demo";

export const metadata = { title: "Prevención UV · SmartNFC", robots: { index: false, follow: false } };

export default function UvDemo() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <main className="min-h-screen bg-slate-100 px-2 py-3 sm:px-6 sm:py-8">
    <div className="mx-auto max-w-3xl"><CampaignLandingContent design={uvDemo.design} blocks={uvDemo.blocks}
      demoMedia={{ [uvImage]: "/images/campaigns/uv-aquaculture.webp" }} /></div>
  </main>;
}
