import "./helpers/test-database";
// P0 Personas: regresión del perfil público real (CardProfileView) y de la vCard.
// - El perfil público (/c/[slug], isPreview=false) mantiene analítica, acciones con enlace real y vCard.
// - La vista previa (editor y landings) no monta la analítica ni genera enlaces activos.
// - La vCard omite ORG cuando el perfil no tiene empresa (no publica el nombre interno de la cuenta).
// Renderiza el componente real con react-dom/server. PublicCardAnalytics y TrackButton (los dos
// componentes que envían eventos) se sustituyen por espías (node:test mock.module) para comprobar si se
// montan y con qué datos: TrackButton resuelve su destino al hacer clic, por eso se verifica su `href`.
// No usa base de datos ni red.
import { test, mock, before } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import type { CardProfileData } from "../../components/card-profile/CardProfileView";

type AnalyticsCall = { cardId: string; contactSource: string };
const analyticsCalls: AnalyticsCall[] = [];
mock.module("../../components/card-profile/PublicCardAnalytics.tsx", {
  defaultExport: (props: AnalyticsCall) => {
    analyticsCalls.push({ cardId: props.cardId, contactSource: props.contactSource });
    return null;
  },
});

type TrackCall = { cardId: string; eventType: string; href: string };
const trackCalls: TrackCall[] = [];
mock.module("../../app/c/[slug]/TrackButton.tsx", {
  defaultExport: (props: TrackCall & { children?: unknown }) => {
    trackCalls.push({ cardId: props.cardId, eventType: props.eventType, href: props.href });
    return createElement("button", { type: "button", "data-track": props.eventType }, props.children as never);
  },
});

// Los módulos se cargan después de registrar el espía.
let renderToStaticMarkup: typeof import("react-dom/server").renderToStaticMarkup;
let CardProfileView: typeof import("../../components/card-profile/CardProfileView").default;
let buildProfileVcard: typeof import("../../lib/card-profile/vcard").buildProfileVcard;
before(async () => {
  ({ renderToStaticMarkup } = await import("react-dom/server"));
  ({ default: CardProfileView } = await import("../../components/card-profile/CardProfileView"));
  ({ buildProfileVcard } = await import("../../lib/card-profile/vcard"));
});

const ACCOUNT_NAME = "Cuenta Interna SpA";

function fixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "card_test_1",
    slug: "miguel-rojas",
    name: "Miguel Rojas",
    themeColor: "#246bfd",
    themeMode: "dark",
    template: "classic-dark",
    bannerStyle: "straight",
    photoStyle: "circle",
    logoUrl: null,
    avatarUrl: null,
    coverUrl: null,
    heroImageUrl: null,
    profileName: "Miguel Rojas",
    role: "Maestro soldador",
    companyName: "Taller Rojas",
    bio: "Soldadura y estructuras.",
    location: "Valdivia",
    videoUrl: null,
    videoTitle: null,
    email: "miguel@example.com",
    phone: "+56 9 1111 2222",
    whatsapp: "+56 9 1111 2222",
    instagram: "https://instagram.com/ejemplo",
    facebook: null,
    linkedin: "https://linkedin.com/in/ejemplo",
    tiktok: null,
    youtube: null,
    showEmail: true,
    showPhone: true,
    showWhatsapp: true,
    showInstagram: true,
    showFacebook: false,
    showLinkedin: true,
    showTiktok: false,
    showYoutube: false,
    company: { name: ACCOUNT_NAME, linkedin: null, tiktok: null, youtube: null },
    links: [
      { id: "l1", title: "Mis trabajos", url: "https://example.com/trabajos", order: 0, isActive: true },
      { id: "l2", title: "Enlace inactivo", url: "https://example.com/inactivo", order: 1, isActive: false },
    ],
    shareContactEnabled: false,
    shareContactButtonText: "Compárteme tus datos",
    shareContactIntro: "",
    shareContactConfirm: "",
    shareContactConsent: "",
    primaryActionType: "WHATSAPP",
    secondaryActionType: "SAVE_CONTACT",
    ...overrides,
  };
}

