import "./helpers/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import UrbanLocalTemplate from "../../components/local/UrbanLocalTemplate";

const emoji = /\p{Extended_Pictographic}/u;
const data = { businessName: "Cafetería Demo", clubName: "Club Demo", benefitTitle: "Café de regalo", address: "Calle Demo 123", primaryColor: "#0f766e", secondaryColor: "#134e4a" };

test("Club: la plantilla usa íconos del sistema, sin emojis, y el éxito es legible", () => {
  const success = renderToStaticMarkup(createElement(UrbanLocalTemplate, { data, mode: "public", isSuccess: true, whatsappLink: "https://wa.me/56912345678", slug: "club-demo", visitId: "v" }));
  const form = renderToStaticMarkup(createElement(UrbanLocalTemplate, { data, mode: "public", error: "Revisa tus datos." }));
  for (const html of [success, form]) assert.ok(!emoji.test(html), "sin emojis");
  assert.ok(success.includes("<svg") && success.includes("Confirmar por WhatsApp") && success.includes("Guardar contacto del local"));
  assert.ok(!/text-white">¡Ya eres parte del Club!/.test(success), "el título de éxito no es blanco sobre fondo claro");
  assert.match(form, /role="alert"[^>]*>.*Revisa tus datos\./);
});

// ── Integración: PostgreSQL desechable en loopback ──────────────────────────
const url = process.env.LOCAL_TEST_DATABASE_URL;
const allowed = url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname);
test("Club integrado: identidad propia con respaldo del Local y estado neutral", { skip: !allowed }, async t => {
  process.env.DATABASE_URL = url!;
  process.env.NEXTAUTH_SECRET = "local-test-secret-only";
  const { prisma } = require("../../lib/prisma") as { prisma: PrismaClient };
  const { default: ClubPage } = require("../../app/club/[slug]/page");
  const suffix = randomUUID().slice(0, 8);
  const company = await prisma.company.create({ data: { name: "Cafetería Demo " + suffix, slug: "club-" + suffix } });
  await prisma.companyProductLicense.create({ data: { companyId: company.id, product: "LOCAL", planCode: "LOCAL_PERSONALIZADO", includedCampaigns: 10, includedTouchpoints: 40 } });
  const location = await prisma.localLocation.create({ data: { companyId: company.id, key: "loc-" + suffix, name: "Nombre Interno Sucursal" } });
  const blob = (kind: string) => `https://abc123.public.blob.vercel-storage.com/local-brand/${location.id}/${kind}-Ab12.png`;
  await prisma.localLocation.update({ where: { id: location.id }, data: { logoUrl: blob("logo"), coverImageUrl: blob("cover"), address: "Dirección del Local 45" } });
  const snapshot = { businessName: "Cafetería Demo", clubName: "Club Demo", benefitTitle: "Café de regalo", consentText: "Acepto", consentVersion: 1, primaryColor: "#0f766e", secondaryColor: "#134e4a" };
  const campaign = await prisma.localCampaign.create({ data: { companyId: company.id, locationId: location.id, name: "Campaña Demo", slug: "club-c-" + suffix,
    status: "PUBLISHED", publishedVersion: 1, publishedAt: new Date(), publishedSnapshot: snapshot } });
  const render = async () => renderToStaticMarkup(await ClubPage({ params: Promise.resolve({ slug: campaign.slug }), searchParams: Promise.resolve({}) }));

  await t.test("Sin logo, portada ni dirección propios, el Club usa los del Local (nunca su nombre interno)", async () => {
    const html = await render();
    assert.ok(html.includes(blob("logo")) && html.includes(blob("cover")) && html.includes("Dirección del Local 45"));
    assert.ok(!html.includes("Nombre Interno Sucursal"));
  });

  await t.test("La identidad publicada del Club tiene prioridad", async () => {
    await prisma.localCampaign.update({ where: { id: campaign.id }, data: { publishedSnapshot: { ...snapshot, logoUrl: "https://club.example/logo.png", address: "Dirección del Club 9" } } });
    const html = await render();
    assert.ok(html.includes("https://club.example/logo.png") && !html.includes(blob("logo")));
    assert.ok(html.includes("Dirección del Club 9") && !html.includes("Dirección del Local 45"));
    assert.ok(html.includes(blob("cover")), "lo que el Club no definió sigue completándose desde el Local");
  });

  await t.test("Licencia inactiva: estado neutral compartido, sin datos del Club", async () => {
    await prisma.companyProductLicense.update({ where: { companyId_product: { companyId: company.id, product: "LOCAL" } }, data: { status: "SUSPENDED" } });
    const html = await render();
    assert.ok(html.includes("Punto Inteligente temporalmente inactivo") && !html.includes("Club Demo") && !emoji.test(html));
  });

  await prisma.$disconnect();
});
