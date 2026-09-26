// Contenedor mobile-first de las experiencias públicas del Local.
import type { ReactNode } from "react";
import type { ResolvedLocalBrand } from "../../../lib/local/brand";

export default function LocalPublicShell({ brand, children, framed = false }: { brand: ResolvedLocalBrand; children: ReactNode; framed?: boolean }) {
  return (
    <div className={`${framed ? "min-h-full" : "min-h-screen"} w-full bg-[#f6f7f9] text-slate-900`}
      style={{ backgroundImage: `linear-gradient(180deg, ${brand.primaryColor}0f 0%, transparent 320px)` }}>
      <div className="mx-auto flex min-h-full w-full max-w-[440px] flex-col">
        {children}
        <footer className="mt-auto px-6 pb-7 pt-10 text-center text-[11px] font-medium tracking-wide text-slate-400">
          Tecnología SmartNFC
        </footer>
      </div>
    </div>
  );
}
