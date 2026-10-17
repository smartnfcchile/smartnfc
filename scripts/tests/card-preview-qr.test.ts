// P2 Personas: QR local de CardPreview (vista de la tarjeta física).
// - Destino: el QR codifica exactamente la URL recibida (la misma que antes se enviaba a api.qrserver.com),
//   con la corrección de errores de los QR de producción.
// - Privacidad: el componente no genera solicitudes a terceros (sin <img> ni URLs externas para el QR).
// - Regresión: el resto de la tarjeta (NFC, QR oculto, logo y foto del diseño) se dibuja igual.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import QRCode from "qrcode";
import CardPreview from "../../components/physical-card/CardPreview";
import { PHYSICAL_CARD_TEMPLATES, makeTemplateSide, type CardSideDesign } from "../../lib/physical-card/templates";
import { QR_ERROR_CORRECTION, qrModules, qrSvg } from "../../lib/qr/svg";

const REAL_URLS = [
  "https://www.smartnfc.cl/c/miguel-rojas?ref=qr",
  "https://www.smartnfc.cl/q/AB12CD",
  "https://www.smartnfc.cl/personas",
  "http://localhost:3000/c/prueba-ñandú?ref=qr&x=1",
];

/** Reconstruye la matriz de módulos a partir del trazado SVG. */
function matrixFromPath(path: string, size: number, margin: number): Uint8Array {
  const out = new Uint8Array(size * size);
  for (const m of path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\3z/g)) {
    const [x, y, len] = [Number(m[1]) - margin, Number(m[2]) - margin, Number(m[3])];
    for (let i = 0; i < len; i++) out[y * size + x + i] = 1;
  }
  return out;
}

const back = (overrides: Partial<CardSideDesign> = {}) => ({ ...makeTemplateSide(PHYSICAL_CARD_TEMPLATES[0], true), ...overrides });
const render = (side: CardSideDesign, publicUrl: string) => renderToStaticMarkup(createElement(CardPreview, { side, publicUrl }));

test("destino: el trazado reproduce exactamente la matriz del QR de la URL (misma corrección «M» que producción)", () => {
  for (const url of REAL_URLS) {
    const ref = QRCode.create(url, { errorCorrectionLevel: "M" });
    assert.equal(ref.segments.map(s => (s as unknown as { data: Uint8Array | string }).data).map(d => typeof d === "string" ? d : Buffer.from(d).toString("utf8")).join(""), url, "contenido codificado");
    const { size, data } = qrModules(url);
    assert.equal(size, ref.modules.size);
    assert.deepEqual(data, ref.modules.data);
    const svg = qrSvg(url, 2);
    assert.equal(svg.size, size + 4);
    assert.deepEqual(matrixFromPath(svg.path, size, 2), ref.modules.data, url);
  }
  assert.equal(QR_ERROR_CORRECTION, "M");
});

test("destino: CardPreview codifica la URL recibida sin alterarla", () => {
  for (const url of REAL_URLS) {
    const html = render(back(), url);
    const label = url.replace(/&/g, "&amp;");
    assert.ok(html.includes(`aria-label="QR hacia ${label}"`), url);
    const d = html.match(/<path d="([^"]+)"/)![1];
    assert.equal(d, qrSvg(url).path, "el QR dibujado corresponde a esa URL");
  }
});

test("privacidad: el QR no usa servicios externos ni imágenes remotas", () => {
  const html = render(back(), REAL_URLS[0]);
  assert.ok(!html.includes("qrserver"), "sin api.qrserver.com");
  assert.ok(!/<img\b/.test(html), "sin <img> (el diseño de prueba no tiene logo ni foto)");
  assert.ok(!/\bsrc=/.test(html), "sin atributos src");
  assert.match(html, /<svg role="img"/);
});

test("regresión: sin QR visible no se dibuja QR; NFC y logo/foto del diseño se mantienen", () => {
  const front = makeTemplateSide(PHYSICAL_CARD_TEMPLATES[0], false);
  const html = render(front, REAL_URLS[0]);
  assert.equal(front.qrVisible, false);
  assert.ok(!html.includes("QR hacia"));
  assert.ok(html.includes("Acerca tu teléfono"), "NFC visible en el anverso");
  const withLogo = render(back({ logoUrl: "https://cdn.example.com/logo.png" }), REAL_URLS[0]);
  assert.ok(withLogo.includes('src="https://cdn.example.com/logo.png"'), "el logo del diseño sigue siendo una imagen");
  assert.ok(withLogo.includes("QR hacia"));
});

test("cobertura: las 12 plantillas físicas renderizan con QR local", () => {
  for (const t of PHYSICAL_CARD_TEMPLATES) {
    const html = render(makeTemplateSide(t, true), REAL_URLS[0]);
    assert.ok(html.includes("QR hacia") && !html.includes("qrserver"), t.slug);
  }
});

test("tamaños de texto: el modo por defecto (editor) conserva las clases de siempre; el modo «card» usa el ancho de la tarjeta", () => {
  const side = { ...makeTemplateSide(PHYSICAL_CARD_TEMPLATES[0], false), phone: "+56 9 1" };
  const editor = render(side, REAL_URLS[0]);
  for (const cls of ["text-[clamp(11px,2.7vw,24px)]", "text-[clamp(6px,1.2vw,11px)]", "text-[clamp(6px,1.15vw,10px)]", "text-[clamp(5px,1vw,9px)]", "text-[clamp(6px,1.1vw,10px)]"]) assert.ok(editor.includes(cls), cls);
  assert.ok(!editor.includes("cqw") && !editor.includes("container-type"), "el editor no cambia");
  const card = renderToStaticMarkup(createElement(CardPreview, { side, publicUrl: REAL_URLS[0], textSize: "card" }));
  assert.ok(card.includes("container-type:inline-size"));
  for (const min of ["clamp(15px,", "clamp(10.5px,", "clamp(10px,", "clamp(9.5px,"]) assert.ok(card.includes(min), min);
  assert.ok(!/clamp\((5|6)px/.test(card), "sin textos de 5–6 px en el modo de tarjeta");
});
