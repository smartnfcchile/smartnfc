import "./helpers/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import {
  brandUploadPathname, contrastRatio, isAllowedBrandImageUrl, locationIdentitySchema, normalizeHexColor, normalizePhone,
  parseBrandUploadPathname, readableTextColor, resolveLocalBrand,
} from "../../lib/local/brand";

const LOC = "cm0locdemo0000000000000001";
const blob = (path: string) => `https://abc123store.public.blob.vercel-storage.com/${path}`;
const base = { name: "Sucursal Demo", address: "", displayName: "", shortDescription: "", logoUrl: "", coverImageUrl: "",
  primaryColor: "", secondaryColor: "", phone: "", websiteUrl: "", mapsUrl: "" };

test("Identidad: imágenes solo desde Vercel Blob, HTTPS y carpeta del propio local", () => {
  assert.equal(isAllowedBrandImageUrl(blob(`local-brand/${LOC}/logo-AbC123xyz.png`), LOC), true);
  assert.equal(isAllowedBrandImageUrl(blob(`local-brand/${LOC}/cover.webp`), LOC), true);
  for (const value of [
    "data:image/png;base64,AAAA", "javascript:alert(1)", "http://abc123store.public.blob.vercel-storage.com/local-brand/" + LOC + "/logo.png",
    blob(`local-brand/otro-local/logo.png`), blob(`local-brand/${LOC}/logo.svg`), blob(`avatars/logo.png`),
    "https://evil.example/local-brand/" + LOC + "/logo.png", "https://public.blob.vercel-storage.com.evil.example/local-brand/" + LOC + "/logo.png",
    blob(`local-brand/${LOC}/logo.png?x=1`), blob(`local-brand/${LOC}/../x/logo.png`), "https://user:pw@abc.public.blob.vercel-storage.com/local-brand/" + LOC + "/logo.png",
  ]) assert.equal(isAllowedBrandImageUrl(value, LOC), false, value);
  assert.equal(isAllowedBrandImageUrl(blob(`local-brand/${LOC}/logo.png`), "bad/id"), false);
});

test("Identidad: rutas de subida acotadas a logo/portada de un local", () => {
  assert.equal(brandUploadPathname(LOC, "logo", "image/png"), `local-brand/${LOC}/logo.png`);
  assert.deepEqual(parseBrandUploadPathname(`local-brand/${LOC}/cover.jpg`), { locationId: LOC, kind: "cover" });
  for (const p of ["local-brand/../x/logo.png", `local-brand/${LOC}/avatar.png`, `local-brand/${LOC}/logo.svg`, `/local-brand/${LOC}/logo.png`, `local-brand/${LOC}/sub/logo.png`, "otro/logo.png"])
    assert.equal(parseBrandUploadPathname(p), null, p);
});

test("Identidad: teléfono, colores y enlaces se normalizan o rechazan", () => {
  assert.equal(normalizePhone("9 1234 5678"), "+56912345678");
  assert.equal(normalizePhone("+56 9 1234-5678"), "+56912345678");
  assert.equal(normalizePhone("56912345678"), "+56912345678");
  assert.equal(normalizePhone("+54 11 1234 5678"), "+541112345678");
  for (const bad of ["12345", "abc", "+0123456789", "tel:+56912345678", "9123<script>"]) assert.equal(normalizePhone(bad), null, bad);
  assert.equal(normalizeHexColor("#ABC"), "#aabbcc");
  assert.equal(normalizeHexColor("red"), null);
  const schema = locationIdentitySchema(LOC);
  const ok = schema.parse({ ...base, displayName: "  Café Demo  ", primaryColor: "#0F766E", phone: "912345678", websiteUrl: "https://ejemplo.cl", mapsUrl: "https://maps.app.goo.gl/demo" });
  assert.equal(ok.displayName, "Café Demo"); assert.equal(ok.primaryColor, "#0f766e"); assert.equal(ok.phone, "+56912345678");
  assert.equal(ok.address, null); assert.equal(ok.logoUrl, null);
  for (const [key, value] of [["websiteUrl", "javascript:alert(1)"], ["websiteUrl", "http://ejemplo.cl"], ["mapsUrl", "data:text/html,x"],
    ["mapsUrl", "https://localhost/x"], ["logoUrl", "https://ejemplo.cl/logo.png"], ["primaryColor", "rgb(0,0,0)"], ["name", "x"], ["displayName", "x".repeat(81)]] as const)
    assert.equal(schema.safeParse({ ...base, [key]: value }).success, false, key + "=" + value);
  assert.equal(schema.safeParse({ ...base, extra: "no" }).success, false, "campos desconocidos");
});

