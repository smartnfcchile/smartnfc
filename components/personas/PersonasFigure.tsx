// Imagen registrada de SmartNFC Personas (P4). Si el espacio aún no tiene archivo aprobado (null), no dibuja nada.
// Conserva la proporción del archivo (next/image con width/height reales, sin deformar) y muestra la leyenda
// «Imagen ilustrativa» cuando corresponde. Con fit "contain", la foto se ve completa dentro del contenedor.
import Image from "next/image";
import type { PersonasAsset } from "../../content/personas/assets";

export default function PersonasFigure({ asset, sizes, className, imageClassName, priority = false }: {
  asset: PersonasAsset;
  /** Atributo `sizes` de next/image según el ancho que ocupa la imagen en la página. */
  sizes: string;
  className?: string;
  imageClassName?: string;
  /** Imagen principal de la página: se precarga (`preload` de Next 16; reemplaza al obsoleto `priority`). */
  priority?: boolean;
}) {
  if (!asset) return null;
  return (
    <figure className={className} data-personas-asset={asset.src} data-fit={asset.fit}>
      <Image src={asset.src} alt={asset.alt} width={asset.width} height={asset.height} sizes={sizes} preload={priority} className={imageClassName} />
      {asset.caption && <figcaption>{asset.caption}</figcaption>}
    </figure>
  );
}
