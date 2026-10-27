#!/usr/bin/env node
// Verificación de SOLO LECTURA de los proyectos de Vercel de SmartNFC (antes de fusionar el PR #20).
//
// Qué responde, por proyecto:
//   1. Si Vercel inyecta las variables de sistema (VERCEL, VERCEL_ENV, VERCEL_REGION) en sus despliegues
//      (campo autoExposeSystemEnvs del proyecto) y si alguna variable manual las contradice.
//   2. Si, con eso, el modo de correo del PR #20 permitirá envíos legítimos en producción.
//   3. Qué dominios atiende el proyecto y desde qué rama despliega producción.
//   4. Si Production y Preview comparten la definición de DATABASE_URL / DIRECT_URL.
//
// Garantías:
//   - Solo hace solicitudes GET a api.vercel.com. No existe código para POST/PATCH/DELETE.
//   - Nunca imprime ni guarda valores de variables, tokens ni cadenas de conexión. El campo "value"
//     se descarta al recibirlo.
//   - Con --compare-db (opcional) descifra DATABASE_URL/DIRECT_URL EN MEMORIA solo para comparar si
//     Production y Preview apuntan al mismo host y base. Imprime únicamente "igual"/"distinta" y el tipo de
//     proveedor (neon/otro). Sin esa opción no se descifra nada.
//   - No toca despliegues, dominios, variables ni datos de clientes. No envía correos.
//
// Uso (en tu computador, Node 18+):
//   PowerShell:  $env:VERCEL_TOKEN="<token temporal>"; node scripts/ops/vercel-readonly-check.mjs
//   bash:        VERCEL_TOKEN=<token temporal> node scripts/ops/vercel-readonly-check.mjs [--compare-db]
// El token se lee solo desde la variable de entorno VERCEL_TOKEN y nunca se imprime.

const API = "https://api.vercel.com";
const TEAM_SLUG = process.env.VERCEL_TEAM_SLUG || "smartnfcchiles-projects";
const PROJECTS = (process.env.VERCEL_PROJECTS || "smartnfc,smartnfc-8ndu").split(",").map((s) => s.trim()).filter(Boolean);

// Variables que, definidas a mano, podrían contradecir o anular la regla del PR #20.
const OVERRIDE_KEYS = ["VERCEL", "VERCEL_ENV", "VERCEL_TARGET_ENV", "VERCEL_REGION", "NODE_ENV", "CI", "GITHUB_ACTIONS", "EMAIL_MODE"];
// Variables que sendEmail() necesita en producción.
const EMAIL_KEYS = ["RESEND_API_KEY", "EMAIL_FROM", "NEXT_PUBLIC_APP_URL"];
const DB_KEYS = ["DATABASE_URL", "DIRECT_URL"];
const WATCH_PREVIEW_KEYS = ["RESEND_API_KEY", "BLOB_READ_WRITE_TOKEN", "CRON_SECRET"];

export function parseArgsToken(env = process.env) {
  const token = (env.VERCEL_TOKEN || "").trim();
  if (!token) throw new Error("Falta VERCEL_TOKEN (créalo en vercel.com/account/tokens con vencimiento de 1 día).");
  return token;
}