test("Identidad: resolución centralizada Local → Campaña → Empresa → default", () => {
  const company = { name: "Negocio Demo" };
  const campaign = { businessName: "Campaña Demo", logoUrl: "https://c/logo.png", heroImageUrl: "https://c/hero.png", primaryColor: "#b91c1c", secondaryColor: "#111111", address: "Calle Campaña 1" };
  const empty = resolveLocalBrand({ company });
  assert.equal(empty.displayName, "Negocio Demo"); assert.equal(empty.sources.displayName, "company");
  assert.equal(empty.primaryColor, "#2563eb"); assert.equal(empty.sources.primaryColor, "default"); assert.equal(empty.logoUrl, null);
  const withCampaign = resolveLocalBrand({ location: { name: "Sucursal Demo" }, campaign, company });
  assert.equal(withCampaign.displayName, "Campaña Demo"); assert.equal(withCampaign.logoUrl, "https://c/logo.png");
  assert.equal(withCampaign.coverImageUrl, "https://c/hero.png"); assert.equal(withCampaign.primaryColor, "#b91c1c"); assert.equal(withCampaign.address, "Calle Campaña 1");
  const full = resolveLocalBrand({ location: { name: "Sucursal Demo", displayName: "Local Demo", logoUrl: "https://l/logo.png", primaryColor: "#0F766E", address: "Calle Local 2", phone: "+56912345678" }, campaign, company });
  assert.equal(full.displayName, "Local Demo"); assert.equal(full.sources.displayName, "location");
  assert.equal(full.logoUrl, "https://l/logo.png"); assert.equal(full.primaryColor, "#0f766e"); assert.equal(full.address, "Calle Local 2");
  assert.equal(full.coverImageUrl, "https://c/hero.png", "campo vacío del local hereda de la campaña");
  assert.equal(full.phone, "+56912345678"); assert.equal(full.initials, "LD");
  // El nombre interno del local (LocalLocation.name) nunca es nombre público.
  const internalOnly = resolveLocalBrand({ location: { name: "Sucursal Demo" }, company });
  assert.equal(internalOnly.displayName, "Negocio Demo"); assert.equal(internalOnly.sources.displayName, "company");
  assert.equal(resolveLocalBrand({ location: { name: "Sucursal Demo" } }).displayName, "Mi local");
  // Imágenes públicas: solo HTTPS (campañas antiguas pueden tener URLs sin validar).
  const unsafe = resolveLocalBrand({ campaign: { logoUrl: "javascript:alert(1)", heroImageUrl: "http://inseguro.example/x.png" }, company });
  assert.equal(unsafe.logoUrl, null); assert.equal(unsafe.coverImageUrl, null);
});

test("Identidad: texto sobre color de marca elige el de mayor contraste", () => {
  assert.equal(readableTextColor("#0f172a"), "#ffffff");
  assert.equal(readableTextColor("#fde047"), "#0f172a");
  for (const color of ["#2563eb", "#0f766e", "#b91c1c", "#fde047", "#ffffff", "#000000"])
    assert.ok(contrastRatio(color, readableTextColor(color)) >= 4.5, color);
});

// ── Subida procesada en servidor (sin client token ni onUploadCompleted) ─────
// Token ficticio con el formato de Vercel Blob (vercel_blob_rw_<storeId>_<secreto>); no es una credencial real.
const FAKE_RW_TOKEN = "vercel_blob_rw_TestStore0001_notARealSecretValue0123456789";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const fileOf = (bytes: Uint8Array, type: string, size?: number) => {
  const data = size ? new Uint8Array(size) : bytes; if (size) data.set(bytes);
  return new File([new Uint8Array(data)], "imagen", { type });
};

