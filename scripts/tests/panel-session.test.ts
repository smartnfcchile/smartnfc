import assert from "node:assert/strict";
import test from "node:test";
import { encode } from "next-auth/jwt";
import { NextRequest } from "next/server";
import {
  PANEL_CONTEXT_HEADER, PANEL_SESSION_CHANGED, PANEL_SESSION_HEADER, panelSessionContext,
} from "../../lib/panel-session";
import { proxy } from "../../proxy";

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

test("full document requests derive context from the cookie, ignoring injected internal headers", async () => {
  const response = await proxy(await request("/dashboard", agustin, {
    headers: { [PANEL_CONTEXT_HEADER]: contextA },
  }));
  assert.equal(response.headers.get(`x-middleware-request-${PANEL_CONTEXT_HEADER}`), contextB);
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
