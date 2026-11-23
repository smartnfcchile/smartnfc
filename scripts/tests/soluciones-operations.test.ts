import "./helpers/test-database";
import assert from "node:assert/strict";
import test from "node:test";
import { campaignDestination } from "../../lib/soluciones/destination";
import { validateTemplate } from "../../lib/soluciones/core";

test("el destino admite HTTPS y conserva parámetros sin aceptar credenciales", () => {
  assert.equal(campaignDestination("https://example.com/demo?source=nfc"), "https://example.com/demo?source=nfc");
  for (const url of ["http://example.com", "//example.com/", "javascript:alert(1)", "https://user:pass@example.com"]) {
    assert.throws(() => campaignDestination(url));
  }
});

test("las plantillas rechazan claves reservadas, tipos inválidos y banderas no booleanas", () => {
  const template = { code: "demo", name: "Demo", mode: "ASSETS" as const };
  for (const fields of [null, [{key:"codigo", label:"Código", kind:"text"}],
    [{key:"demo", label:"Demo", kind:"script"}],
    [{key:"demo", label:"Demo", kind:"text", public:"true"}]]) {
    assert.ok(validateTemplate({ ...template, fields: fields as never }).length);
  }
});
