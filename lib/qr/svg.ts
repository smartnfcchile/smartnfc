// QR generado localmente (P2 Personas): mismo contenido que los QR de producción, sin servicios externos.
// Usa la librería `qrcode` ya instalada, con la misma corrección de errores que las rutas reales
// (`errorCorrectionLevel: "M"` en app/api/**/qr y physical-designs). Síncrono y puro: funciona en servidor y navegador.
import QRCode from "qrcode";

export const QR_ERROR_CORRECTION = "M" as const;

export type QrSvg = {
  /** Lado del dibujo en módulos, incluido el margen. */
  size: number;
  /** Trazado SVG (relleno oscuro) de los módulos activos. */
  path: string;
};

/** Matriz de módulos del QR para `text` (fila por fila, 1 = oscuro). */
export function qrModules(text: string): { size: number; data: Uint8Array } {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: QR_ERROR_CORRECTION });
  return { size: modules.size, data: modules.data };
}

/** Trazado SVG compacto: cada tramo horizontal de módulos oscuros es un rectángulo. `margin` en módulos. */
export function qrSvg(text: string, margin = 2): QrSvg {
  const { size, data } = qrModules(text);
  let path = "";
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!data[y * size + x]) { x++; continue; }
      const start = x;
      while (x < size && data[y * size + x]) x++;
      path += `M${start + margin} ${y + margin}h${x - start}v1h-${x - start}z`;
    }
  }
  return { size: size + margin * 2, path };
}
