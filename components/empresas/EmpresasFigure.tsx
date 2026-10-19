// Imagen de SmartNFC Empresas o, mientras no exista el archivo aprobado, un marcador neutro identificado.
import Image from "next/image";
import type { EmpresasSlot } from "../../content/empresas/assets";
import styles from "./empresas.module.css";

export default function EmpresasFigure({ slot, sizes, className, priority = false }: { slot: EmpresasSlot; sizes: string; className?: string; priority?: boolean }) {
  const a = slot.asset;
  if (!a) {
    return (
      <div className={`${styles.placeholder} ${className ?? ""}`} style={{ aspectRatio: `${slot.width} / ${slot.height}` }} data-empresas-slot={slot.file} aria-hidden="true">
        <span>Imagen pendiente</span>
        <code>{slot.file}</code>
        <small>{slot.width} × {slot.height} · máx. {slot.maxKb} KB</small>
      </div>
    );
  }
  return (
    <figure className={`${styles.figureMedia} ${className ?? ""}`} data-empresas-asset={a.src}>
      <Image src={a.src} alt={a.alt} width={a.width} height={a.height} sizes={sizes} preload={priority} />
      {a.caption && <figcaption>{a.caption}</figcaption>}
    </figure>
  );
}