test("Subida: el contenido real decide el tipo (PNG/JPG/WEBP), no la extensión ni el MIME", () => {
  const { detectBrandImageType } = require("../../lib/local/brand");
  assert.equal(detectBrandImageType(PNG), "image/png");
  assert.equal(detectBrandImageType(JPG), "image/jpeg");
  assert.equal(detectBrandImageType(WEBP), "image/webp");
  assert.equal(detectBrandImageType(SVG), null);
  assert.equal(detectBrandImageType(new Uint8Array([0x47, 0x49, 0x46, 0x38])), null, "GIF");
});

test("Subida: autoriza, valida y guarda en la carpeta del local sin depender de callbackUrl", async () => {
  const { processBrandUpload, BrandUploadError } = require("../../lib/local/brand-upload");
  const calls: Array<{ pathname: string; options: Record<string, unknown> }> = [];
  const authorized: string[] = [];
  const deps = (over: Record<string, unknown> = {}) => ({
    authorize: async (pathname: string) => { authorized.push(pathname); return { locationId: LOC, kind: "logo" }; },
    put: async (pathname: string, _body: unknown, options: Record<string, unknown>) => { calls.push({ pathname, options });
      return { url: blob(pathname.replace(/\.(png|jpg|webp)$/, "-Rnd123.$1")) }; },
    env: { BLOB_READ_WRITE_TOKEN: FAKE_RW_TOKEN }, ...over,
  });
  const code = async (p: Promise<unknown>) => { try { await p; return "OK"; } catch (e) { assert.ok(e instanceof BrandUploadError, String(e)); return (e as InstanceType<typeof BrandUploadError>).code; } };

  const ok = await processBrandUpload({ locationId: LOC, kind: "cover", file: fileOf(WEBP, "image/webp") }, deps());
  assert.match(ok.url, new RegExp(`/local-brand/${LOC}/cover-Rnd123\\.webp$`));
  assert.equal(calls[0].pathname, `local-brand/${LOC}/cover.webp`, "el servidor decide ruta y extensión");
  assert.deepEqual(calls[0].options, { access: "public", contentType: "image/webp", addRandomSuffix: true, allowOverwrite: false, token: FAKE_RW_TOKEN },
    "el token read-write se pasa explícito para que la librería no elija OIDC + BLOB_STORE_ID");
  assert.ok(!("callbackUrl" in calls[0].options) && !("onUploadCompleted" in calls[0].options));

  calls.length = 0; authorized.length = 0;
  assert.equal(await code(processBrandUpload({ locationId: LOC, kind: "logo", file: fileOf(SVG, "image/png") }, deps())), "UNSUPPORTED_TYPE", "SVG disfrazado de PNG");
  assert.equal(await code(processBrandUpload({ locationId: LOC, kind: "logo", file: fileOf(PNG, "image/svg+xml") }, deps())), "UNSUPPORTED_TYPE");
  assert.equal(await code(processBrandUpload({ locationId: LOC, kind: "logo", file: fileOf(PNG, "image/png", 4 * 1024 * 1024 + 1) }, deps())), "FILE_TOO_LARGE");
  assert.equal(await code(processBrandUpload({ locationId: LOC, kind: "logo", file: fileOf(PNG, "image/png", 4 * 1024 * 1024) }, deps())), "OK", "4 MB exactos se aceptan");
  assert.equal(await code(processBrandUpload({ locationId: LOC, kind: "avatar", file: fileOf(PNG, "image/png") }, deps())), "INVALID_REQUEST");
  assert.equal(await code(processBrandUpload({ locationId: "../otro", kind: "logo", file: fileOf(PNG, "image/png") }, deps())), "INVALID_REQUEST");
  assert.equal(await code(processBrandUpload({ locationId: LOC, kind: "logo", file: "no-es-archivo" }, deps())), "INVALID_REQUEST");
  const putsBefore = calls.length;
  assert.equal(await code(processBrandUpload({ locationId: LOC, kind: "logo", file: fileOf(PNG, "image/png") },
    deps({ authorize: async () => { throw new Error("Acceso denegado."); } }))), "FORBIDDEN");
  assert.equal(calls.length, putsBefore, "sin autorización no se sube nada");
  assert.equal(await code(processBrandUpload({ locationId: LOC, kind: "logo", file: fileOf(PNG, "image/png") }, deps({ env: {} }))), "STORAGE_NOT_CONFIGURED");
  const { BlobAccessError } = require("@vercel/blob");
  assert.equal(await code(processBrandUpload({ locationId: LOC, kind: "logo", file: fileOf(PNG, "image/png") },
    deps({ put: async () => { throw new BlobAccessError(); } }))), "STORAGE_ACCESS");
  assert.equal(await code(processBrandUpload({ locationId: LOC, kind: "logo", file: fileOf(PNG, "image/png") },
    deps({ put: async () => { throw new Error("timeout"); } }))), "STORAGE_FAILED");
  assert.equal(await code(processBrandUpload({ locationId: LOC, kind: "logo", file: fileOf(PNG, "image/png") },
    deps({ put: async () => ({ url: blob("local-brand/otro-local/logo.png") }) }))), "STORAGE_FAILED", "URL fuera de la carpeta");
  assert.ok(authorized.every(p => p.startsWith(`local-brand/${LOC}/`)));
});

