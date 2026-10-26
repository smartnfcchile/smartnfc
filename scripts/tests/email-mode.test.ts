import "./helpers/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { looksLikeBlockedProduction, resolveEmailMode } from "../../lib/email/email-mode";

// Ninguna prueba de este archivo envía correos: el SDK de Resend se reemplaza por un doble que
// solo registra llamadas, la clave es sintética y el destinatario usa el dominio reservado .test.

// Entorno de una función real en producción de Vercel.
const PROD: Record<string, string> = { NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "production", VERCEL_TARGET_ENV: "production", VERCEL_REGION: "gru1" };
const without = (key: string) => { const e: Record<string, string | undefined> = { ...PROD }; delete e[key]; return e; };

test("Modo de correo: solo la producción de Vercel confirmada envía", () => {
  assert.equal(resolveEmailMode(PROD).mode, "live");
  assert.equal(resolveEmailMode(without("VERCEL_TARGET_ENV")).mode, "live", "VERCEL_TARGET_ENV es opcional");
  assert.equal(resolveEmailMode({ ...PROD, EMAIL_MODE: "live" }).mode, "live");
  assert.equal(resolveEmailMode({ ...PROD, EMAIL_MODE: " live " }).mode, "live");
  assert.equal(resolveEmailMode({ ...PROD, GITHUB_ACTIONS: "false", CI: "0" }).mode, "live");
});

test("Modo de correo: cada señal obligatoria ausente bloquea (incluye NODE_ENV=production sin VERCEL_ENV)", () => {
  for (const key of ["NODE_ENV", "VERCEL", "VERCEL_ENV", "VERCEL_REGION"]) {
    assert.equal(resolveEmailMode(without(key)).mode, "disabled", `sin ${key}`);
  }
  // Caso residual del informe del 21-oct: `next start` local con un .env real.
  assert.equal(resolveEmailMode({ NODE_ENV: "production" }).mode, "disabled");
  assert.equal(resolveEmailMode({ NODE_ENV: "production", RESEND_API_KEY: "x", EMAIL_FROM: "x", NEXT_PUBLIC_APP_URL: "https://www.smartnfc.cl" }).mode, "disabled");
  // .env pulled desde Vercel Production (`vercel env pull --environment=production`) + `next start` local: sin región.
  assert.equal(resolveEmailMode({ NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "production", VERCEL_TARGET_ENV: "production" }).mode, "disabled");
  for (const env of [{}, { NODE_ENV: "development" }, { NODE_ENV: "test" }]) {
    assert.equal(resolveEmailMode(env).mode, "disabled", JSON.stringify(env));
  }
});

test("Modo de correo: EMAIL_MODE=live ya no habilita envíos fuera de producción de Vercel", () => {
  for (const env of [
    { NODE_ENV: "development", EMAIL_MODE: "live" },
    { NODE_ENV: "production", EMAIL_MODE: "live" },
    { ...PROD, VERCEL_ENV: "preview", EMAIL_MODE: "live" },
    { ...PROD, GITHUB_ACTIONS: "true", EMAIL_MODE: "live" },
    { ...without("VERCEL_REGION"), EMAIL_MODE: "live" },
  ]) {
    assert.equal(resolveEmailMode(env).mode, "disabled", JSON.stringify(env));
  }
});

test("Modo de correo: valores inesperados bloquean", () => {
  const cases: Array<Record<string, string | undefined>> = [
    { ...PROD, NODE_ENV: "" }, { ...PROD, NODE_ENV: "Production" }, { ...PROD, NODE_ENV: "production " },
    { ...PROD, VERCEL: "" }, { ...PROD, VERCEL: "true" }, { ...PROD, VERCEL: "0" },
    { ...PROD, VERCEL_ENV: "" }, { ...PROD, VERCEL_ENV: "Production" }, { ...PROD, VERCEL_ENV: "staging" },
    { ...PROD, VERCEL_REGION: "" }, { ...PROD, VERCEL_REGION: "   " },
    { ...PROD, EMAIL_MODE: "" }, { ...PROD, EMAIL_MODE: "   " }, { ...PROD, EMAIL_MODE: "LIVE" },
    { ...PROD, EMAIL_MODE: "true" }, { ...PROD, EMAIL_MODE: "off" }, { ...PROD, EMAIL_MODE: "sink" },
    { ...PROD, GITHUB_ACTIONS: "true" }, { ...PROD, GITHUB_ACTIONS: "TRUE" }, { ...PROD, GITHUB_ACTIONS: "1" },
    { ...PROD, CI: "1" }, { ...PROD, CI: "true" },
  ];
  for (const env of cases) assert.equal(resolveEmailMode(env).mode, "disabled", JSON.stringify(env));
});

test("Modo de correo: señales contradictorias bloquean", () => {
  const cases: Array<Record<string, string | undefined>> = [
    { ...PROD, VERCEL_ENV: "preview" },                       // preview con todo lo demás de producción
    { ...PROD, VERCEL_ENV: "development" },
    { ...PROD, VERCEL_TARGET_ENV: "preview" },                // VERCEL_ENV y VERCEL_TARGET_ENV no coinciden
    { ...PROD, VERCEL_TARGET_ENV: "staging" },                // entorno personalizado
    { ...PROD, VERCEL_REGION: "dev1" },                       // vercel dev
    { ...PROD, NODE_ENV: "development" },                     // vercel dev con variables de producción
    { ...without("VERCEL"), VERCEL_ENV: "production" },       // VERCEL_ENV sin VERCEL=1: copiado a mano
    { ...PROD, EMAIL_MODE: "disabled" },                      // interruptor de emergencia
  ];
  for (const env of cases) assert.equal(resolveEmailMode(env).mode, "disabled", JSON.stringify(env));
  // El interruptor de emergencia se identifica como tal en el registro.
  assert.equal(resolveEmailMode({ ...PROD, EMAIL_MODE: "disabled" }).reason, "EMAIL_MODE=disabled");
});

test("Modo de correo: alerta visible solo cuando se bloquea algo que parece producción", () => {
  assert.equal(looksLikeBlockedProduction(PROD), false, "producción que envía no alerta");
  assert.equal(looksLikeBlockedProduction(without("VERCEL_REGION")), true);
  assert.equal(looksLikeBlockedProduction({ ...PROD, VERCEL_TARGET_ENV: "preview" }), true);
  assert.equal(looksLikeBlockedProduction({ ...PROD, EMAIL_MODE: "disabled" }), false, "el interruptor deliberado no alerta");
  assert.equal(looksLikeBlockedProduction({ NODE_ENV: "development" }), false);
  assert.equal(looksLikeBlockedProduction({ NODE_ENV: "production" }), false, "next start local sin Vercel no alerta");
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
    for (const key of ["NODE_ENV", "VERCEL", "VERCEL_ENV", "VERCEL_TARGET_ENV", "VERCEL_REGION", "GITHUB_ACTIONS", "CI", "EMAIL_MODE"]) delete process.env[key];
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
      { NODE_ENV: "production" },
      { NODE_ENV: "production", VERCEL_ENV: "production" },
      { ...without("VERCEL_REGION") },
      { ...PROD, EMAIL_MODE: "disabled" },
      { NODE_ENV: "development", EMAIL_MODE: "live" },
    ]) {
      setEnv(blocked);
      const result = await loadSendEmail()(message);
      assert.equal(result.success, false, JSON.stringify(blocked));
      assert.equal(result.skipped, true, JSON.stringify(blocked));
    }
    assert.equal(sent.length, 0, "ningún modo bloqueado debe llegar al proveedor");

    setEnv(PROD);
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
