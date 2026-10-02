import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BANNER_CURVE_HEIGHT, BANNER_CURVE_PATHS, BANNER_FRAMES, BANNER_HEIGHT, HERO_DESKTOP_GRADIENT, HERO_MOBILE, HERO_MOBILE_GRADIENT,
  HERO_POSITION, BANNER_SAFE_MIN, computeBannerSafeZone, computeCoverCrop, getBannerOverlays, overlayRect,
  type BannerOverlay, type Rect,
} from "../../lib/profile-image-crop";
import { BannerCropPreview, HeroCropPreview, NoSafeZoneWarning } from "../../components/ImageCropPreview";
import CardProfileView, { type CardProfileData } from "../../components/card-profile/CardProfileView";

const near = (a: number, b: number, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const blob = (name: string) => `https://abc123store.public.blob.vercel-storage.com/${name}`;

test("Portada: marcos oficiales y object-cover centrado", () => {
  assert.deepEqual(BANNER_FRAMES.map((f) => [f.id, f.width]), [["desktop", 448], ["mobile-narrow", 288], ["mobile", 358]]);
  assert.equal(BANNER_HEIGHT, 192);

  // Imagen recomendada 1344 × 576: completa en escritorio, recortada a 864 px centrales en móvil estrecho
  const desk = computeCoverCrop({ width: 1344, height: 576 }, { width: 448, height: 192 });
  near(desk.croppedX, 0); near(desk.croppedY, 0);
  const narrow = computeCoverCrop({ width: 1344, height: 576 }, { width: 288, height: 192 });
  near(narrow.visible.x, 240); near(narrow.visible.width, 864); near(narrow.croppedX, 1 - 864 / 1344);

  // Banner 3:1 típico (1500 × 500) en móvil habitual: pierde ~38 % del ancho
  near(computeCoverCrop({ width: 1500, height: 500 }, { width: 358, height: 192 }).croppedX, 1 - 358 / 0.384 / 1500);
  // Imagen alta: recorta arriba y abajo, centrada
  const tall = computeCoverCrop({ width: 1000, height: 1000 }, { width: 448, height: 192 });
  near(tall.croppedX, 0); near(tall.visible.y, (1000 - 1000 * 192 / 448) / 2);
});

// ── Zona segura real ────────────────────────────────────────────────────────

const EPS = 1e-6;
/** object-fit: cover centrado según la especificación CSS (implementación independiente). */
function cssCoverTransform(img: { width: number; height: number }, frameWidth: number) {
  const s = Math.max(frameWidth / img.width, BANNER_HEIGHT / img.height);
  return { s, ox: (frameWidth - img.width * s) / 2, oy: (BANNER_HEIGHT - img.height * s) / 2 };
}
const visibleInImage = (img: { width: number; height: number }, frameWidth: number): Rect => {
  const { s, ox, oy } = cssCoverTransform(img, frameWidth);
  return { x: -ox / s, y: -oy / s, width: frameWidth / s, height: BANNER_HEIGHT / s };
};
const inside = (a: Rect, b: Rect) => a.x >= b.x - EPS && a.y >= b.y - EPS && a.x + a.width <= b.x + b.width + EPS && a.y + a.height <= b.y + b.height + EPS;
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.width - EPS && b.x < a.x + a.width - EPS && a.y < b.y + b.height - EPS && b.y < a.y + a.height - EPS;
const round = (r: Rect) => ({ x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) });
/** Área real cubierta por cada overlay en el marco (avatar/insignia: su caja completa, recortada por la portada). */
const coveredRect = (o: BannerOverlay, frameWidth: number): Rect =>
  o.kind === "curve" ? overlayRect(o, frameWidth) : { x: (frameWidth - (o.elementSize ?? 0)) / 2, y: BANNER_HEIGHT - o.height, width: o.elementSize ?? 0, height: o.height };

const IMAGES = { "7:3": { width: 1344, height: 576 }, "3:1": { width: 1500, height: 500 }, "16:9": { width: 1920, height: 1080 }, "2:1": { width: 1000, height: 500 }, "1:1": { width: 1000, height: 1000 } };
const CONFIGS = [
  { template: "classic-dark", bannerStyle: "arc", photoStyle: "hexagon" },
  { template: "classic-light", bannerStyle: "straight", photoStyle: "circle" },
  { template: "neobrutalist", bannerStyle: "wave", photoStyle: "rounded-square" },
  { template: "company-dark", bannerStyle: "arc", photoStyle: "circle" },
  { template: "company-light", bannerStyle: "straight", photoStyle: "circle" },
  { template: "company-dark", bannerStyle: "wave", photoStyle: "no-frame" },
];