function render(card: ReturnType<typeof fixture>, props: { isPreview?: boolean; contactSource?: "NFC" | "QR" | "DIRECT" } = {}) {
  analyticsCalls.length = 0;
  trackCalls.length = 0;
  return renderToStaticMarkup(createElement(CardProfileView, { card: card as unknown as CardProfileData, ...props }));
}

const hrefOf = (eventType: string) => trackCalls.filter(t => t.eventType === eventType).map(t => t.href);

/** Contenido de la vCard que descarga «Guardar contacto» (último render). */
function lastVcard(card = fixture()): string {
  const hrefs = hrefOf("VCARD_DOWNLOAD");
  assert.equal(hrefs.length, 1, "un único botón «Guardar contacto»");
  assert.equal(hrefs[0], `/c/${encodeURIComponent(card.slug)}/contacto.vcf`);
  return buildProfileVcard(card);
}

const EXPECTED_WITH_COMPANY = `BEGIN:VCARD
VERSION:3.0
N:;Miguel Rojas;;;
FN:Miguel Rojas
ORG:Taller Rojas
TITLE:Maestro soldador
TEL;TYPE=CELL,VOICE:+56911112222
EMAIL;TYPE=INTERNET:miguel@example.com
END:VCARD`.split("\n").join("\r\n") + "\r\n";

// ---------- vCard ----------

test("vCard con empresa: formato interoperable con CRLF", () => {
  assert.equal(buildProfileVcard(fixture()), EXPECTED_WITH_COMPANY);
});

test("vCard sin empresa (null, vacía o solo espacios): sin línea ORG y sin el nombre de la cuenta", () => {
  for (const companyName of [null, "", "   "]) {
    const v = buildProfileVcard(fixture({ companyName }));
    assert.ok(!/^ORG:/m.test(v), `ORG presente con companyName=${JSON.stringify(companyName)}`);
    assert.ok(!v.includes(ACCOUNT_NAME));
    assert.equal(v, EXPECTED_WITH_COMPANY.replace("ORG:Taller Rojas\r\n", ""));
  }
});

test("vCard: FN usa el nombre de la tarjeta si no hay nombre de perfil; campos vacíos se omiten", () => {
  const v = buildProfileVcard(fixture({ profileName: null, role: null, phone: null, email: null, companyName: null }));
  assert.equal(v, "BEGIN:VCARD\r\nVERSION:3.0\r\nN:;Miguel Rojas;;;\r\nFN:Miguel Rojas\r\nEND:VCARD\r\n");
});

test("vCard: la empresa se publica sin espacios sobrantes", () => {
  assert.match(buildProfileVcard(fixture({ companyName: "  Taller Rojas  " })), /^ORG:Taller Rojas$/m);
});

test("vCard: escapa coma, punto y coma y backslash (RFC 2426)", () => {
  const v = buildProfileVcard(fixture({ companyName: "Rojas, Soto; y Cía. \\ Ltda.", role: "Soldador, MIG; TIG" }));
  assert.match(v, /^ORG:Rojas\\, Soto\\; y Cía\. \\\\ Ltda\.$/m);
  assert.match(v, /^TITLE:Soldador\\, MIG\\; TIG$/m);
});

test("vCard: un salto de línea en un dato no puede inyectar propiedades", () => {
  const v = buildProfileVcard(fixture({ role: "Soldador\r\nORG:Falsa", profileName: "Miguel\nTEL:+56900000000", email: "a@b.cl\nURL:https://malo.example" }));
  const lines = v.trimEnd().split("\r\n");
  assert.deepEqual(lines.map(l => l.split(":")[0]), ["BEGIN", "VERSION", "N", "FN", "ORG", "TITLE", "TEL;TYPE=CELL,VOICE", "EMAIL;TYPE=INTERNET", "END"]);
  assert.equal(lines.filter(l => l.startsWith("ORG:")).length, 1);
  assert.equal(lines.filter(l => l.startsWith("TEL;")).length, 1);
  assert.ok(!v.replaceAll("\r\n", "").includes("\n"));
});

test("vCard: el teléfono se normaliza para importar", () => {
  assert.match(buildProfileVcard(fixture()), /^TEL;TYPE=CELL,VOICE:\+56911112222$/m);
});

