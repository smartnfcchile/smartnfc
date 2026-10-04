"use client";
// Estado y operaciones NFC de un Punto Inteligente en Soporte SmartNFC Local (solo SuperAdmin).
// El servidor revalida todo; ocultar o mostrar botones aquí es solo presentación.
import { useState, useTransition } from "react";
import { checkPointNfcDestinationAction, linkPointNfcAction, previewPointNfcLinkAction, unlinkPointNfcAction } from "./nfc-actions";
import type { NfcLinkPreview, PointNfcCheck } from "../../../../lib/local/nfc-link";

type Props = {
  companyId: string;
  point: { id: string; name: string; medium: string };
  nfc: { id: string; tokenHint: string; statusLabel: string } | null;
};
type Dialog = { kind: "link"; preview: NfcLinkPreview | null } | { kind: "check"; result: PointNfcCheck | null } | { kind: "unlink" } | null;

const button = "rounded-lg border px-2.5 py-1.5 text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-50";
const neutral = `${button} border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800`;
const primary = `${button} border-blue-600 bg-blue-600 text-white hover:bg-blue-700`;
const danger = `${button} border-red-600 bg-red-600 text-white hover:bg-red-700`;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid grid-cols-[96px_1fr] gap-2"><dt className="font-semibold text-slate-500">{label}</dt><dd className="text-slate-800 dark:text-slate-200">{children}</dd></div>;
}

