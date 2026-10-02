import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  getAuthorizedBlobHosts, isAuthorizedCardImageUrl, resolveCardImageUpdate, toCssImageUrl,
} from "../../lib/card-images";
import CardProfileView, { type CardProfileData } from "../../components/card-profile/CardProfileView";

// Valores ficticios: ningún token ni store real.
const HOSTS = ["abc123store.public.blob.vercel-storage.com"];
const blob = (path: string) => `https://abc123store.public.blob.vercel-storage.com/${path}`;
const STYLE_BREAKOUT = `https://abc123store.public.blob.vercel-storage.com/x.png) } </style><script>window.__pwned=1</script><style>`;

test("Hosts autorizados: se derivan de BLOB_STORE_ID y BLOB_READ_WRITE_TOKEN", () => {
  assert.deepEqual(getAuthorizedBlobHosts({ BLOB_STORE_ID: "store_AbC123" }), ["abc123.public.blob.vercel-storage.com"]);
  assert.deepEqual(getAuthorizedBlobHosts({ BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_Xyz789_fakesecret" }), ["xyz789.public.blob.vercel-storage.com"]);
  assert.deepEqual(getAuthorizedBlobHosts({ BLOB_STORE_ID: "Xyz789", BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_Xyz789_fakesecret" }), ["xyz789.public.blob.vercel-storage.com"]);
  assert.deepEqual(getAuthorizedBlobHosts({}), []);
  assert.deepEqual(getAuthorizedBlobHosts({ BLOB_STORE_ID: "evil.example/" }), []);
});

test("Escritura: acepta solo imágenes del store autorizado o /uploads generados por el servidor", () => {
  for (const value of [
    blob("hero-AbC123xyz.webp"), blob("Foto%20perfil-9f8e7d.jpg"), blob("dir/logo.png"),
    "/uploads/hero-cm0card000000000000000001-1727000000000.jpg",
  ]) assert.equal(isAuthorizedCardImageUrl(value, HOSTS), true, value);

  for (const value of [
    "", "https://evil.example/hero.png", "http://abc123store.public.blob.vercel-storage.com/hero.png",
    "https://otrostore.public.blob.vercel-storage.com/hero.png",
    "https://abc123store.public.blob.vercel-storage.com.evil.example/hero.png",
    "https://user:pw@abc123store.public.blob.vercel-storage.com/hero.png",
    "https://abc123store.public.blob.vercel-storage.com:8443/hero.png",
    blob("hero.png?x=1"), blob("hero.png#x"), "https://abc123store.public.blob.vercel-storage.com/",
    blob('hero.png")'), blob("hero .png"), STYLE_BREAKOUT,
    "javascript:alert(1)", "data:image/png;base64,AAAA", "data:image/svg+xml,<svg onload=alert(1)>",
    "//evil.example/hero.png", "/uploads/../secret.png", "/uploads/hero.svg", "/api/x.png",
    blob("a".repeat(2100)),
  ]) assert.equal(isAuthorizedCardImageUrl(value, HOSTS), false, value);

  assert.equal(isAuthorizedCardImageUrl(blob("hero.png"), []), false, "sin store configurado no se autoriza Blob");
});

test("Escritura: conserva valores existentes, permite eliminar y rechaza valores nuevos no autorizados", () => {
  const legacy = "https://images.example.com/legacy-hero.jpg";
  assert.equal(resolveCardImageUpdate("heroImageUrl", null, legacy, HOSTS), legacy, "campo ausente conserva el valor");
  assert.equal(resolveCardImageUpdate("heroImageUrl", legacy, legacy, HOSTS), legacy, "valor legacy sin cambios se conserva");
  assert.equal(resolveCardImageUpdate("heroImageUrl", "", legacy, HOSTS), null);
  assert.equal(resolveCardImageUpdate("heroImageUrl", "   ", legacy, HOSTS), null);
  assert.equal(resolveCardImageUpdate("coverUrl", blob("cover-1.jpg"), null, HOSTS), blob("cover-1.jpg"));
  assert.equal(resolveCardImageUpdate("coverUrl", ` ${blob("cover-1.jpg")} `, null, HOSTS), blob("cover-1.jpg"));
  for (const field of ["avatarUrl", "logoUrl", "coverUrl", "heroImageUrl"] as const) {
    assert.throws(() => resolveCardImageUpdate(field, "https://evil.example/x.png", null, HOSTS), /editor de SmartNFC/);
    assert.throws(() => resolveCardImageUpdate(field, STYLE_BREAKOUT, legacy, HOSTS), /editor de SmartNFC/);
  }
});

test("Render CSS: escapa el valor y descarta esquemas peligrosos", () => {
  assert.equal(toCssImageUrl(blob("hero.webp")), `url("${blob("hero.webp")}")`);
  assert.equal(toCssImageUrl("/uploads/hero-1.jpg"), `url("/uploads/hero-1.jpg")`);
  assert.equal(toCssImageUrl("https://images.example.com/legacy.jpg"), `url("https://images.example.com/legacy.jpg")`, "legacy externo sigue visible");
  assert.equal(toCssImageUrl("data:image/png;base64,iVBORw0KGgo="), `url("data:image/png;base64,iVBORw0KGgo=")`);
  // Imágenes embebidas existentes de varios KB siguen visibles (no aplica el límite de 2048 de las URLs)
  const bigData = "data:image/png;base64," + "A".repeat(20_000);
  assert.equal(toCssImageUrl(bigData), `url("${bigData}")`);
  assert.equal(toCssImageUrl("data:image/png;base64," + "A".repeat(9 * 1024 * 1024)), null, "límite de tamaño para data:");
  for (const value of [`data:image/png;base64,AAAA")}</style><script>x</script>`, "data:image/png;base64,AA AA", "data:image/png,AAAA", "data:image/png;base64,AAAA\n"])
    assert.equal(toCssImageUrl(value), null, value);

  for (const value of [
    null, undefined, "", "javascript:alert(1)", "data:image/svg+xml,<svg onload=alert(1)>", "data:text/html;base64,PHNjcmlwdD4=",
    "//evil.example/x.png", "/\\evil.example/x.png", "https://user:pw@example.com/x.png", "https://example.com/x.png\n}",
    "vbscript:x", "not a url",
  ]) assert.equal(toCssImageUrl(value), null, String(value));

  for (const value of [STYLE_BREAKOUT, `https://example.com/a.png") ; background:red; x:url("`, "https://example.com/a\\b.png"]) {
    const css = toCssImageUrl(value);
    assert.ok(css, value);
    const inner = css.slice('url("'.length, -'")'.length);
    assert.ok(!/(?<!\\)"/.test(inner), `comilla sin escapar en ${css}`);
    assert.ok(!/[<>]/.test(inner), `caracteres HTML en ${css}`);
  }
});

function card(overrides: Partial<CardProfileData> = {}): CardProfileData {
  return {
    id: "card-test", slug: "card-test", name: "Perfil Demo", isActive: true, themeColor: "#2563eb", themeMode: "dark",
    template: "classic-dark", bannerStyle: "straight", photoStyle: "circle", logoUrl: null, avatarUrl: null, coverUrl: null,
    heroImageUrl: null, profileName: "Perfil Demo", role: null, companyName: null, bio: null, location: null, videoUrl: null,
    videoTitle: null, email: null, phone: null, whatsapp: null, instagram: null, facebook: null, linkedin: null, tiktok: null,
    youtube: null, showEmail: false, showPhone: false, showWhatsapp: false, showInstagram: false, showFacebook: false,
    showLinkedin: false, showTiktok: false, showYoutube: false, company: { name: "Empresa Demo", isActive: true }, links: [],
    shareContactEnabled: false, shareContactButtonText: "", shareContactIntro: "", shareContactConfirm: "",
    shareContactConsent: "", primaryActionType: "WHATSAPP", secondaryActionType: "SAVE_CONTACT",
    ...overrides,
  };
}

const render = (overrides: Partial<CardProfileData>) => renderToStaticMarkup(React.createElement(CardProfileView, { card: card(overrides) }));

test("Landing: un heroImageUrl malicioso no rompe la etiqueta <style> ni inyecta HTML", () => {
  for (const heroImageUrl of [STYLE_BREAKOUT, `x); } body { display:none } .a{b:url(x`]) {
    const html = render({ heroImageUrl });
    assert.ok(!html.includes("<script"), "no debe aparecer una etiqueta script");
    assert.ok(!html.includes("__pwned=1</script>"), "el payload no debe quedar como HTML");
    assert.equal(html.match(/<style/g)?.length ?? 0, html.match(/<\/style>/g)?.length ?? 0);
    const styleBlock = /<style>([\s\S]*?)<\/style>/.exec(html)?.[1] ?? "";
    assert.ok(!styleBlock.includes("display:none") && !styleBlock.includes("pwned"), "el valor no se interpola en <style>");
  }
});

test("Landing: un hero antiguo en base64 (varios KB) se sigue mostrando sin abrir inyección", () => {
  const legacy = "data:image/png;base64," + "iVBORw0KGgoAAAANSUhEUgAA".repeat(800) + "==";
  assert.ok(legacy.length > 2048);
  const html = render({ heroImageUrl: legacy });
  assert.ok(html.includes('class="nfc-landing-main has-hero'));
  assert.ok(html.includes(`--nfc-hero-image:url(&quot;${legacy}&quot;)`), "la imagen embebida llega intacta a la variable CSS");
  const styleBlock = /<style>([\s\S]*?)<\/style>/.exec(html)?.[1] ?? "";
  assert.ok(!styleBlock.includes("data:"), "el valor nunca entra al <style>");

  // Variantes manipuladas de un data: grande: no se renderizan como hero
  for (const tampered of [legacy + `")}</style><script>x</script>`, legacy.replace("base64,", "base64,\"x"), legacy + ";background:red", "data:image/svg+xml;base64," + "PHN2Zz4=".repeat(400)]) {
    const out = render({ heroImageUrl: tampered });
    assert.ok(!out.includes("has-hero") && !out.includes("<script"), tampered.slice(-40));
  }
});

test("Landing: un hero válido se sigue mostrando y el diseño no cambia", () => {
  const html = render({ heroImageUrl: blob("hero-ok.webp") });
  assert.ok(html.includes('class="nfc-landing-main has-hero'));
  assert.ok(html.includes("--nfc-hero-image:url(&quot;https://abc123store.public.blob.vercel-storage.com/hero-ok.webp&quot;)"));
  assert.ok(html.includes("var(--nfc-hero-image) !important"));
  assert.ok(html.includes('class="nfc-hero-mobile-strip"'));
  assert.ok(html.includes("height: 220px !important"), "la franja móvil conserva sus dimensiones");

  const withoutHero = render({ heroImageUrl: null });
  assert.ok(!withoutHero.includes("has-hero") && !withoutHero.includes("<style"));

  const withImages = render({ avatarUrl: blob("avatar.jpg"), coverUrl: blob("cover.jpg"), logoUrl: blob("logo.png") });
  for (const name of ["avatar.jpg", "cover.jpg", "logo.png"]) assert.ok(withImages.includes(blob(name)), name);
});