test("Subida: la configuración exige BLOB_READ_WRITE_TOKEN; BLOB_STORE_ID u OIDC no la reemplazan", async () => {
  const { processBrandUpload, blobConfigDiagnostics } = require("../../lib/local/brand-upload");
  let puts = 0;
  const run = (env: Record<string, string>) => processBrandUpload({ locationId: LOC, kind: "logo", file: fileOf(PNG, "image/png") }, {
    authorize: async () => ({ locationId: LOC, kind: "logo" }), env,
    put: async (pathname: string, _b: unknown, options: { token?: string }) => { puts++; assert.equal(options.token, FAKE_RW_TOKEN);
      return { url: blob(pathname.replace(".png", "-Z9.png")) }; },
  });
  const codeOf = async (env: Record<string, string>) => { try { await run(env); return "OK"; } catch (e) { return (e as { code: string }).code; } };
  assert.equal(await codeOf({ BLOB_STORE_ID: "store_TestStore0001" }), "STORAGE_NOT_CONFIGURED", "solo BLOB_STORE_ID");
  assert.equal(await codeOf({ BLOB_STORE_ID: "store_TestStore0001", VERCEL_OIDC_TOKEN: "oidc.fake.value" }), "STORAGE_NOT_CONFIGURED", "OIDC + store id sin token");
  assert.equal(await codeOf({ BLOB_READ_WRITE_TOKEN: "   " }), "STORAGE_NOT_CONFIGURED", "token vacío");
  assert.equal(await codeOf({ BLOB_READ_WRITE_TOKEN: "no-es-un-token" }), "STORAGE_NOT_CONFIGURED", "formato inválido");
  assert.equal(puts, 0);
  assert.equal(await codeOf({ BLOB_READ_WRITE_TOKEN: FAKE_RW_TOKEN, BLOB_STORE_ID: "store_OtroStore", VERCEL_OIDC_TOKEN: "oidc.fake.value" }), "OK",
    "con token válido se usa el token aunque existan OIDC y otro BLOB_STORE_ID");
  assert.equal(puts, 1);

  const d = blobConfigDiagnostics({ BLOB_READ_WRITE_TOKEN: FAKE_RW_TOKEN, BLOB_STORE_ID: "store_OtroStore", VERCEL_OIDC_TOKEN: "oidc.fake.value" });
  assert.deepEqual(d, { tokenPresent: true, tokenLength: FAKE_RW_TOKEN.length, tokenFormatValid: true, tokenStoreId: "Test…(13)",
    blobStoreIdPresent: true, blobStoreIdMatchesToken: false, oidcTokenPresentInEnv: true });
  assert.equal(blobConfigDiagnostics({ BLOB_READ_WRITE_TOKEN: FAKE_RW_TOKEN, BLOB_STORE_ID: "store_teststore0001" }).blobStoreIdMatchesToken, true);
  const serialized = JSON.stringify(d);
  assert.ok(!serialized.includes("notARealSecret") && !serialized.includes("TestStore0001") && !serialized.includes("oidc.fake"), "el diagnóstico no expone secretos");
});