function Destination({ destination }: { destination: PointNfcCheck["destination"] }) {
  return <>
    <span className="block">{destination.objective} · {destination.summary}</span>
    {destination.preview && <a href={destination.preview.href} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-semibold text-blue-600 underline dark:text-blue-400">{destination.preview.label}</a>}
    {destination.note && <span className="mt-1 block text-[11px] text-slate-500">{destination.note}</span>}
  </>;
}

function Warnings({ items }: { items: string[] }) {
  if (!items.length) return null;
  return <ul role="note" className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-50 p-3 text-[11px] font-semibold text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
    {items.map(w => <li key={w}>{w}</li>)}
  </ul>;
}

export default function PointNfcControls({ companyId, point, nfc }: Props) {
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const open = (next: Dialog) => { setError(null); setNotice(null); setDialog(next); };
  const close = () => { if (!pending) { setDialog(null); setError(null); setToken(""); } };

  const review = () => startTransition(async () => {
    setError(null);
    const res = await previewPointNfcLinkAction(companyId, point.id, token);
    if (res.success) setDialog({ kind: "link", preview: res.data }); else setError(res.error);
  });
  const confirmLink = () => startTransition(async () => {
    setError(null);
    const res = await linkPointNfcAction(companyId, point.id, token);
    if (!res.success) { setError(res.error); return; }
    // revalidatePath en la acción actualiza la fila con el nuevo estado.
    setDialog(null); setToken(""); setNotice(`NFC ${res.data.hint} vinculado. Comprueba su destino.`);
  });
  const check = () => {
    open({ kind: "check", result: null });
    startTransition(async () => {
      const res = await checkPointNfcDestinationAction(companyId, point.id);
      if (res.success) setDialog({ kind: "check", result: res.data }); else setError(res.error);
    });
  };
  const confirmUnlink = () => startTransition(async () => {
    if (!nfc) return;
    setError(null);
    const res = await unlinkPointNfcAction(companyId, point.id, nfc.id);
    if (!res.success) { setError(res.error); return; }
    setDialog(null); setNotice(`NFC ${res.data.hint} desvinculado. Quedó libre en el inventario de la empresa.`);
  });

  return <div className="space-y-2">
    {nfc ? <div>
      <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">NFC vinculado</span>
      <span className="mt-1 block">{nfc.statusLabel}</span>
      <span className="block font-mono text-[11px] text-slate-500">token {nfc.tokenHint}</span>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button type="button" className={neutral} onClick={check} disabled={pending}>Comprobar destino</button>
        <button type="button" className={neutral} onClick={() => open({ kind: "unlink" })} disabled={pending}>Desvincular NFC</button>
      </div>
    </div> : point.medium === "QR" ? <span className="text-slate-400">No aplica (solo QR)</span> : <div>
      <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">Sin NFC vinculado</span>
      <div className="mt-2"><button type="button" className={primary} onClick={() => open({ kind: "link", preview: null })} disabled={pending}>Vincular NFC</button></div>
    </div>}
    {notice && <p role="status" className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{notice}</p>}

    {dialog && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onKeyDown={e => { if (e.key === "Escape") close(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby={`nfc-dialog-${point.id}`} className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-left text-xs shadow-xl dark:border-slate-800 dark:bg-slate-900">

        {dialog.kind === "link" && !dialog.preview && <>
          <h2 id={`nfc-dialog-${point.id}`} className="text-base font-black text-slate-900 dark:text-white">Vincular NFC a «{point.name}»</h2>
          <label className="block space-y-1">
            <span className="font-bold text-slate-700 dark:text-slate-200">Token o URL del chip</span>
            <input autoFocus value={token} onChange={e => setToken(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && token.trim() && !pending) review(); }}
              placeholder="https://…/t/token o token" autoComplete="off" spellCheck={false}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"/>
            <span className="block text-[11px] text-slate-500">El NFC debe estar registrado para esta empresa en Tarjetas NFC y no tener otro destino.</span>
          </label>
          {error && <p role="alert" className="font-semibold text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className={neutral} onClick={close} disabled={pending}>Cancelar</button>
            <button type="button" className={primary} onClick={review} disabled={pending || !token.trim()}>{pending ? "Revisando…" : "Revisar vinculación"}</button>
          </div>
        </>}

        {dialog.kind === "link" && dialog.preview && <>
          <h2 id={`nfc-dialog-${point.id}`} className="text-base font-black text-slate-900 dark:text-white">Vincular NFC</h2>
          <dl className="space-y-2">
            <Row label="Cliente">{dialog.preview.client}</Row>
            <Row label="Local">{dialog.preview.local || "Sin local asignado"}</Row>
            <Row label="Campaña">{dialog.preview.campaign}</Row>
            <Row label="Punto">{dialog.preview.point}{dialog.preview.location && <span className="block text-[11px] text-slate-500">{dialog.preview.location}</span>}</Row>
            <Row label="Destino"><Destination destination={dialog.preview.destination}/></Row>
            <Row label="NFC"><span className="font-mono">{dialog.preview.nfc.hint}</span> · {dialog.preview.nfc.status}</Row>
          </dl>
          <Warnings items={dialog.preview.warnings}/>
          {error && <p role="alert" className="font-semibold text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className={neutral} onClick={close} disabled={pending}>Cancelar</button>
            <button type="button" className={primary} onClick={confirmLink} disabled={pending}>{pending ? "Vinculando…" : "Confirmar vinculación"}</button>
          </div>
        </>}

        {dialog.kind === "check" && <>
          <h2 id={`nfc-dialog-${point.id}`} className="text-base font-black text-slate-900 dark:text-white">Destino del NFC</h2>
          <p className="text-[11px] text-slate-500">Esta comprobación no pasa por el chip ni registra visitas en la analítica del cliente.</p>
          {!dialog.result && !error && <p>Comprobando…</p>}
          {dialog.result && <>
            <dl className="space-y-2">
              <Row label="Punto">{dialog.result.point}</Row>
              <Row label="Destino"><Destination destination={dialog.result.destination}/></Row>
              <Row label="Hoy">{dialog.result.destination.publiclyAvailable ? "El punto está disponible públicamente." : `Mostraría «Punto Inteligente temporalmente inactivo». ${dialog.result.destination.unavailableReason}`}</Row>
              <Row label="NFC">{dialog.result.nfc ? <><span className="font-mono">{dialog.result.nfc.hint}</span> · {dialog.result.nfc.status}<span className="block text-[11px] text-slate-500">{dialog.result.nfc.readiness}</span></> : "Sin NFC vinculado."}</Row>
            </dl>
          </>}
          {error && <p role="alert" className="font-semibold text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end"><button type="button" className={neutral} onClick={close} disabled={pending}>Cerrar</button></div>
        </>}

        {dialog.kind === "unlink" && nfc && <>
          <h2 id={`nfc-dialog-${point.id}`} className="text-base font-black text-slate-900 dark:text-white">Desvincular NFC</h2>
          <p className="leading-5 text-slate-700 dark:text-slate-200">El NFC <span className="font-mono">{nfc.tokenHint}</span> dejará de abrir el Punto Inteligente «{point.name}»; si el chip sigue instalado, al acercarlo mostrará un aviso de tarjeta sin destino.</p>
          <p className="leading-5 text-slate-700 dark:text-slate-200">{point.medium === "NFC"
            ? "Este punto está configurado solo para NFC: no tendrá acceso físico hasta vincular otro NFC o cambiar su soporte a QR."
            : "El punto sigue funcionando por QR."}</p>
          <p className="leading-5 text-slate-500">No se eliminan el punto, su configuración, su QR, su campaña ni sus métricas. La tarjeta física queda libre en el inventario de esta empresa, con su estado actual, para volver a vincularse.</p>
          {error && <p role="alert" className="font-semibold text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className={neutral} onClick={close} disabled={pending}>Cancelar</button>
            <button type="button" className={danger} onClick={confirmUnlink} disabled={pending}>{pending ? "Desvinculando…" : "Desvincular NFC"}</button>
          </div>
        </>}
      </div>
    </div>}
  </div>;
}
