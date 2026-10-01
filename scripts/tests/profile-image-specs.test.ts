import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  getProfileImageWarnings, isAcceptedProfileImageType, PROFILE_IMAGE_ACCEPT, PROFILE_IMAGE_MAX_BYTES,
  PROFILE_IMAGE_MIME_TYPES, PROFILE_IMAGE_SPECS,
} from "../../lib/profile-image-specs";
import ProfileImageSpecHint from "../../components/ProfileImageSpecHint";

test("Especificaciones aprobadas por imagen", () => {
  assert.deepEqual(PROFILE_IMAGE_SPECS.avatar.variants.map(({ width, height, ratioLabel }) => [width, height, ratioLabel]), [[800, 800, "1:1"]]);
  assert.deepEqual(PROFILE_IMAGE_SPECS.logo.variants.map(({ width, height }) => [width, height]), [[900, 300], [600, 600]]);
  assert.deepEqual(PROFILE_IMAGE_SPECS.cover.variants.map(({ width, height, ratioLabel }) => [width, height, ratioLabel]), [[1344, 576, "7:3"]]);
  assert.deepEqual(PROFILE_IMAGE_SPECS.hero.variants.map(({ width, height, ratioLabel }) => [width, height, ratioLabel]), [[1920, 1080, "16:9"]]);
  assert.equal(
    PROFILE_IMAGE_SPECS.cover.highlight,
    "Mantén los textos y logotipos importantes dentro de la zona segura central de 864 × 360 px. Los extremos pueden recortarse en teléfonos móviles y la parte inferior puede quedar cubierta por elementos del perfil.",
  );
});

test("Formatos: el navegador y el servidor aceptan exactamente JPG, PNG y WebP", () => {
  assert.equal(PROFILE_IMAGE_ACCEPT, "image/jpeg,image/png,image/webp");
  for (const type of PROFILE_IMAGE_MIME_TYPES) assert.equal(isAcceptedProfileImageType(type), true, type);
  for (const type of ["image/heic", "image/svg+xml", "image/gif", "image/*", "", "text/html"]) assert.equal(isAcceptedProfileImageType(type), false, type);
  const route = readFileSync("app/api/blob/upload/route.ts", "utf8");
  assert.match(route, /allowedContentTypes: \[\.\.\.PROFILE_IMAGE_MIME_TYPES\]/, "la ruta de carga usa la misma lista");
  const maxServer = Number(/maximumSizeInBytes: ([\d_]+)/.exec(route)?.[1].replace(/_/g, ""));
  assert.ok(PROFILE_IMAGE_MAX_BYTES <= maxServer, "el límite del editor nunca supera al del servidor");
});

test("Las dimensiones recomendadas no generan advertencias", () => {
  for (const spec of Object.values(PROFILE_IMAGE_SPECS)) {
    for (const variant of spec.variants) assert.deepEqual(getProfileImageWarnings(spec.kind, variant), [], `${spec.kind} ${variant.width}x${variant.height}`);
  }
  // Compatibles aunque no exactas
  assert.deepEqual(getProfileImageWarnings("cover", { width: 1500, height: 600 }), []);
  assert.deepEqual(getProfileImageWarnings("avatar", { width: 1000, height: 1050 }), []);
  assert.deepEqual(getProfileImageWarnings("hero", { width: 2560, height: 1440 }), []);
});

test("Advertencias informativas de proporción y resolución", () => {
  const has = (list: string[], re: RegExp) => assert.ok(list.some((w) => re.test(w)), list.join(" | "));
  has(getProfileImageWarnings("cover", { width: 1500, height: 500 }), /panorámica/);
  has(getProfileImageWarnings("cover", { width: 1200, height: 1000 }), /arriba y abajo/);
  has(getProfileImageWarnings("cover", { width: 1080, height: 1920 }), /vertical/);
  has(getProfileImageWarnings("cover", { width: 700, height: 300 }), /Resolución baja/);
  has(getProfileImageWarnings("avatar", { width: 800, height: 1200 }), /no es cuadrada/);
  has(getProfileImageWarnings("avatar", { width: 200, height: 200 }), /Resolución baja/);
  has(getProfileImageWarnings("logo", { width: 1200, height: 200 }), /alargado/);
  has(getProfileImageWarnings("logo", { width: 300, height: 600 }), /vertical/);
  has(getProfileImageWarnings("logo", { width: 300, height: 100 }), /Resolución baja/);
  has(getProfileImageWarnings("hero", { width: 1080, height: 1920 }), /vertical/);
  has(getProfileImageWarnings("hero", { width: 1280, height: 720 }), /Resolución baja/);
  assert.deepEqual(getProfileImageWarnings("cover", { width: 0, height: 0 }), []);
});

test("La ayuda del editor muestra dimensiones, proporción, formatos, peso y zona segura", () => {
  const html = (kind: "avatar" | "logo" | "cover" | "hero") => renderToStaticMarkup(React.createElement(ProfileImageSpecHint, { kind }));
  const cover = html("cover");
  for (const text of ["1344 × 576 px", "7:3", "JPG, PNG o WebP", "4 MB", "zona segura central de 864 × 360 px"]) assert.ok(cover.includes(text), text);
  const logo = html("logo");
  for (const text of ["Horizontal 900 × 300 px", "Cuadrado 600 × 600 px", "3:1 o 1:1", "Zona segura"]) assert.ok(logo.includes(text), text);
  assert.ok(html("avatar").includes("800 × 800 px"));
  assert.ok(html("hero").includes("1920 × 1080 px") && html("hero").includes("16:9"));
});