test("Subida: el detalle de error registrado contiene diagnóstico sin el token", async () => {
  const { processBrandUpload } = require("../../lib/local/brand-upload");
  const { BlobStoreNotFoundError } = require("@vercel/blob");
  try {
    await processBrandUpload({ locationId: LOC, kind: "logo", file: fileOf(PNG, "image/png") }, {
      authorize: async () => ({ locationId: LOC, kind: "logo" }), env: { BLOB_READ_WRITE_TOKEN: FAKE_RW_TOKEN },
      put: async () => { throw new BlobStoreNotFoundError(); },
    });
    assert.fail("debió fallar");
  } catch (e) {
    const err = e as { code: string; detail: string };
    assert.equal(err.code, "STORAGE_ACCESS");
    const detail = JSON.parse(err.detail);
    assert.equal(detail.error, "BlobStoreNotFoundError"); assert.equal(detail.tokenPresent, true);
    assert.ok(!err.detail.includes("notARealSecret") && !err.detail.includes(FAKE_RW_TOKEN));
  }
});

test("Subida: la ruta rechaza otro origen, cuerpos no multipart o excesivos con código y mensaje", async () => {
  const { POST } = require("../../app/api/local/brand-upload/route");
  const { BRAND_UPLOAD_ERRORS } = require("../../lib/local/brand");
  const call = async (headers: Record<string, string>, body: BodyInit = "x") => {
    const res = await POST(new Request("http://localhost:3001/api/local/brand-upload", { method: "POST", headers, body }));
    return { status: res.status, json: await res.json() };
  };
  const cross = await call({ origin: "https://evil.example", "content-type": "multipart/form-data; boundary=x" });
  assert.equal(cross.status, 403); assert.equal(cross.json.error.code, "FORBIDDEN");
  const notMultipart = await call({ "content-type": "application/json" }, "{}");
  assert.equal(notMultipart.status, 400); assert.equal(notMultipart.json.error.code, "INVALID_REQUEST");
  const huge = await call({ "content-type": "multipart/form-data; boundary=x", "content-length": String(6 * 1024 * 1024) });
  assert.equal(huge.status, 413); assert.equal(huge.json.error.message, BRAND_UPLOAD_ERRORS.FILE_TOO_LARGE);
  const noLength = await call({ "content-type": "multipart/form-data; boundary=x" }, "--x--");
  assert.equal(noLength.status, 400, "sin content-length no se lee el cuerpo");
  // Sin sesión: se prueba en la integración (requiere el mock de sesión antes de cargar permisos).
  assert.notEqual(BRAND_UPLOAD_ERRORS.STORAGE_NOT_CONFIGURED, BRAND_UPLOAD_ERRORS.NETWORK, "configuración ≠ conexión");
});

