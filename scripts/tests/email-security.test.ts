import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { render } from "@react-email/render";
import CompanyCreatedEmail from "../../emails/CompanyCreatedEmail";
import UserInvitationEmail from "../../emails/UserInvitationEmail";
import PasswordResetEmail from "../../emails/PasswordResetEmail";
import CardProductionRequestEmail from "../../emails/CardProductionRequestEmail";

test("Plantillas existentes renderizan y escapan datos sin enviar mensajes", async () => {
  const name = "<script>unsafe</script>";
  const templates = [
    React.createElement(CompanyCreatedEmail, { companyName: name, maxIdentities: 1, adminName: name, loginUrl: "https://example.test/login" }),
    React.createElement(UserInvitationEmail, { name, companyName: name, role: "COLLABORATOR", activationUrl: "https://example.test/activate" }),
    React.createElement(PasswordResetEmail, { name, resetUrl: "https://example.test/reset" }),
    React.createElement(CardProductionRequestEmail, { companyName: name, collaboratorName: name, collaboratorEmail: "qa@example.test", slug: "qa", requestedByName: name, requestedByEmail: "qa@example.test", cardId: "qa", physicalCardId: "qa", createdAt: "2026-09-16", adminUrl: "https://example.test/admin" }),
  ];
  for (const template of templates) {
    const html = await render(template);
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(!html.includes("<script>unsafe</script>"));
  }
});

test("Transporte central conserva configuración, idempotencia y bloqueo de previews", async () => {
  const originalEnv = { ...process.env };
  const sdkPath = require.resolve("resend");
  require("resend");
  const sdkModule = require.cache[sdkPath]!;
  const originalExports = sdkModule.exports;
  const constructed: string[] = [];
  const calls: Array<{ path: string; options: { headers: Record<string, string>; body: string; signal: AbortSignal } }> = [];
  class MockResend {
    constructor(key: string) { constructed.push(key); }
    async fetchRequest(path: string, options: { headers: Record<string, string>; body: string; signal: AbortSignal }) {
      calls.push({ path, options });
      return { data: { id: "qa-delivery" }, error: null };
    }
  }
  sdkModule.exports = { Resend: MockResend };
  try {
    process.env.RESEND_API_KEY = "synthetic-test-only";
    process.env.EMAIL_FROM = "qa@example.test";
    process.env.NEXT_PUBLIC_APP_URL = "https://example.test";
    process.env.LOCAL_REPORT_SUPPORT_EMAIL = "qa@example.test";
    process.env.LOCAL_REPORT_EMAIL_MODE = "live";
    process.env.VERCEL_ENV = "production";
    const { createResendClient } = require("../../lib/email/resend");
    const { sendReportMail } = require("../../lib/local/report-transport");
    const payload = { from: "qa@example.test", to: "qa@example.test", subject: "QA", html: "<p>QA</p>" };
    assert.deepEqual(await sendReportMail(payload, "qa-event"), { id: "qa-delivery" });
    assert.ok(constructed.every(key => key === "synthetic-test-only"));
    assert.equal(calls[0].path, "/emails");
    assert.equal(calls[0].options.headers["Idempotency-Key"], "qa-event");
    assert.equal(calls[0].options.body, JSON.stringify(payload));
    assert.ok(calls[0].options.signal instanceof AbortSignal);
    process.env.VERCEL_ENV = "preview";
    await assert.rejects(() => sendReportMail(payload, "blocked"));
    process.env.VERCEL_ENV = "production";
    process.env.LOCAL_REPORT_EMAIL_MODE = "disabled";
    await assert.rejects(() => sendReportMail(payload, "blocked"));
    delete process.env.RESEND_API_KEY;
    assert.equal(createResendClient(), null);
    process.env.LOCAL_REPORT_EMAIL_MODE = "live";
    await assert.rejects(() => sendReportMail(payload, "blocked"));
    assert.equal(calls.length, 1);
  } finally {
    sdkModule.exports = originalExports;
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  }
});
