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

/**
 * Grupo SVG con el QR escalado a `sidePx` unidades del documento, con su posición. Corrige la exportación vectorial:
 * el SVG de `qrcode` usa coordenadas de módulos (viewBox 0 0 N N), no de 1200 unidades.
 */
export function qrSvgGroup(text: string, x: number, y: number, sidePx: number, dark = "#0F172A", margin = 4): string {
  const qr = qrSvg(text, margin);
  const scale = sidePx / qr.size;
  return `<g transform="translate(${x} ${y}) scale(${scale})" shape-rendering="crispEdges"><rect width="${qr.size}" height="${qr.size}" fill="#ffffff"/><path fill="${dark}" d="${qr.path}"/></g>`;
}

/** Dibuja el QR en un lienzo 2D, sin servicios externos. `margin` en módulos dentro del cuadrado `side`. */
export function drawQrOnCanvas(ctx: { fillStyle: string | CanvasGradient | CanvasPattern; fillRect(x: number, y: number, w: number, h: number): void }, text: string, x: number, y: number, side: number, dark = "#0F172A", margin = 2): void {
  const { size, data } = qrModules(text);
  const cell = side / (size + margin * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, side, side);
  ctx.fillStyle = dark;
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    if (data[row * size + col]) ctx.fillRect(x + (col + margin) * cell, y + (row + margin) * cell, Math.ceil(cell), Math.ceil(cell));
  }
}