export function makeClient(token, fetchImpl = globalThis.fetch, base = API) {
  return async function get(path, query = {}) {
    const url = new URL(path, base);
    url.searchParams.set("slug", TEAM_SLUG);
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
    const res = await fetchImpl(url, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const err = new Error(`GET ${url.pathname} → HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  };
}

/** Descarta valores: deja solo metadatos no sensibles de cada variable. */
export function sanitizeEnvs(raw) {
  const list = Array.isArray(raw?.envs) ? raw.envs : [];
  return list.map((e) => ({
    id: e.id,
    key: e.key,
    type: e.type,
    target: Array.isArray(e.target) ? e.target : e.target ? [e.target] : [],
    gitBranch: e.gitBranch || null,
    customEnvironmentIds: e.customEnvironmentIds || [],
  }));
}

const appliesTo = (env, target) => env.target.includes(target);

/** Clasifica un host de base de datos sin exponerlo. */
export function describeDbUrl(raw) {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase().replace(/-pooler(?=\.)/, "");
    const provider = host.endsWith(".neon.tech") ? "neon" : ["localhost", "127.0.0.1", "::1"].includes(host) ? "local" : "otro";
    return { key: `${host}/${decodeURIComponent(u.pathname.slice(1))}`, provider };
  } catch {
    return { key: null, provider: "no-parseable" };
  }
}

export function analyzeProject({ project, domains, envs, latestProduction }) {
  const findings = [];
  const auto = project?.autoExposeSystemEnvs;

  const overrides = envs.filter((e) => OVERRIDE_KEYS.includes(e.key)).map((e) => `${e.key} [${e.target.join("+") || "sin entorno"}]`);
  const prodOverrides = envs.filter((e) => OVERRIDE_KEYS.includes(e.key) && appliesTo(e, "production"));

  const emailMissing = EMAIL_KEYS.filter((k) => !envs.some((e) => e.key === k && appliesTo(e, "production")));

  let systemVars;
  if (auto === true) systemVars = "SÍ: Vercel inyecta VERCEL, VERCEL_ENV y VERCEL_REGION (autoExposeSystemEnvs=true)";
  else if (auto === false) systemVars = "NO: autoExposeSystemEnvs=false. El PR #20 bloquearía todo el correo de producción";
  else systemVars = "INDETERMINADO: la API no devolvió autoExposeSystemEnvs";

  let pr20;
  if (auto === true && prodOverrides.length === 0 && emailMissing.length === 0) {
    pr20 = "OK: la configuración permite envíos legítimos en producción";
  } else if (auto === true && prodOverrides.length === 0) {
    pr20 = `ATENCIÓN: variables de sistema OK, pero faltan en Production: ${emailMissing.join(", ")} (hoy tampoco enviaría)`;
  } else if (auto === true) {
    pr20 = `REVISAR: hay variables manuales en Production que pueden contradecir la regla: ${prodOverrides.map((e) => e.key).join(", ")}`;
  } else {
    pr20 = "BLOQUEANTE: no fusionar el PR #20 en este estado";
  }

  const domainRows = (domains?.domains || []).map((d) => ({
    name: d.name,
    verified: d.verified,
    redirect: d.redirect || null,
    gitBranch: d.gitBranch || null,
  }));

  const dbDefs = DB_KEYS.map((key) => {
    const defs = envs.filter((e) => e.key === key);
    const prod = defs.filter((e) => appliesTo(e, "production"));
    const prev = defs.filter((e) => appliesTo(e, "preview"));
    const sharedRecord = prod.some((p) => prev.some((q) => q.id === p.id));
    let verdict;
    if (defs.length === 0) verdict = "no definida en el proyecto";
    else if (prev.length === 0) verdict = "Preview no la define (los previews no tendrían base, o la toman de otra fuente)";
    else if (sharedRecord) verdict = "COMPARTIDA: la misma entrada aplica a Production y Preview → previews usan la base de producción";
    else verdict = "entradas separadas (usa --compare-db para confirmar si apuntan a bases distintas)";
    return { key, verdict, prodIds: prod.map((e) => e.id), prevIds: prev.filter((e) => !e.gitBranch).map((e) => e.id), branchScoped: prev.filter((e) => e.gitBranch).length };
  });

  const previewSensitive = WATCH_PREVIEW_KEYS.filter((k) => envs.some((e) => e.key === k && appliesTo(e, "preview")));

  return {
    name: project?.name,
    id: project?.id,
    productionBranch: project?.link?.productionBranch ?? null,
    latestProduction,
    systemVars,
    overrides,
    pr20,
    emailMissing,
    domains: domainRows,
    db: dbDefs,
    previewSensitive,
    findings,
  };
}

async function compareDb(get, projectName, dbRow) {
  if (dbRow.prodIds.length !== 1 || dbRow.prevIds.length !== 1 || dbRow.prodIds[0] === dbRow.prevIds[0]) return null;
  const read = async (id) => {
    try {
      const r = await get(`/v1/projects/${encodeURIComponent(projectName)}/env/${encodeURIComponent(id)}`);
      return describeDbUrl(r?.value ?? "");
    } catch (e) {
      return { key: null, provider: e.status === 403 ? "no-descifrable (sensitive)" : "error" };
    } finally {
      // El objeto con el valor descifrado sale de alcance aquí; no se guarda ni se imprime.
    }
  };
  const [p, q] = [await read(dbRow.prodIds[0]), await read(dbRow.prevIds[0])];
  if (!p.key || !q.key) return `no comparable (Production: ${p.provider}, Preview: ${q.provider})`;
  return p.key === q.key
    ? `MISMA BASE en Production y Preview (${p.provider}) → previews conectados a producción`
    : `bases DISTINTAS (Production: ${p.provider}, Preview: ${q.provider})`;
}

async function latestProductionDeployment(get, projectId) {
  try {
    const r = await get("/v6/deployments", { projectId, target: "production", limit: 1 });
    const d = r?.deployments?.[0];
    if (!d) return null;
    return { state: d.readyState || d.state, sha: (d.meta?.githubCommitSha || "").slice(0, 7), createdAt: new Date(d.created || d.createdAt).toISOString() };
  } catch {
    return null;
  }
}

function print(r) {
  const line = (k, v) => console.log(`  ${k.padEnd(34)} ${v}`);
  console.log(`\n=== Proyecto: ${r.name} (${r.id}) ===`);
  line("Rama de producción", r.productionBranch ?? "desconocida");
  line("Último despliegue de producción", r.latestProduction ? `${r.latestProduction.state} · ${r.latestProduction.sha} · ${r.latestProduction.createdAt}` : "no disponible");
  line("1. Variables de sistema", r.systemVars);
  line("   Variables manuales que interfieren", r.overrides.length ? r.overrides.join(", ") : "ninguna");
  line("2. PR #20 en producción", r.pr20);
  line("3. Dominios", r.domains.length ? "" : "ninguno");
  for (const d of r.domains) console.log(`     - ${d.name}${d.redirect ? ` → redirige a ${d.redirect}` : ""}${d.verified === false ? " (NO verificado)" : ""}${d.gitBranch ? ` (rama ${d.gitBranch})` : ""}`);
  line("4. Base de datos de previews", "");
  for (const d of r.db) console.log(`     - ${d.key}: ${d.verdict}${d.branchScoped ? ` · ${d.branchScoped} entrada(s) por rama` : ""}${d.compare ? `\n       comparación: ${d.compare}` : ""}`);
  line("Claves sensibles también en Preview", r.previewSensitive.length ? r.previewSensitive.join(", ") : "ninguna");
}

export async function main({ env = process.env, fetchImpl = globalThis.fetch, base = API, log = console, argv = process.argv } = {}) {
  const COMPARE_DB = argv.includes("--compare-db");
  const token = parseArgsToken(env);
  const get = makeClient(token, fetchImpl, base);
  console.log(`Verificación de solo lectura · equipo ${TEAM_SLUG} · ${new Date().toISOString()}${COMPARE_DB ? " · con --compare-db" : ""}`);
  const results = [];
  for (const name of PROJECTS) {
    try {
      const project = await get(`/v9/projects/${encodeURIComponent(name)}`);
      const domains = await get(`/v9/projects/${encodeURIComponent(name)}/domains`).catch(() => ({ domains: [] }));
      const envs = sanitizeEnvs(await get(`/v10/projects/${encodeURIComponent(name)}/env`));
      const latestProduction = await latestProductionDeployment(get, project.id);
      const r = analyzeProject({ project, domains, envs, latestProduction });
      if (COMPARE_DB) for (const d of r.db) d.compare = await compareDb(get, name, d);
      print(r);
      results.push(r);
    } catch (e) {
      log.error(`\n=== Proyecto: ${name} === ERROR: ${e.message}${e.status === 403 ? " (el token no tiene acceso a este equipo/proyecto)" : ""}`);
    }
  }
  console.log("\nNada fue modificado. Elimina el token en vercel.com/account/tokens al terminar.");
  return results;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("vercel-readonly-check.mjs")) {
  main().catch((e) => {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  });
}
