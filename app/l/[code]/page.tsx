// Landing pública de un Punto Inteligente en modo LANDING.
// No registra visitas: la visita se registró en /t, /q o /p antes de redirigir aquí con ?v=.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadPointLanding } from "../../../lib/local/landing";
import LocalLandingView from "../../../components/local/public/LocalLandingView";

export const dynamic = "force-dynamic";
const CODE = /^[a-zA-Z0-9_-]{3,100}$/;

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ v?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const robots = { index: false, follow: false, nocache: true };
  if (!CODE.test(code)) return { title: "SmartNFC", robots };
  const landing = await loadPointLanding(code);
  return { title: landing.status === "ok" ? landing.brand.displayName : "SmartNFC", robots, referrer: "no-referrer" };
}

function Inactive() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-6 text-center">
      <p className="text-[15px] font-medium text-slate-600">Punto Inteligente temporalmente inactivo</p>
    </main>
  );
}

export default async function PointLandingPage({ params, searchParams }: Props) {
  const { code } = await params;
  if (!CODE.test(code)) return <Inactive />;
  const v = (await searchParams).v;
  const landing = await loadPointLanding(code, typeof v === "string" ? v : null);
  if (landing.status === "inactive") return <Inactive />;
  // El punto volvió a DIRECT (o es CLUB): se entrega su comportamiento vigente por la entrada directa.
  if (landing.status === "direct") redirect(`/p/${code}`);
  return <LocalLandingView brand={landing.brand} actions={landing.actions} />;
}