test("Zona segura: misma región de la imagen, visible y sin tapar en las tres vistas (5 proporciones × 6 configuraciones)", () => {
  for (const [name, img] of Object.entries(IMAGES)) {
    for (const config of CONFIGS) {
      const label = `${name} ${config.template}/${config.bannerStyle}`;
      const overlays = getBannerOverlays(config);
      const zone = computeBannerSafeZone(img, overlays);
      assert.ok(zone, `${label}: existe zona segura útil`);
      assert.ok(inside(zone.image, { x: 0, y: 0, ...img }), `${label}: dentro de la imagen`);
      for (const frame of BANNER_FRAMES) {
        // Región visible real (CSS) y recorte calculado coinciden
        const visible = visibleInImage(img, frame.width);
        assert.deepEqual(round(computeCoverCrop(img, { width: frame.width, height: BANNER_HEIGHT }).visible), round(visible), `${label} ${frame.id}: región visible`);
        // Ningún punto de la zona queda fuera de la vista
        assert.ok(inside(zone.image, visible), `${label} ${frame.id}: zona dentro de lo visible`);
        // La proyección dibujada es exactamente la misma región de la imagen
        const { s, ox, oy } = cssCoverTransform(img, frame.width);
        const expected: Rect = { x: zone.image.x * s + ox, y: zone.image.y * s + oy, width: zone.image.width * s, height: zone.image.height * s };
        assert.deepEqual(round(zone.frames[frame.id]), round(expected), `${label} ${frame.id}: misma región proyectada`);
        assert.ok(inside(zone.frames[frame.id], { x: 0, y: 0, width: frame.width, height: BANNER_HEIGHT }), `${label} ${frame.id}: dentro del marco`);
        // Ningún punto dentro de curva, avatar o logo
        for (const o of overlays) assert.ok(!overlaps(zone.frames[frame.id], coveredRect(o, frame.width)), `${label} ${frame.id}: no toca ${o.kind}`);
        assert.ok(zone.frames[frame.id].width >= BANNER_SAFE_MIN.width && zone.frames[frame.id].height >= BANNER_SAFE_MIN.height, `${label} ${frame.id}: tamaño útil`);
      }
    }
  }
});

test("Zona segura: valores exactos por proporción (plantilla clásica con arco)", () => {
  const classic = getBannerOverlays({ template: "classic-dark", bannerStyle: "arc", photoStyle: "circle" });
  const zone = (img: { width: number; height: number }) => {
    const z = computeBannerSafeZone(img, classic)!;
    return { image: round(z.image), desktop: round(z.frames.desktop), narrow: round(z.frames["mobile-narrow"]), mobile: round(z.frames.mobile) };
  };
  // Regresión 7:3: idéntica a la zona anterior (864 × 360 en 240–1104 × 24–384; 288 × 120 en cada vista)
  assert.deepEqual(zone(IMAGES["7:3"]), {
    image: { x: 240, y: 24, width: 864, height: 360 },
    desktop: { x: 80, y: 8, width: 288, height: 120 }, narrow: { x: 0, y: 8, width: 288, height: 120 }, mobile: { x: 35, y: 8, width: 288, height: 120 },
  });
  // Regresión 3:1: idéntica a la anterior
  assert.deepEqual(zone(IMAGES["3:1"]), {
    image: { x: 375, y: 20.83, width: 750, height: 312.5 },
    desktop: { x: 80, y: 8, width: 288, height: 120 }, narrow: { x: 0, y: 8, width: 288, height: 120 }, mobile: { x: 35, y: 8, width: 288, height: 120 },
  });
  // 16:9: escritorio recorta arriba/abajo y el móvil estrecho los lados → intersección
  assert.deepEqual(zone(IMAGES["16:9"]), {
    image: { x: 150, y: 162.86, width: 1620, height: 514.29 },
    desktop: { x: 35, y: 8, width: 378, height: 120 }, narrow: { x: 0, y: 28.95, width: 288, height: 91.43 }, mobile: { x: 27.97, y: 25.68, width: 302.06, height: 95.89 },
  });
  assert.deepEqual(zone(IMAGES["2:1"]), {
    image: { x: 125, y: 53.57, width: 750, height: 267.86 },
    desktop: { x: 56, y: 8, width: 336, height: 120 }, narrow: { x: 0, y: 20.57, width: 288, height: 102.86 }, mobile: { x: 35, y: 20.57, width: 288, height: 102.86 },
  });
  assert.deepEqual(zone(IMAGES["1:1"]), {
    image: { x: 0, y: 303.57, width: 1000, height: 267.86 },
    desktop: { x: 0, y: 8, width: 448, height: 120 }, narrow: { x: 0, y: 39.43, width: 288, height: 77.14 }, mobile: { x: 0, y: 25.68, width: 358, height: 95.89 },
  });
  // En empresa no hay avatar sobre la portada: la zona 7:3 crece (no empeora)
  const company = computeBannerSafeZone(IMAGES["7:3"], getBannerOverlays({ template: "company-dark", bannerStyle: "arc", photoStyle: "circle" }))!;
  assert.deepEqual(round(company.image), { x: 240, y: 24, width: 864, height: 432 });
});

