import "./helpers/test-database";
// BUG-E2E-2 (privacidad, 27-oct-2026): un dato de contacto con «Mostrar» desmarcado no debe salir en ninguna
// salida pública del perfil (/c/[slug]): página, HTML serializado, vCard. Tampoco la ficha interna de la empresa.
// Sin base de datos ni red.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { toPublicCardProfile, type CardRowForPublicProfile } from "../../lib/card-profile/public-card";
import { buildProfileVcard } from "../../lib/card-profile/vcard";

const SECRETOS = {
  email: "oculto.correo@example.test",
  phone: "56900001111",
  whatsapp: "56900002222",
  instagram: "https://instagram.com/oculto-e2e",
  facebook: "https://facebook.com/oculto-e2e",
  linkedin: "https://linkedin.com/in/oculto-e2e",
  tiktok: "https://tiktok.com/@oculto-e2e",
  youtube: "https://youtube.com/@oculto-e2e",
};
const INTERNOS = { internalNotes: "NOTA-INTERNA-NO-PUBLICAR", userId: "user_interno_123", companyId: "company_interna_456", plan: "PLAN-INTERNO", licenseStatus: "LICENCIA-INTERNA" };

function row(show: boolean): CardRowForPublicProfile & Record<string, unknown> {
  return {
    id: "card_publico_1", slug: "perfil-prueba", name: "Nombre interno", isActive: true,
    themeColor: "#2563eb", themeMode: "dark", template: "corporate-1", bannerStyle: "classic", photoStyle: "circle",
    logoUrl: null, avatarUrl: null, coverUrl: null, heroImageUrl: null,
    profileName: "Perfil Público", role: "Cargo", companyName: "Empresa Visible", bio: "Bio", location: "Valdivia",
    videoUrl: null, videoTitle: null,
    ...SECRETOS,
    showEmail: show, showPhone: show, showWhatsapp: show, showInstagram: show, showFacebook: show, showLinkedin: show, showTiktok: show, showYoutube: show,
    shareContactEnabled: true, shareContactButtonText: "b", shareContactIntro: "i", shareContactConfirm: "c", shareContactConsent: "k", shareContactFields: null,
    primaryActionType: "WHATSAPP", secondaryActionType: "SAVE_CONTACT",
    userId: INTERNOS.userId, companyId: INTERNOS.companyId,
    company: { name: "Cuenta SA", isActive: true, internalNotes: INTERNOS.internalNotes, plan: INTERNOS.plan, licenseStatus: INTERNOS.licenseStatus, maxIdentities: 5 } as never,
    links: [
      { id: "l1", title: "Activo", url: "https://ejemplo.test/a", order: 0, isActive: true },
      { id: "l2", title: "Inactivo", url: "https://ejemplo.test/oculto", order: 1, isActive: false },
    ],
  };
}

test("datos con «Mostrar» desmarcado no salen en la proyección pública (lo que se serializa al HTML)", () => {
  const pub = toPublicCardProfile(row(false), { shareContactEnabled: false });
  const serialized = JSON.stringify(pub);
  for (const [campo, valor] of Object.entries(SECRETOS)) {
    assert.equal((pub as unknown as Record<string, unknown>)[campo], null, campo);
    assert.ok(!serialized.includes(valor), `${campo} aparece en la salida pública`);
  }
});

test("datos visibles se publican igual que antes", () => {
  const pub = toPublicCardProfile(row(true), { shareContactEnabled: true });
  for (const [campo, valor] of Object.entries(SECRETOS)) assert.equal((pub as unknown as Record<string, unknown>)[campo], valor, campo);
  assert.equal(pub.profileName, "Perfil Público");
  assert.equal(pub.shareContactEnabled, true);
});

test("la ficha interna de la empresa y los identificadores internos nunca se publican", () => {
  const pub = toPublicCardProfile(row(true), { shareContactEnabled: true });
  assert.deepEqual(Object.keys(pub.company).sort(), ["isActive", "name"]);
  const serialized = JSON.stringify(pub);
  for (const valor of Object.values(INTERNOS)) assert.ok(!serialized.includes(valor), `se publica ${valor}`);
  assert.ok(!("userId" in pub) && !("companyId" in pub));
});

test("enlaces inactivos no se publican", () => {
  const pub = toPublicCardProfile(row(true), { shareContactEnabled: true });
  assert.deepEqual(pub.links.map((l) => l.title), ["Activo"]);
  assert.ok(!JSON.stringify(pub).includes("https://ejemplo.test/oculto"));
});

test("vCard del perfil público: excluye correo y teléfono ocultos", () => {
  const vcard = buildProfileVcard(toPublicCardProfile(row(false), { shareContactEnabled: false }));
  assert.ok(!vcard.includes(SECRETOS.email) && !vcard.includes(SECRETOS.phone));
  const visible = buildProfileVcard(toPublicCardProfile(row(true), { shareContactEnabled: false }));
  assert.match(visible, new RegExp(`^EMAIL:${SECRETOS.email}$`, "m"));
  assert.match(visible, new RegExp(`^TEL:${SECRETOS.phone}$`, "m"));
});

test("vCard: defensa en profundidad aunque llegue el dato con «Mostrar» desmarcado", () => {
  const vcard = buildProfileVcard({ name: "n", profileName: "p", companyName: null, role: null, phone: SECRETOS.phone, email: SECRETOS.email, showPhone: false, showEmail: false });
  assert.ok(!vcard.includes(SECRETOS.email) && !vcard.includes(SECRETOS.phone));
});

test("/c/[slug] entrega al componente cliente solo la proyección pública", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../app/c/[slug]/page.tsx"), "utf8");
  assert.match(source, /toPublicCardProfile\(/);
  assert.match(source, /<CardProfileView card=\{publicCard\}/);
  assert.doesNotMatch(source, /<CardProfileView card=\{\{\s*\.\.\.card/);
});