// ---------- Perfil público real ----------

test("perfil público: monta la analítica una vez con el id real y el origen", () => {
  for (const contactSource of ["NFC", "QR", "DIRECT"] as const) {
    render(fixture(), { isPreview: false, contactSource });
    assert.deepEqual(analyticsCalls, [{ cardId: "card_test_1", contactSource }]);
  }
  render(fixture()); // sin props: valores por defecto del componente
  assert.deepEqual(analyticsCalls, [{ cardId: "card_test_1", contactSource: "DIRECT" }]);
});

test("perfil público: acciones con destino real y su tipo de evento (WhatsApp, llamar, correo, redes, enlaces)", () => {
  render(fixture(), { isPreview: false });
  assert.ok(trackCalls.every(t => t.cardId === "card_test_1"), "todas las acciones con el id real");
  assert.deepEqual(hrefOf("WHATSAPP_CLICK"), ["https://wa.me/+56911112222"]);
  assert.deepEqual(hrefOf("PHONE_CLICK"), ["tel:+56911112222"]);
  assert.deepEqual(hrefOf("EMAIL_CLICK"), ["mailto:miguel@example.com"]);
  assert.deepEqual(hrefOf("LINK_CLICK"), ["https://linkedin.com/in/ejemplo", "https://instagram.com/ejemplo", "https://example.com/trabajos"]);
  assert.equal(hrefOf("VCARD_DOWNLOAD").length, 1);
});

test("perfil público: canales ocultos no generan acción", () => {
  render(fixture({ showWhatsapp: false, showPhone: false, showEmail: false, showInstagram: false }), { isPreview: false });
  assert.deepEqual(hrefOf("WHATSAPP_CLICK"), []);
  assert.deepEqual(hrefOf("PHONE_CLICK"), []);
  assert.deepEqual(hrefOf("EMAIL_CLICK"), []);
  assert.deepEqual(hrefOf("LINK_CLICK"), ["https://linkedin.com/in/ejemplo", "https://example.com/trabajos"]);
});

test("perfil público: «Guardar contacto» descarga la vCard con la empresa del perfil", () => {
  render(fixture(), { isPreview: false });
  assert.equal(lastVcard(), EXPECTED_WITH_COMPANY);
});

test("perfil público sin empresa: la vCard no incluye ORG ni el nombre de la cuenta", () => {
  render(fixture({ companyName: null }), { isPreview: false });
  const v = lastVcard(fixture({ companyName: null }));
  assert.ok(!/^ORG:/m.test(v));
  assert.ok(!v.includes(ACCOUNT_NAME));
});

test("perfil público: el botón de captura depende solo de shareContactEnabled (sin cambios)", () => {
  assert.ok(!render(fixture({ shareContactEnabled: false }), { isPreview: false }).includes("Compárteme tus datos"));
  assert.ok(render(fixture({ shareContactEnabled: true }), { isPreview: false }).includes("Compárteme tus datos"));
});

test("perfil público con plantilla de empresa: la cabecera sigue mostrando el nombre (sin cambios en P0)", () => {
  const html = render(fixture({ template: "company-dark", companyName: null }), { isPreview: false });
  assert.ok(html.includes(ACCOUNT_NAME), "la cabecera de empresa conserva su comportamiento");
  assert.ok(!/^ORG:/m.test(lastVcard(fixture({ companyName: null }))), "pero la vCard no publica ORG");
});

// ---------- Vista previa ----------

test("vista previa: no monta la analítica", () => {
  for (const contactSource of ["NFC", "QR", "DIRECT"] as const) {
    render(fixture(), { isPreview: true, contactSource });
    assert.equal(analyticsCalls.length, 0);
  }
});

test("vista previa: muestra las acciones sin componentes que envían eventos ni enlaces activos", () => {
  const html = render(fixture(), { isPreview: true });
  assert.ok(html.includes("Contactar ahora") && html.includes("Guardar contacto") && html.includes("Llamar") && html.includes("Instagram"));
  assert.equal(trackCalls.length, 0, "ninguna acción registra eventos");
  assert.ok(!/href="/.test(html), "sin enlaces navegables");
});
