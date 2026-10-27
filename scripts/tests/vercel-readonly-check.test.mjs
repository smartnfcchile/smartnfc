// Pruebas del verificador de Vercel. Simulan la API: no hay red, no hay token real.
import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeProject, describeDbUrl, main, sanitizeEnvs } from "../ops/vercel-readonly-check.mjs";

const SECRET_DB = ["postgresql://", "owner:", "S3cr3t-pass@", "ep-prod-123-pooler.us-east-1.aws.neon.tech/neondb"].join("");
const SECRET_PREVIEW_DB = ["postgresql://", "owner:", "Other-pass@", "ep-preview-456.us-east-1.aws.neon.tech/neondb"].join("");
const SECRET_KEY = ["re", "FAKE", "SHOULD", "NEVER", "PRINT"].join("_");
const FAKE_TOKEN = "vercel-token-should-never-print";

function fakeApi({ auto = true, shared = false, previewSameDb = false, overrides = [] } = {}) {
  const calls = [];
  const envs = [
    { id: "e1", key: "DATABASE_URL", type: "encrypted", target: shared ? ["production", "preview"] : ["production"], value: "enc:xxxx" },
    ...(shared ? [] : [{ id: "e2", key: "DATABASE_URL", type: "encrypted", target: ["preview"], value: "enc:yyyy" }]),
    { id: "e3", key: "RESEND_API_KEY", type: "sensitive", target: ["production", "preview"], value: SECRET_KEY },
    { id: "e4", key: "EMAIL_FROM", type: "plain", target: ["production"], value: "no-reply@x" },
    { id: "e5", key: "NEXT_PUBLIC_APP_URL", type: "plain", target: ["production"], value: "https://x" },
    ...overrides.map((key, i) => ({ id: `o${i}`, key, type: "plain", target: ["production"], value: "manual" })),
  ];
  const decrypted = { e1: SECRET_DB, e2: previewSameDb ? SECRET_DB : SECRET_PREVIEW_DB };
  const fetchImpl = async (url, init) => {
    calls.push({ method: init.method, path: url.pathname, auth: init.headers.Authorization });
    const json = (body) => ({ ok: true, status: 200, json: async () => body });
    const p = url.pathname;
    if (/^\/v9\/projects\/[^/]+$/.test(p)) return json({ id: "prj_x", name: decodeURIComponent(p.split("/").pop()), autoExposeSystemEnvs: auto, link: { productionBranch: "main" } });
    if (p.endsWith("/domains")) return json({ domains: [{ name: "www.smartnfc.cl", verified: true }, { name: "smartnfc.cl", verified: true, redirect: "www.smartnfc.cl" }] });
    if (/\/v10\/projects\/[^/]+\/env$/.test(p)) return json({ envs });
    const m = p.match(/\/v1\/projects\/[^/]+\/env\/([^/]+)$/);
    if (m) return json({ value: decrypted[m[1]] });
    if (p === "/v6/deployments") return json({ deployments: [{ readyState: "READY", meta: { githubCommitSha: "da2ceb8aaaa" }, created: 0 }] });
    return { ok: false, status: 404, json: async () => ({}) };
  };
  return { fetchImpl, calls };
}

async function capture(fn) {
  const out = [];
  const orig = { log: console.log, error: console.error };
  console.log = (...a) => out.push(a.join(" "));
  console.error = (...a) => out.push(a.join(" "));
  try { return { result: await fn(), text: out.join("\n") }; } finally { Object.assign(console, orig); }
}

test("solo usa GET, envía el token únicamente en la cabecera y nunca imprime secretos", async () => {
  process.argv.push("--compare-db");
  try {
    const api = fakeApi();
    const { text } = await capture(() => main({ env: { VERCEL_TOKEN: FAKE_TOKEN }, fetchImpl: api.fetchImpl }));
    assert.ok(api.calls.length > 0);
    assert.ok(api.calls.every((c) => c.method === "GET"), "solo GET");
    assert.ok(api.calls.every((c) => c.auth === `Bearer ${FAKE_TOKEN}`));
    for (const secret of [FAKE_TOKEN, SECRET_KEY, "S3cr3t-pass", "Other-pass", "ep-prod-123", "ep-preview-456", "enc:xxxx", "owner:"]) {
      assert.ok(!text.includes(secret), `no debe imprimir: ${secret}`);
    }
    assert.match(text, /bases DISTINTAS \(Production: neon, Preview: neon\)/);
  } finally {
    process.argv.pop();
  }
});

