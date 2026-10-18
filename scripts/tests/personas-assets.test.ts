// P4 SmartNFC Personas: registro de imágenes y espacios de integración.
// Regla: las imágenes nuevas se generan y aprueban solo en ChatGPT; mientras no llegan, cada espacio es null y la
// página no cambia. Estas pruebas validan cualquier archivo que se registre: existe, es local, tiene el tamaño
// declarado (sin deformar), texto alternativo y, si es una escena, la leyenda «Imagen ilustrativa».
import "./helpers/css-modules";
import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PERSONAS_HERO, PERSONAS_OG_ASSET, PERSONAS_PRODUCT_ASSET, PERSONAS_SEGMENT_ASSETS, type PersonasAsset } from "../../content/personas/assets";
import PersonasFigure from "../../components/personas/PersonasFigure";

const PUBLIC = join(__dirname, "..", "..", "public");

/** Ancho y alto de un WebP (VP8, VP8L o VP8X) o de un JPEG, leídos de la cabecera del archivo. */
function imageSize(file: string): { width: number; height: number; format: "webp" | "jpeg" } {
  const b = readFileSync(file);
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const chunk = b.toString("ascii", 12, 16);
    if (chunk === "VP8X") return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3), format: "webp" };
    if (chunk === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff, format: "webp" };
    if (chunk === "VP8L") { const bits = b.readUInt32LE(21); return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, format: "webp" }; }
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      const marker = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xc3) return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7), format: "jpeg" };
      i += 2 + len;
    }
  }
  throw new Error(`Formato no reconocido: ${file}`);
}

const registered: [string, NonNullable<PersonasAsset>, boolean][] = [
  ["hero", PERSONAS_HERO, true],
  ...Object.entries(PERSONAS_SEGMENT_ASSETS).filter(([, a]) => a).map(([k, a]) => [`segmento ${k}`, a!, true] as [string, NonNullable<PersonasAsset>, boolean]),
  ...(PERSONAS_PRODUCT_ASSET ? [["producto", PERSONAS_PRODUCT_ASSET, false] as [string, NonNullable<PersonasAsset>, boolean]] : []),
];

test("hero: el aprobado reemplaza al provisional", () => {
  assert.equal(PERSONAS_HERO.src, "/images/personas/persona-hero.webp");
  assert.deepEqual([PERSONAS_HERO.width, PERSONAS_HERO.height], [1600, 900]);
  assert.equal(PERSONAS_HERO.caption, "Imagen ilustrativa");
});

test("imágenes registradas: locales, WebP, tamaño real igual al declarado, texto alternativo y leyenda en escenas", () => {
  for (const [name, a, scene] of registered) {
    assert.match(a.src, /^\/images\//, `${name}: ruta local`);
    const file = join(PUBLIC, a.src);
    assert.ok(existsSync(file), `${name}: falta ${a.src}`);
    const size = imageSize(file);
    assert.equal(size.format, "webp", `${name}: WebP`);
    assert.deepEqual([size.width, size.height], [a.width, a.height], `${name}: tamaño declarado = archivo`);
    assert.ok(a.alt.trim().length >= 10, `${name}: texto alternativo`);
    if (scene) assert.equal(a.caption, "Imagen ilustrativa", `${name}: leyenda`);
    if (name !== "hero") assert.match(a.src, /^\/images\/personas\//, `${name}: carpeta de Personas`);
  }
});

/** Peso máximo por espacio (inventario P4). El hero provisional queda fuera: no es un archivo nuevo de Personas. */
const MAX_KB: Record<string, number> = {
  "persona-hero.webp": 250, "persona-uso-personal.webp": 150, "persona-oficio.webp": 150, "persona-emprende.webp": 150,
  "persona-profesional.webp": 150, "persona-tarjeta.webp": 200, "persona-og.jpg": 300,
};

test("cada espacio usa su archivo previsto, sin repetir imágenes entre espacios, y respeta el peso máximo", () => {
  const expected: Record<string, string> = {
    personal: "persona-uso-personal.webp", oficio: "persona-oficio.webp", emprende: "persona-emprende.webp", profesional: "persona-profesional.webp",
  };
  for (const [uso, a] of Object.entries(PERSONAS_SEGMENT_ASSETS)) if (a) assert.equal(a.src, `/images/personas/${expected[uso]}`, uso);
  if (PERSONAS_PRODUCT_ASSET) assert.equal(PERSONAS_PRODUCT_ASSET.src, "/images/personas/persona-tarjeta.webp");
  if (PERSONAS_OG_ASSET) assert.equal(PERSONAS_OG_ASSET.src, "/images/personas/persona-og.jpg");
  if (PERSONAS_HERO.src !== "/images/smartnfc-tap-hero.webp") assert.equal(PERSONAS_HERO.src, "/images/personas/persona-hero.webp");
  const srcs = [...registered.map(([, a]) => a.src), ...(PERSONAS_OG_ASSET ? [PERSONAS_OG_ASSET.src] : [])];
  assert.equal(new Set(srcs).size, srcs.length, "una imagen por espacio");
  for (const src of srcs) {
    const name = src.split("/").pop()!;
    if (!(name in MAX_KB)) continue;
    const kb = readFileSync(join(PUBLIC, src)).length / 1024;
    assert.ok(kb <= MAX_KB[name], `${name}: ${kb.toFixed(1)} KB > ${MAX_KB[name]} KB`);
  }
});

test("escenas de «Para quién es»: 4:3 sin recorte, o el original completo con fit «contain»", () => {
  for (const [uso, a] of Object.entries(PERSONAS_SEGMENT_ASSETS)) {
    if (!a) continue;
    if (a.fit === "contain") assert.ok(Math.abs(a.width / a.height - 16 / 9) < 0.01, `${uso}: original 16:9 completo`);
    else assert.deepEqual([a.width, a.height], [1200, 900], `${uso}: 1200 × 900`);
  }
  const html = renderToStaticMarkup(createElement(PersonasFigure, { asset: PERSONAS_SEGMENT_ASSETS.oficio, sizes: "100vw" }));
  if (PERSONAS_SEGMENT_ASSETS.oficio?.fit) assert.match(html, /data-fit="contain"/);
});

test("imagen para compartir: JPG 1200 × 630 si está registrada", () => {
  if (!PERSONAS_OG_ASSET) return;
  const size = imageSize(join(PUBLIC, PERSONAS_OG_ASSET.src));
  assert.deepEqual([size.format, size.width, size.height], ["jpeg", 1200, 630]);
  assert.ok(PERSONAS_OG_ASSET.alt.length >= 10);
});

test("espacio vacío (null): no dibuja nada; con archivo: imagen sin deformar y leyenda", () => {
  assert.equal(renderToStaticMarkup(createElement(PersonasFigure, { asset: null, sizes: "100vw" })), "");
  const html = renderToStaticMarkup(createElement(PersonasFigure, { asset: PERSONAS_HERO, sizes: "100vw", className: "x" }));
  assert.match(html, /<figure class="x" data-personas-asset="\/images\/personas\/persona-hero.webp">/);
  assert.match(html, /alt="Tarjeta SmartNFC negra junto a un teléfono que muestra un perfil digital"/);
  assert.match(html, /width="1600" height="900"/);
  assert.match(html, /<figcaption>Imagen ilustrativa<\/figcaption>/);
});
