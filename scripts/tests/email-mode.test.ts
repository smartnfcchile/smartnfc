import "./helpers/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { resolveEmailMode } from "../../lib/email/email-mode";

// Ninguna prueba de este archivo envía correos: el SDK de Resend se reemplaza por un doble que
// solo registra llamadas, la clave es sintética y el destinatario usa el dominio reservado .test.

test("Modo de correo: producción envía; desarrollo, pruebas, CI y previews no", () => {
  const cases: Array<[Record<string, string | undefined>, "live" | "disabled"]> = [
    [{ NODE_ENV: "production", VERCEL_ENV: "production" }, "live"],
    [{ NODE_ENV: "production" }, "live"],
    [{ NODE_ENV: "production", VERCEL_ENV: "preview" }, "disabled"],
    [{ NODE_ENV: "production", VERCEL_ENV: "development" }, "disabled"],
    [{ NODE_ENV: "production", VERCEL_ENV: "preview", EMAIL_MODE: "live" }, "disabled"],
    [{ NODE_ENV: "production", GITHUB_ACTIONS: "true" }, "disabled"],
    [{ NODE_ENV: "production", GITHUB_ACTIONS: "true", EMAIL_MODE: "live" }, "disabled"],
    [{ NODE_ENV: "production", VERCEL_ENV: "production", EMAIL_MODE: "disabled" }, "disabled"],
    [{ NODE_ENV: "production", EMAIL_MODE: "sink" }, "disabled"],
    [{ NODE_ENV: "development" }, "disabled"],
    [{ NODE_ENV: "test" }, "disabled"],
    [{}, "disabled"],
    [{ NODE_ENV: "development", EMAIL_MODE: "live" }, "live"],
    [{ NODE_ENV: "production", EMAIL_MODE: " live " }, "live"],
  ];
  for (const [env, expected] of cases) {
    assert.equal(resolveEmailMode(env).mode, expected, JSON.stringify(env));
  }
});

test("Modo de correo: variables ausentes o con valores inesperados nunca habilitan el envío", () => {
  const unexpected: Array<Record<string, string | undefined>> = [
    { NODE_ENV: "" },
    { NODE_ENV: "Production" },
    { NODE_ENV: "PRODUCTION" },
    { NODE_ENV: "production " },
    { NODE_ENV: "production", VERCEL_ENV: "" },
    { NODE_ENV: "production", VERCEL_ENV: "Production" },
    { NODE_ENV: "production", VERCEL_ENV: "staging" },
    { NODE_ENV: "production", GITHUB_ACTIONS: "TRUE" },
    { NODE_ENV: "production", GITHUB_ACTIONS: "1" },
    { NODE_ENV: "production", EMAIL_MODE: "" },
    { NODE_ENV: "production", EMAIL_MODE: "   " },
    { NODE_ENV: "production", EMAIL_MODE: "LIVE" },
    { NODE_ENV: "production", EMAIL_MODE: "true" },
    { NODE_ENV: "production", EMAIL_MODE: "off" },
    { NODE_ENV: "development", EMAIL_MODE: "Live" },
  ];
  for (const env of unexpected) {
    assert.equal(resolveEmailMode(env).mode, "disabled", JSON.stringify(env));
  }
  // GITHUB_ACTIONS="false" (explícito) no bloquea por sí solo.
  assert.equal(resolveEmailMode({ NODE_ENV: "production", GITHUB_ACTIONS: "false" }).mode, "live");
});

test("Modo de correo: la matriz base se mantiene", () => {
  const cases: Array<[Record<string, string | undefined>, "live" | "disabled"]> = [
    [{ NODE_ENV: "production", VERCEL_ENV: "production" }, "live"],
    [{}, "disabled"],
  ];
  for (const [env, expected] of cases) {
    assert.equal(resolveEmailMode(env).mode, expected, JSON.stringify(env));
  }
});

test("sendEmail no llama al proveedor cuando el modo está bloqueado y sí en producción", async () => {
  const originalEnv = { ...process.env };
  const sdkPath = require.resolve("resend");
  require("resend");
  const sdkModule = require.cache[sdkPath]!;
  const originalExports = sdkModule.exports;
  const sent: Array<{ to: string; subject: string }> = [];
  class MockResend {
    emails = {
      send: async (payload: { to: string; subject: string }) => {
        sent.push({ to: payload.to, subject: payload.subject });
        return { data: { id: "qa-mock" }, error: null };
      },
    };
  }
  sdkModule.exports = { Resend: MockResend };

  const modulePaths = ["../../lib/email/resend", "../../lib/email/send-email"].map((p) => require.resolve(p));
  const loadSendEmail = () => {
    for (const p of modulePaths) delete require.cache[p];
    return require("../../lib/email/send-email").sendEmail as (args: { to: string; subject: string; react: React.ReactElement }) => Promise<{ success: boolean; skipped?: boolean }>;
  };
  const message = { to: "qa@example.test", subject: "QA", react: React.createElement("p", null, "QA") };
  const setEnv = (values: Record<string, string | undefined>) => {
    for (const key of ["NODE_ENV", "VERCEL_ENV", "GITHUB_ACTIONS", "EMAIL_MODE"]) delete process.env[key];
    Object.assign(process.env, values);
  };

  try {
    process.env.RESEND_API_KEY = "synthetic-test-only";
    process.env.EMAIL_FROM = "qa@example.test";
    process.env.NEXT_PUBLIC_APP_URL = "https://example.test";

    for (const blocked of [
      { NODE_ENV: "test" },
      { NODE_ENV: "development" },
      { NODE_ENV: "production", VERCEL_ENV: "preview" },
      { NODE_ENV: "production", GITHUB_ACTIONS: "true" },
      { NODE_ENV: "production", EMAIL_MODE: "disabled" },
    ]) {
      setEnv(blocked);
      const result = await loadSendEmail()(message);
      assert.equal(result.success, false, JSON.stringify(blocked));
      assert.equal(result.skipped, true, JSON.stringify(blocked));
    }
    assert.equal(sent.length, 0, "ningún modo bloqueado debe llegar al proveedor");

    setEnv({ NODE_ENV: "production", VERCEL_ENV: "production" });
    const live = await loadSendEmail()(message);
    assert.equal(live.success, true);
    assert.deepEqual(sent, [{ to: "qa@example.test", subject: "QA" }]);
  } finally {
    sdkModule.exports = originalExports;
    for (const p of modulePaths) delete require.cache[p];
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  }
});