test("sin token, se niega a ejecutar", async () => {
  await assert.rejects(() => main({ env: {}, fetchImpl: async () => { throw new Error("no debe llamar"); } }), /Falta VERCEL_TOKEN/);
});

test("sanitizeEnvs descarta siempre el valor", () => {
  const s = sanitizeEnvs({ envs: [{ id: "a", key: "K", type: "plain", target: "production", value: "secreto" }] });
  assert.deepEqual(s, [{ id: "a", key: "K", type: "plain", target: ["production"], gitBranch: null, customEnvironmentIds: [] }]);
});

const base = (envs, ...autoArg) => {
  const project = { name: "p", id: "prj", link: { productionBranch: "main" } };
  if (autoArg.length === 0) project.autoExposeSystemEnvs = true;
  else if (autoArg[0] !== "omit") project.autoExposeSystemEnvs = autoArg[0];
  return analyzeProject({ project, domains: { domains: [] }, envs: sanitizeEnvs({ envs }), latestProduction: null });
};
const prodEmail = ["RESEND_API_KEY", "EMAIL_FROM", "NEXT_PUBLIC_APP_URL"].map((key, i) => ({ id: `m${i}`, key, type: "plain", target: ["production"], value: "v" }));

test("veredicto del PR #20 según la configuración", () => {
  assert.match(base(prodEmail).pr20, /^OK/);
  assert.match(base(prodEmail, false).pr20, /^BLOQUEANTE/);
  assert.match(base(prodEmail, "omit").pr20, /^BLOQUEANTE/, "campo ausente en la API");
  assert.match(base(prodEmail, "omit").systemVars, /^INDETERMINADO/);
  assert.match(base([...prodEmail, { id: "x", key: "VERCEL_ENV", type: "plain", target: ["production"], value: "v" }]).pr20, /^REVISAR.*VERCEL_ENV/);
  assert.match(base([...prodEmail, { id: "y", key: "EMAIL_MODE", type: "plain", target: ["production"], value: "v" }]).pr20, /^REVISAR.*EMAIL_MODE/);
  assert.match(base(prodEmail.slice(1)).pr20, /^ATENCIÓN.*RESEND_API_KEY/);
});

test("detecta DATABASE_URL compartida entre Production y Preview", () => {
  const shared = base([{ id: "d", key: "DATABASE_URL", type: "encrypted", target: ["production", "preview"], value: "v" }]);
  assert.match(shared.db[0].verdict, /^COMPARTIDA/);
  const separate = base([{ id: "d1", key: "DATABASE_URL", type: "encrypted", target: ["production"], value: "v" }, { id: "d2", key: "DATABASE_URL", type: "encrypted", target: ["preview"], value: "v" }]);
  assert.match(separate.db[0].verdict, /^entradas separadas/);
});

test("--compare-db detecta la misma base aunque una use el endpoint pooler", async () => {
  process.argv.push("--compare-db");
  try {
    const api = fakeApi({ previewSameDb: true });
    const { text } = await capture(() => main({ env: { VERCEL_TOKEN: FAKE_TOKEN }, fetchImpl: api.fetchImpl }));
    assert.match(text, /MISMA BASE en Production y Preview \(neon\)/);
    assert.ok(!text.includes("ep-prod-123"));
  } finally {
    process.argv.pop();
  }
});

test("describeDbUrl clasifica sin exponer credenciales", () => {
  const d = describeDbUrl(SECRET_DB);
  assert.equal(d.provider, "neon");
  assert.ok(!JSON.stringify(d).includes("S3cr3t"));
});
