// Exportación de tarjetas físicas (19-10-2026): el PNG y el SVG usan la misma matriz QR local que la vista previa.
// Antes: el PNG pedía el QR a api.qrserver.com y, si fallaba, se descargaba sin QR; el SVG lo escalaba como si
// midiera 1200 unidades y quedaba de ~5 unidades (ilegible).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { drawQrOnCanvas, qrModules, qrSvg, qrSvgGroup } from "../../lib/qr/svg";

const URL_ = "https://www.smartnfc.cl/c/ana-prueba-editor";

test("SVG: el QR ocupa el cuadro de 175 unidades del diseño (no ~5)", () => {
  const g = qrSvgGroup(URL_, 670, 320, 175);
  const m = /translate\(670 320\) scale\(([\d.]+)\)/.exec(g);
  assert.ok(m, g.slice(0, 80));
  const side = Number(m![1]) * qrSvg(URL_, 4).size;
  assert.ok(Math.abs(side - 175) < 1e-6, String(side));
  assert.ok(g.includes(qrSvg(URL_, 4).path), "misma matriz que la vista previa (con margen 4)");
});

test("PNG: el lienzo recibe exactamente los módulos oscuros de la matriz local", () => {
  const rects: { x: number; y: number; w: number; h: number; c: string }[] = [];
  const ctx = { fillStyle: "" as string, fillRect(x: number, y: number, w: number, h: number) { rects.push({ x, y, w, h, c: String(this.fillStyle) }); } };
  drawQrOnCanvas(ctx as never, URL_, 825, 435, 190);
  const { size, data } = qrModules(URL_);
  const dark = rects.filter(r => r.c === "#0F172A");
  assert.equal(dark.length, data.reduce((n, v) => n + v, 0));
  const cell = 190 / (size + 4);
  for (const r of dark) {
    const col = Math.round((r.x - 825) / cell) - 2, row = Math.round((r.y - 435) / cell) - 2;
    assert.equal(data[row * size + col], 1, `${row},${col}`);
  }
  assert.equal(rects[0].c, "#ffffff", "fondo blanco primero");
});

test("editor y rutas: sin servicios externos de QR", () => {
  for (const f of ["app/dashboard/physical-designs/[designId]/PhysicalCardEditor.tsx", "app/api/physical-designs/[designId]/svg/route.ts", "components/physical-card/CardPreview.tsx"]) {
    const s = readFileSync(f, "utf8");
    assert.ok(!/qrserver|chart\.googleapis|quickchart/.test(s), f);
  }
});
