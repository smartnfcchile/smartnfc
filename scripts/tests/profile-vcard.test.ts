import "./helpers/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildProfileVcard, profileVcardResponse } from "../../lib/card-profile/vcard";

const card = { name: "Ana", profileName: "María Ñandú", companyName: null, role: null, phone: "+56 9 1234 5678", email: "ana@example.test" };

test("perfil: UTF-8, campos requeridos, CRLF y teléfono normalizado", () => {
  const vcf = buildProfileVcard(card);
  assert.ok(vcf.includes("FN:María Ñandú\r\n"));
  assert.ok(vcf.includes("N:;María Ñandú;;;\r\n"));
  assert.ok(vcf.includes("TEL;TYPE=CELL,VOICE:+56912345678\r\n"));
  assert.ok(vcf.endsWith("END:VCARD\r\n"));
  assert.equal(vcf.replaceAll("\r\n", "").includes("\n"), false);
  assert.equal(vcf.includes("ORG:"), false);
});

test("perfil: escape e inyección neutralizada, líneas UTF-8 de máximo 75 bytes", () => {
  const vcf = buildProfileVcard({ ...card, profileName: "Ñ".repeat(120) + ",;\\\nEND:VCARD", companyName: "Empresa; Sur" });
  assert.equal(vcf.split("\r\n").filter(line => line === "END:VCARD").length, 1);
  assert.ok(vcf.includes("ORG:Empresa\\; Sur"));
  for (const line of vcf.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75);
  assert.equal(vcf.includes("\uFFFD"), false);
});

test("respuesta: archivo seguro, MIME y sin caché; nombre vacío tiene alternativa", async () => {
  const response = profileVcardResponse({ ...card, profileName: "../../María\r\nX-Test: bad" });
  assert.equal(response.headers.get("content-type"), "text/vcard; charset=utf-8");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(response.headers.get("content-disposition")!, /^attachment; filename="[a-z0-9-]+\.vcf"$/);
  assert.ok((await response.text()).startsWith("BEGIN:VCARD\r\n"));
  assert.ok(buildProfileVcard({ ...card, profileName: "", name: "" }).includes("FN:Contacto\r\n"));
});
