// Marco de teléfono para vistas previas del editor (no se usa en páginas públicas).
import type { ReactNode } from "react";

export default function MobileDeviceFrame({ children, label = "Vista previa móvil", compact = false }: { children: ReactNode; label?: string; compact?: boolean }) {
  return (
    <div role="group" aria-label={label} className={`mx-auto w-full ${compact ? "max-w-[320px]" : "max-w-[380px]"}`}>
      <div className="relative rounded-[46px] bg-slate-900 p-[10px] shadow-[0_30px_60px_-20px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/10 dark:ring-white/10">
        <div aria-hidden className="absolute left-1/2 top-[18px] z-10 h-[22px] w-[92px] -translate-x-1/2 rounded-full bg-slate-900" />
        <div className={`${compact ? "h-[600px] min-h-[480px]" : "h-[720px] min-h-[560px]"} max-h-[calc(100vh-11rem)] overflow-y-auto overflow-x-hidden rounded-[36px] bg-white [scrollbar-width:none]`}>
          {children}
        </div>
      </div>
    </div>
  );
}