test("Zona segura: con las plantillas reales siempre existe (≥ 77 px de alto en pantalla) para cualquier proporción", () => {
  let minHeight = Infinity;
  for (let ratio = 0.2; ratio <= 10; ratio += 0.05) {
    const img = { width: Math.round(1000 * ratio), height: 1000 };
    for (const config of CONFIGS) {
      const zone = computeBannerSafeZone(img, getBannerOverlays(config));
      assert.ok(zone, `ratio ${ratio.toFixed(2)} ${config.template}`);
      for (const frame of BANNER_FRAMES) minHeight = Math.min(minHeight, zone.frames[frame.id].height);
    }
  }
  assert.ok(minHeight >= 120 / (448 / 288) - 0.5, `altura mínima ${minHeight}`);
});

test("Zona segura: si no hay un rectángulo útil devuelve null y se advierte usar 7:3", () => {
  const blocker = (height: number): BannerOverlay => ({ kind: "curve", label: "prueba", width: "full", height });
  assert.equal(computeBannerSafeZone(IMAGES["7:3"], [blocker(190)]), null, "franja vacía");
  assert.equal(computeBannerSafeZone(IMAGES["7:3"], [blocker(150)]), null, "franja de 34 px: menor al mínimo útil");
  assert.equal(computeBannerSafeZone(IMAGES["1:1"], [blocker(120)]), null, "útil en escritorio pero no en móvil estrecho");
  assert.equal(computeBannerSafeZone({ width: 0, height: 0 }, []), null);
  const warning = renderToStaticMarkup(React.createElement(NoSafeZoneWarning));
  assert.ok(warning.includes('role="alert"') && warning.includes("proporción 7:3 (1344 × 576 px)"));
});

test("Portada: elementos superpuestos según plantilla, curva y marco", () => {
  assert.deepEqual(getBannerOverlays({ template: "classic-dark", bannerStyle: "straight", photoStyle: "hexagon" }).map((o) => [o.kind, o.height, o.shape]), [["avatar", 64, "hexagon"]]);
  assert.deepEqual(getBannerOverlays({ template: "neobrutalist", bannerStyle: "wave", photoStyle: "rounded-square" }).map((o) => [o.kind, o.height]), [["curve", 32], ["avatar", 64]]);
  assert.deepEqual(getBannerOverlays({ template: "company-light", bannerStyle: "arc", photoStyle: "circle" }).map((o) => [o.kind, o.height]), [["curve", 40], ["logo-badge", 32]]);
  // Legacy: business-1 con banner "classic" se normaliza a arco, igual que la landing
  assert.deepEqual(getBannerOverlays({ template: "business-1", bannerStyle: "classic", photoStyle: "circle" }).map((o) => o.kind), ["curve", "logo-badge"]);
  assert.deepEqual(overlayRect(getBannerOverlays({ template: "classic-dark", bannerStyle: "straight", photoStyle: "circle" })[0], 358), { x: 115, y: 128, width: 128, height: 64 });
});

test("Hero: franja móvil de 220 px anclada arriba", () => {
  assert.deepEqual(HERO_POSITION, { x: 0.5, y: 0 });
  const strip = computeCoverCrop({ width: 1920, height: 1080 }, { width: HERO_MOBILE.width, height: HERO_MOBILE.stripHeight }, HERO_POSITION);
  near(strip.croppedY, 0); near(strip.visible.y, 0);
  const tall = computeCoverCrop({ width: 1080, height: 1920 }, { width: 390, height: 220 }, HERO_POSITION);
  // Vertical 1080 × 1920: escala 390/1080, se ven solo los 609 px superiores (pierde ~68 % del alto)
  near(tall.visible.y, 0); near(tall.visible.height, 220 / (390 / 1080)); near(tall.croppedY, 1 - 220 / (390 / 1080) / 1920);
});

function card(overrides: Partial<CardProfileData> = {}): CardProfileData {
  return {
    id: "c", slug: "c", name: "Perfil", isActive: true, themeColor: "#2563eb", themeMode: "dark", template: "classic-dark", bannerStyle: "straight",
    photoStyle: "circle", logoUrl: null, avatarUrl: null, coverUrl: blob("cover.jpg"), heroImageUrl: null, profileName: "Perfil", role: null,
    companyName: null, bio: null, location: null, videoUrl: null, videoTitle: null, email: null, phone: null, whatsapp: null, instagram: null,
    facebook: null, linkedin: null, tiktok: null, youtube: null, showEmail: false, showPhone: false, showWhatsapp: false, showInstagram: false,
    showFacebook: false, showLinkedin: false, showTiktok: false, showYoutube: false, company: { name: "Empresa", isActive: true }, links: [],
    shareContactEnabled: false, shareContactButtonText: "", shareContactIntro: "", shareContactConfirm: "", shareContactConsent: "",
    primaryActionType: "NONE", secondaryActionType: "SAVE_CONTACT", ...overrides,
  };
}
const view = (overrides: Partial<CardProfileData>, isPreview = false) => renderToStaticMarkup(React.createElement(CardProfileView, { card: card(overrides), isPreview }));

