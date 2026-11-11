import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { encode } from "next-auth/jwt";
import { NextRequest } from "next/server";
import {
  PANEL_CONTEXT_HEADER, PANEL_SESSION_CHANGED, PANEL_SESSION_HEADER, panelSessionContext,
} from "../../lib/panel-session";
import { proxy } from "../../proxy";
import { panelBootstrap, PANEL_TAB_BLOCKED, PANEL_TAB_KEY } from "../../lib/panel-tab";

const secret = "test-only-panel-session-secret";
process.env.NEXTAUTH_SECRET = secret;
process.env.NEXTAUTH_URL = "http://localhost:3000";

const mario = { id: "mario", companyId: "tenant-a", role: "COMPANY_OWNER", loginId: "login-a" };
const agustin = { id: "agustin", companyId: "tenant-b", role: "COMPANY_ADMIN", loginId: "login-b" };
const contextA = panelSessionContext(mario, secret)!;
const contextB = panelSessionContext(agustin, secret)!;

async function request(path: string, token = agustin, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cookie", `next-auth.session-token=${await encode({ token, secret })}`);
  return new NextRequest(new URL(path, process.env.NEXTAUTH_URL), {
    method: init.method,
    body: init.body,
    headers,
  });
}

test("session context is stable across cookie refresh and changes across sign-ins or tenants", () => {
  assert.equal(panelSessionContext({ ...mario, jti: "rotated", exp: 100 }, secret), contextA);
  assert.notEqual(panelSessionContext({ ...mario, loginId: "later" }, secret), contextA);
  assert.notEqual(panelSessionContext({ ...mario, companyId: "other" }, secret), contextA);
  assert.notEqual(panelSessionContext({ ...mario, role: "COLLABORATOR" }, secret), contextA);
  assert.ok(panelSessionContext({ id: mario.id, companyId: mario.companyId }, secret));
});

test("full document requests require a tab check before rendering and ignore injected internal headers", async () => {
  const initial = await proxy(await request("/dashboard", agustin));
  assert.match(initial.headers.get("cache-control") ?? "", /no-store/);
  assert.match(await initial.text(), /sessionStorage/);
  assert.equal(initial.headers.get(`x-middleware-request-${PANEL_CONTEXT_HEADER}`), null);

  const response = await proxy(await request(`/dashboard?_panel=${contextB}`, agustin, {
    headers: { [PANEL_CONTEXT_HEADER]: contextA },
  }));
  assert.equal(response.headers.get(`x-middleware-request-${PANEL_CONTEXT_HEADER}`), contextB);
});

test("full refresh with a stale tab binding goes to sign-in for both panels", async () => {
  for (const path of ["/superadmin", "/dashboard/cards"]) {
    const response = await proxy(await request(`${path}?_panel=${contextA}`));
    assert.equal(response.status, 307);
    assert.equal(new URL(response.headers.get("location")!).pathname, "/login");
    assert.equal(new URL(response.headers.get("location")!).searchParams.get("error"), "sessionChanged");
  }
});

test("the document bootstrap never replaces an existing tab binding with a different cookie", () => {
  const attempt = "2178bc46-67ea-408f-87fc-3670e3d5a6ca";
  const html = panelBootstrap(contextB, attempt);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  for (const [stored, allowed] of [
    [contextA, false],
    ["login:wrong-attempt", false],
    [contextB, true],
    ["login:" + attempt, true],
  ] as const) {
    const storage = new Map([[PANEL_TAB_KEY, stored]]);
    const href = "https://smartnfc.test/superadmin?filter=active";
    let destination: string | undefined;
    runInNewContext(script, {
      URL,
      sessionStorage: { getItem: storage.get.bind(storage), setItem: storage.set.bind(storage) },
      location: { href, replace: (value: string | URL) => { destination = String(value); } },
    });
    const target = new URL(destination!, href);
    assert.equal(target.pathname, allowed ? "/superadmin" : "/login");
    assert.equal(target.searchParams.get("_panel"), allowed ? contextB : null);
    if (!allowed) assert.equal(target.pathname + target.search, PANEL_TAB_BLOCKED);
    assert.equal(storage.get(PANEL_TAB_KEY), allowed ? contextB : stored);
  }
});

test("a stale tab cannot navigate, execute actions, fetch private data, or sign out as the new user", async () => {
  for (const [path, method] of [
    ["/dashboard?_rsc=old", "GET"],
    ["/dashboard/users", "POST"],
    ["/superadmin", "POST"],
    ["/api/metrics/details", "GET"],
    ["/api/local/brand-upload", "POST"],
    ["/api/auth/signout", "POST"],
    ["/api/panel-session", "GET"],
  ]) {
    const response = await proxy(await request(path, agustin, {
      method, headers: { [PANEL_SESSION_HEADER]: contextA },
    }));
    assert.equal(response.status, 409, path);
    assert.equal(response.headers.get(PANEL_SESSION_CHANGED), "1");
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  }
});

test("panel mutations and partial navigation reject missing context and accept matching context", async () => {
  assert.equal((await proxy(await request("/dashboard?_rsc=old"))).status, 409);
  assert.equal((await proxy(await request("/dashboard", agustin, { method: "POST" }))).status, 409);
  const headers = { [PANEL_SESSION_HEADER]: contextB };
  assert.equal((await proxy(await request("/dashboard?_rsc=current", agustin, { headers }))).status, 200);
  assert.equal((await proxy(await request("/dashboard", agustin, { method: "POST", headers }))).status, 200);
  assert.equal((await proxy(await request("/api/panel-session", agustin, { headers }))).status, 204);
});

test("unbound browser API fetches fail while direct downloads reach the endpoint's authorization", async () => {
  const path = "/api/leads/export?cardId=tenant-card";
  assert.equal((await proxy(await request(path, agustin, {
    headers: { "sec-fetch-dest": "empty" },
  }))).status, 409);
  assert.equal((await proxy(await request(path, agustin, {
    headers: { "sec-fetch-dest": "document" },
  }))).status, 200);
});

test("native forms are bound to the session that rendered them", async () => {
  for (const [context, status] of [[contextA, 409], [contextB, 200]] as const) {
    const body = new URLSearchParams({ [PANEL_SESSION_HEADER]: context }).toString();
    const original = await request("/dashboard/local/locales", agustin, {
      method: "POST", body,
      headers: { "content-type": "application/x-www-form-urlencoded", "content-length": String(body.length) },
    });
    assert.equal((await proxy(original)).status, status);
    assert.equal(await original.text(), body);
  }
});

test("panel validation requires a cookie even if a bearer token is provided", async () => {
  const response = await proxy(new NextRequest("http://localhost:3000/api/panel-session", {
    headers: {
      Authorization: `Bearer ${await encode({ token: agustin, secret })}`,
      [PANEL_SESSION_HEADER]: contextB,
    },
  }));
  assert.equal(response.status, 409);
});
