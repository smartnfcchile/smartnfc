"use client";

import { useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, CreditCard, Info, RefreshCw, ShieldCheck, Users } from "lucide-react";

const PLATFORM_PRICE = 6990;
const REPLACEMENT_PRICE = 14990;
const BASE_CARD_PRICE = 29990;

const tiers = [
  { range: "1–5", label: "Primeras 5", price: 29990 },
  { range: "6–24", label: "Desde la 6", price: 26990 },
  { range: "25–99", label: "Desde la 25", price: 24990 },
  { range: "100+", label: "Desde la 100", price: 21990 },
];

const money = (value: number) => `$${new Intl.NumberFormat("es-CL").format(Math.round(value))}`;

function calculateCards(quantity: number) {
  return (
    Math.min(quantity, 5) * 29990 +
    Math.min(Math.max(quantity - 5, 0), 19) * 26990 +
    Math.min(Math.max(quantity - 24, 0), 75) * 24990 +
    Math.max(quantity - 99, 0) * 21990
  );
}

function currentUnitPrice(quantity: number) {
  if (quantity >= 100) return 21990;
  if (quantity >= 25) return 24990;
  if (quantity >= 6) return 26990;
  return 29990;
}

export default function QuoteCalculator() {
  const [people, setPeople] = useState(10);
  const safePeople = Math.min(500, Math.max(1, people || 1));

  const quote = useMemo(() => {
    const cards = calculateCards(safePeople);
    const monthly = safePeople * PLATFORM_PRICE;
    const regular = safePeople * BASE_CARD_PRICE;
    return {
      cards,
      monthly,
      saving: regular - cards,
      average: cards / safePeople,
      unit: currentUnitPrice(safePeople),
    };
  }, [safePeople]);

  const whatsappText = encodeURIComponent(
    `Hola, quiero cotizar SmartNFC Empresas para ${safePeople} personas.\n\n` +
      `Tarjetas físicas (pago único): ${money(quote.cards)} + IVA\n` +
      `Plataforma mensual: ${money(quote.monthly)} + IVA\n` +
      `Precio por reposición: ${money(REPLACEMENT_PRICE)} + IVA por tarjeta.\n\n` +
      `Quiero coordinar una demostración y recibir una propuesta formal.`
  );

  return (
    <section id="cotizador" className="mx-auto max-w-7xl scroll-mt-24 px-6 pb-20 pt-10">
      <div className="mb-10 max-w-3xl">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Precios simples y escalables</span>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Cotiza según el tamaño de tu equipo.</h2>
        <p className="mt-4 text-sm font-medium leading-relaxed text-slate-400 sm:text-base">
          Compra las tarjetas una sola vez y mantén cada identidad digital activa con una mensualidad transparente. A mayor volumen, menor precio por las nuevas tarjetas del tramo.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/70 shadow-2xl shadow-black/30">
          <div className="border-b border-white/10 p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <label htmlFor="people" className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">¿Cuántas personas tendrá tu equipo?</label>
                <p className="mt-2 text-xs text-slate-500">Cada persona recibe una tarjeta y una identidad digital administrable.</p>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-2">
                <Users className="ml-2 h-5 w-5 text-blue-400" />
                <input id="people" type="number" min={1} max={500} value={safePeople} onChange={(event) => setPeople(Number(event.target.value))} className="w-20 bg-transparent text-right text-2xl font-black text-white outline-none" />
                <span className="pr-2 text-xs font-bold text-slate-400">personas</span>
              </div>
            </div>
            <input aria-label="Cantidad de personas" type="range" min={1} max={200} value={Math.min(safePeople, 200)} onChange={(event) => setPeople(Number(event.target.value))} className="mt-7 h-2 w-full cursor-pointer accent-blue-500" />
            <div className="mt-3 flex justify-between text-[9px] font-bold text-slate-600"><span>1</span><span>25</span><span>50</span><span>100</span><span>200+</span></div>
          </div>

          <div className="grid gap-3 p-6 sm:grid-cols-2 sm:p-8">
            {tiers.map((tier) => {
              const active = tier.price === quote.unit;
              return (
                <div key={tier.range} className={`rounded-2xl border p-4 transition ${active ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10" : "border-white/8 bg-white/[.025]"}`}>
                  <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{tier.range} tarjetas</span>{active && <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[8px] font-black uppercase text-white">Tu tramo</span>}</div>
                  <b className="mt-2 block text-xl font-black text-white">{money(tier.price)}</b>
                  <small className="text-[10px] font-semibold text-slate-500">por cada tarjeta de este tramo</small>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="rounded-[28px] border border-blue-500/30 bg-gradient-to-br from-blue-600 to-blue-800 p-6 shadow-2xl shadow-blue-950/40 sm:p-8">
          <div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-[0.16em] text-blue-100">Tu estimación</span><BadgeCheck className="h-6 w-6 text-lime-300" /></div>
          <div className="mt-7 rounded-2xl border border-white/15 bg-slate-950/25 p-5">
            <div className="flex items-start gap-3"><CreditCard className="mt-1 h-5 w-5 text-lime-300"/><div className="flex-1"><span className="text-xs font-bold text-blue-100">Tarjetas físicas</span><b className="mt-1 block text-3xl font-black text-white">{money(quote.cards)}</b><small className="text-[10px] font-semibold text-blue-200">Pago único · {safePeople} tarjetas · + IVA</small></div></div>
            {quote.saving > 0 && <div className="mt-4 inline-flex rounded-full bg-lime-300 px-3 py-1 text-[9px] font-black uppercase text-slate-950">Ahorras {money(quote.saving)} por volumen</div>}
          </div>
          <div className="mt-3 rounded-2xl border border-white/15 bg-slate-950/25 p-5">
            <div className="flex items-start gap-3"><Users className="mt-1 h-5 w-5 text-blue-100"/><div className="flex-1"><span className="text-xs font-bold text-blue-100">Plataforma SmartNFC</span><b className="mt-1 block text-3xl font-black text-white">{money(quote.monthly)}<small className="ml-1 text-xs text-blue-200">/mes</small></b><small className="text-[10px] font-semibold text-blue-200">{money(PLATFORM_PRICE)} por identidad activa · + IVA</small></div></div>
          </div>
          <div className="mt-4 flex justify-between text-[10px] font-semibold text-blue-100"><span>Promedio inicial por tarjeta</span><b>{money(quote.average)}</b></div>
          <a href={`https://wa.me/56944891518?text=${whatsappText}`} target="_blank" rel="noopener noreferrer" className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-300 px-5 py-4 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-lime-200">Solicitar cotización detallada <ArrowRight className="h-4 w-4" /></a>
          <p className="mt-3 text-center text-[9px] font-semibold text-blue-200">Estimación referencial. Te enviaremos una propuesta formal antes de contratar.</p>
        </aside>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-slate-900/45 p-5"><CreditCard className="h-5 w-5 text-blue-400"/><h3 className="mt-4 text-sm font-black text-white">La tarjeta se compra una sola vez</h3><p className="mt-2 text-xs leading-relaxed text-slate-400">No existe arriendo ni cobro anual por la tarjeta física. Sigue siendo tuya aunque cambies los datos del perfil.</p></article>
        <article className="rounded-2xl border border-white/10 bg-slate-900/45 p-5"><RefreshCw className="h-5 w-5 text-lime-300"/><h3 className="mt-4 text-sm font-black text-white">Reposición: {money(REPLACEMENT_PRICE)}</h3><p className="mt-2 text-xs leading-relaxed text-slate-400">Solo se cobra si necesitas reemplazarla por pérdida, daño o cambio físico. La reposición cuesta {money(REPLACEMENT_PRICE)} + IVA por unidad.</p></article>
        <article className="rounded-2xl border border-white/10 bg-slate-900/45 p-5"><ShieldCheck className="h-5 w-5 text-blue-400"/><h3 className="mt-4 text-sm font-black text-white">Datos siempre actualizables</h3><p className="mt-2 text-xs leading-relaxed text-slate-400">La mensualidad mantiene activa la identidad digital, la administración centralizada, las métricas y la captura de prospectos.</p></article>
      </div>

      <details className="group mt-5 rounded-2xl border border-white/10 bg-white/[.025] p-5 text-slate-300">
        <summary className="flex cursor-pointer list-none items-center gap-3 text-xs font-black"><Info className="h-4 w-4 text-blue-400"/> Términos y condiciones del cotizador <span className="ml-auto text-blue-400 group-open:rotate-45">＋</span></summary>
        <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 text-[11px] font-medium leading-relaxed text-slate-500 sm:grid-cols-2">
          <p>Los tramos se calculan progresivamente: las primeras unidades conservan su precio y solo las tarjetas adicionales acceden al valor del siguiente tramo.</p>
          <p>Todos los valores publicados son netos y se les debe agregar IVA. El despacho y desarrollos o integraciones especiales se cotizan por separado.</p>
          <p>La mensualidad se calcula por identidad digital activa. Puedes aumentar o reducir identidades según las condiciones de tu propuesta comercial.</p>
          <p>Actualizar nombre, cargo, teléfono, enlaces, fotografía o contenido digital no requiere comprar otra tarjeta mientras la tarjeta física funcione.</p>
        </div>
      </details>
    </section>
  );
}