test("Las constantes de la previsualización coinciden con la landing real", () => {
  const classic = view({ bannerStyle: "arc" });
  assert.ok(classic.includes('class="h-48 w-full relative bg-slate-800 overflow-hidden"'), "portada de 192 px");
  assert.ok(classic.includes("object-cover") && classic.includes("-mt-20") && classic.includes("h-32 w-32"), "avatar 128 px que sube 64 px");
  assert.ok(classic.includes(`d="${BANNER_CURVE_PATHS.arc}"`) && classic.includes("w-full h-10") && BANNER_CURVE_HEIGHT.arc === 40);
  assert.ok(view({ bannerStyle: "wave" }).includes("w-full h-8") && BANNER_CURVE_HEIGHT.wave === 32);
  const company = view({ template: "company-dark" });
  assert.ok(company.includes("bottom-[-32px]") && company.includes("w-16 h-16"), "insignia de 64 px que baja 32 px");
  const hero = view({ heroImageUrl: blob("hero.jpg") });
  assert.ok(hero.includes(HERO_DESKTOP_GRADIENT) && hero.includes(HERO_MOBILE_GRADIENT), "mismo oscurecimiento");
  assert.ok(hero.includes(`height: ${HERO_MOBILE.stripHeight}px`) && hero.includes(`margin-top: -${HERO_MOBILE.cardOverlap}px`));
  assert.ok(hero.includes("background-position: center top"));
});

test("CardProfileView: landing pública por ventana, vista previa por contenedor", () => {
  const pub = view({ heroImageUrl: blob("hero.jpg") });
  assert.ok(pub.includes("@media (min-width: 640px)") && pub.includes("@media (max-width: 639px)"));
  assert.ok(!pub.includes("@container") && !pub.includes("nfc-landing-container"));
  const prev = view({ heroImageUrl: blob("hero.jpg") }, true);
  assert.ok(prev.includes("@container nfc-landing (min-width: 640px)") && prev.includes("@container nfc-landing (max-width: 639px)"));
  assert.ok(!prev.includes("@media (max-width: 639px)"));
  assert.ok(prev.includes('class="nfc-landing-container" style="container-type:inline-size;container-name:nfc-landing"'));
});

test("Previsualizaciones: tres marcos de portada, hero móvil/escritorio y sin URLs en style", () => {
  const banner = renderToStaticMarkup(React.createElement(BannerCropPreview, { url: blob("cover.jpg"), template: "classic-dark", bannerStyle: "arc", photoStyle: "hexagon" }));
  for (const id of ["desktop", "mobile-narrow", "mobile"]) assert.ok(banner.includes(`data-frame="${id}"`), id);
  for (const text of ["448 × 192 px", "288 × 192 px", "358 × 192 px", "Se recorta", "Zona segura", "Queda tapado", "curva en arco y foto de perfil"]) assert.ok(banner.includes(text), text);
  assert.ok(banner.includes("clip-path:polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)"), "marco hexagonal real");
  assert.ok(renderToStaticMarkup(React.createElement(BannerCropPreview, { url: blob("c.jpg"), template: "company-light", bannerStyle: "straight", photoStyle: "circle" })).includes("logo circular"));

  const hero = renderToStaticMarkup(React.createElement(HeroCropPreview, { url: blob("hero.jpg") }));
  assert.ok(hero.includes('data-frame="hero-mobile"') && hero.includes('data-frame="hero-desktop"') && hero.includes("franja de 220 px"));
  assert.ok(hero.includes("object-cover object-top") && hero.includes("Tu tarjeta"));

  for (const html of [banner, hero]) {
    for (const style of html.match(/style="[^"]*"/g) ?? []) assert.ok(!/url\(|https?:|data:/i.test(style), `sin URL en style: ${style}`);
  }
  // Referencias inseguras no se previsualizan
  for (const url of ["javascript:alert(1)", "data:image/svg+xml,<svg onload=alert(1)>", "", null]) {
    assert.equal(renderToStaticMarkup(React.createElement(BannerCropPreview, { url, template: "classic-dark", bannerStyle: "arc", photoStyle: "circle" })), "");
    assert.equal(renderToStaticMarkup(React.createElement(HeroCropPreview, { url })), "");
  }
});