// Integración: solo contra PostgreSQL desechable en loopback (misma regla que local-integration).
const url = process.env.LOCAL_TEST_DATABASE_URL;
const allowed = url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname);
test("Identidad del Local: autorización, aislamiento y concurrencia", { skip: !allowed }, async t => {
  process.env.DATABASE_URL = url!;
  let session: { user: { id: string; companyId: string; role: string } } | null = null;
  require("next-auth");
  require.cache[require.resolve("next-auth")]!.exports = { getServerSession: async () => session };
  const { prisma } = require("../../lib/prisma") as { prisma: PrismaClient };
  const { saveLocationIdentity, authorizeLocalBrandUpload } = require("../../lib/local/location-brand");
  const suffix = randomUUID().slice(0, 8);
  const make = async (label: string, withLicense: boolean) => {
    const company = await prisma.company.create({ data: { name: "Negocio Demo " + label + " " + suffix, slug: "brand-" + label.toLowerCase() + "-" + suffix } });
    const owner = await prisma.user.create({ data: { companyId: company.id, email: `brand-${label}-${suffix}@example.test`, role: "COMPANY_OWNER" } });
    const collaborator = await prisma.user.create({ data: { companyId: company.id, email: `brand-collab-${label}-${suffix}@example.test`, role: "COLLABORATOR" } });
    if (withLicense) await prisma.companyProductLicense.create({ data: { companyId: company.id, product: "LOCAL", planCode: "LOCAL_PERSONALIZADO", includedCampaigns: 5, includedTouchpoints: 20 } });
    const location = await prisma.localLocation.create({ data: { companyId: company.id, key: "k-" + suffix, name: "Sucursal " + label } });
    return { company, owner, collaborator, location };
  };
  const a = await make("A", true), b = await make("B", true), nolicense = await make("C", false);
  const input = (extra: Record<string, string> = {}) => ({ ...base, name: "Sucursal A", displayName: "Local Demo A", primaryColor: "#0f766e",
    logoUrl: blob(`local-brand/${a.location.id}/logo-XyZ.png`), phone: "912345678", ...extra });
  const as = (u: { id: string; companyId: string }, role = "COMPANY_OWNER") => { session = { user: { id: u.id, companyId: u.companyId, role } }; };

  await t.test("B-2: sin sesión la subida se rechaza antes de leer el cuerpo", async () => {
    session = null;
    const { POST } = require("../../app/api/local/brand-upload/route");
    const body = ["--x", "Content-Disposition: form-data; name=\"kind\"", "", "logo", "--x--", ""].join("\r\n");
    const res = await POST(new Request("http://localhost:3001/api/local/brand-upload", { method: "POST", body,
      headers: { "content-type": "multipart/form-data; boundary=x", "content-length": String(body.length) } }));
    assert.equal(res.status, 403); assert.equal((await res.json()).error.code, "FORBIDDEN");
  });
  await t.test("El dueño guarda identidad; se audita y se versiona", async () => {
    as(a.owner);
    const r = await saveLocationIdentity(a.location.id, input(), null);
    assert.ok(r.brandUpdatedAt);
    const row = await prisma.localLocation.findUniqueOrThrow({ where: { id: a.location.id } });
    assert.equal(row.displayName, "Local Demo A"); assert.equal(row.phone, "+56912345678"); assert.equal(row.primaryColor, "#0f766e");
    assert.equal(await prisma.adminAuditLog.count({ where: { entityId: a.location.id, action: "LOCATION_IDENTITY_UPDATE" } }), 1);
    await assert.rejects(() => saveLocationIdentity(a.location.id, input({ displayName: "Otro" }), null), /cambió mientras/);
    const r2 = await saveLocationIdentity(a.location.id, input({ displayName: "Local Demo A2" }), r.brandUpdatedAt);
    assert.notEqual(r2.brandUpdatedAt, r.brandUpdatedAt);
  });
  await t.test("Otra empresa, colaborador o empresa sin Local no pueden editar ni subir", async () => {
    as(b.owner);
    await assert.rejects(() => saveLocationIdentity(a.location.id, input(), null));
    await assert.rejects(() => authorizeLocalBrandUpload(`local-brand/${a.location.id}/logo.png`));
    as(a.collaborator);
    await assert.rejects(() => saveLocationIdentity(a.location.id, input(), null));
    await assert.rejects(() => authorizeLocalBrandUpload(`local-brand/${a.location.id}/logo.png`));
    as(nolicense.owner);
    await assert.rejects(() => saveLocationIdentity(nolicense.location.id, { ...base, name: "Sucursal C" }, null));
    await assert.rejects(() => authorizeLocalBrandUpload(`local-brand/${nolicense.location.id}/logo.png`));
    as(a.owner);
    const grant = await authorizeLocalBrandUpload(`local-brand/${a.location.id}/cover.webp`);
    assert.equal(grant.locationId, a.location.id); assert.equal(grant.kind, "cover");
    await assert.rejects(() => authorizeLocalBrandUpload(`local-brand/${a.location.id}/avatar.png`));
    const untouched = await prisma.localLocation.findUniqueOrThrow({ where: { id: b.location.id } });
    assert.equal(untouched.displayName, null); assert.equal(untouched.brandUpdatedAt, null);
  });
  await t.test("Subida en servidor: solo el dueño del local sube; otra empresa recibe FORBIDDEN sin tocar el almacenamiento", async () => {
    const { processBrandUpload } = require("../../lib/local/brand-upload");
    let puts = 0;
    const deps = { authorize: authorizeLocalBrandUpload, env: { BLOB_READ_WRITE_TOKEN: FAKE_RW_TOKEN },
      put: async (pathname: string) => { puts++; return { url: blob(pathname.replace(".png", "-Abc.png")) }; } };
    as(a.owner);
    const ok = await processBrandUpload({ locationId: a.location.id, kind: "logo", file: fileOf(PNG, "image/png") }, deps);
    assert.ok(ok.url.includes(`/local-brand/${a.location.id}/logo-Abc.png`)); assert.equal(puts, 1);
    as(b.owner);
    await assert.rejects(() => processBrandUpload({ locationId: a.location.id, kind: "logo", file: fileOf(PNG, "image/png") }, deps), (e: { code?: string }) => e.code === "FORBIDDEN");
    as(a.collaborator);
    await assert.rejects(() => processBrandUpload({ locationId: a.location.id, kind: "cover", file: fileOf(PNG, "image/png") }, deps), (e: { code?: string }) => e.code === "FORBIDDEN");
    assert.equal(puts, 1);
  });
  await t.test("Imagen de la carpeta de otro local se rechaza aunque sea Vercel Blob", async () => {
    as(a.owner);
    const current = await prisma.localLocation.findUniqueOrThrow({ where: { id: a.location.id } });
    await assert.rejects(() => saveLocationIdentity(a.location.id, input({ logoUrl: blob(`local-brand/${b.location.id}/logo.png`) }), current.brandUpdatedAt?.toISOString() ?? null));
  });
  await t.test("Campañas y puntos no se modifican al guardar identidad", async () => {
    as(a.owner);
    const campaign = await prisma.localCampaign.create({ data: { companyId: a.company.id, locationId: a.location.id, name: "Campaña Demo", slug: "brand-c-" + suffix, primaryColor: "#123456" } });
    const current = await prisma.localLocation.findUniqueOrThrow({ where: { id: a.location.id } });
    await saveLocationIdentity(a.location.id, input({ primaryColor: "#b91c1c" }), current.brandUpdatedAt?.toISOString() ?? null);
    const after = await prisma.localCampaign.findUniqueOrThrow({ where: { id: campaign.id } });
    assert.equal(after.primaryColor, "#123456"); assert.equal(after.updatedAt.getTime(), campaign.updatedAt.getTime());
  });
  await t.test("M-2: una edición con datos antiguos no sobrescribe en silencio el nombre ni la dirección", async () => {
    as(a.owner);
    const stale = (await prisma.localLocation.findUniqueOrThrow({ where: { id: a.location.id } })).brandUpdatedAt?.toISOString() ?? null;
    const current = await prisma.localLocation.findUniqueOrThrow({ where: { id: a.location.id } });
    const same = { ...base, name: current.name!, displayName: current.displayName ?? "", primaryColor: current.primaryColor ?? "", logoUrl: current.logoUrl ?? "", phone: current.phone ?? "" };
    // Persona A cambia solo el nombre interno (antes no avanzaba la versión).
    const first = await saveLocationIdentity(a.location.id, { ...same, name: "Sucursal Renombrada" }, stale);
    assert.notEqual(first.brandUpdatedAt, stale, "cambiar el nombre avanza la versión");
    // Persona B, con la versión anterior, cambia el color: se rechaza en vez de revertir el nombre.
    await assert.rejects(() => saveLocationIdentity(a.location.id, { ...same, primaryColor: "#1d4ed8" }, stale), /cambió mientras/);
    assert.equal((await prisma.localLocation.findUniqueOrThrow({ where: { id: a.location.id } })).name, "Sucursal Renombrada");
    const unchanged = await saveLocationIdentity(a.location.id, { ...same, name: "Sucursal Renombrada" }, first.brandUpdatedAt);
    assert.equal(unchanged.brandUpdatedAt, first.brandUpdatedAt, "guardar sin cambios no avanza la versión");
  });
  await t.test("B-1: un local inactivo propio se puede editar y subir imágenes sin cambiar su estado", async () => {
    as(a.owner);
    await prisma.localLocation.update({ where: { id: a.location.id }, data: { isActive: false } });
    const current = await prisma.localLocation.findUniqueOrThrow({ where: { id: a.location.id } });
    await saveLocationIdentity(a.location.id, { ...base, name: "Sucursal Inactiva", displayName: "", primaryColor: "", logoUrl: "", phone: "" }, current.brandUpdatedAt?.toISOString() ?? null);
    const after = await prisma.localLocation.findUniqueOrThrow({ where: { id: a.location.id } });
    assert.equal(after.name, "Sucursal Inactiva"); assert.equal(after.isActive, false, "editar no reactiva el local");
    assert.ok(await authorizeLocalBrandUpload(`local-brand/${a.location.id}/logo.png`));
    as(b.owner);
    await assert.rejects(() => authorizeLocalBrandUpload(`local-brand/${a.location.id}/logo.png`), "sigue aislado por empresa");
  });
  await prisma.$disconnect();
});
