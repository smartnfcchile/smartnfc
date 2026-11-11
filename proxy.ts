import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import {
  PANEL_CONTEXT_HEADER, PANEL_SESSION_CHANGED, PANEL_SESSION_CHECK, PANEL_SESSION_HEADER,
  panelSessionContext,
} from "./lib/panel-session";
import { panelBootstrap, PANEL_TAB_BLOCKED, PANEL_TAB_QUERY } from "./lib/panel-tab";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

async function submittedContext(request: NextRequest) {
  const header = request.headers.get(PANEL_SESSION_HEADER);
  if (header || request.headers.has("next-action") || request.method !== "POST") return header;

  // React forms submitted before hydration use a normal document POST.
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data") &&
      !contentType.startsWith("application/x-www-form-urlencoded")) return null;
  const length = Number(request.headers.get("content-length"));
  if (!Number.isSafeInteger(length) || length <= 0 || length > 2 * 1024 * 1024) return null;
  const form = await request.clone().formData().catch(() => null);
  return form?.get(PANEL_SESSION_HEADER) ?? null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const panel = /^\/(dashboard|superadmin)(\/|$)/.test(pathname);
  const check = pathname === PANEL_SESSION_CHECK;
  const headers = new Headers(request.headers);
  headers.delete(PANEL_CONTEXT_HEADER);

  const supplied = headers.get(PANEL_SESSION_HEADER);
  const needsBinding = panel
    ? request.method === "POST" || supplied !== null || headers.has("rsc") || request.nextUrl.searchParams.has("_rsc")
    : check || supplied !== null || headers.get("sec-fetch-dest") === "empty" ||
      pathname === "/api/local/brand-upload" ||
      (pathname === "/api/blob/upload" && headers.has("origin")) ||
      (pathname === "/api/auth/signout" && request.method === "POST");

  if (!panel && !needsBinding) return NextResponse.next();

  const secret = process.env.NEXTAUTH_SECRET;
  const token = secret ? await getToken({
    req: new NextRequest(request.url, { headers: { cookie: headers.get("cookie") ?? "" } }),
    secret,
  }) : null;
  const context = panelSessionContext(token, secret);
  if (needsBinding) {
    const expected = panel && context ? await submittedContext(request) : supplied;
    if (!context || expected !== context) {
      return new NextResponse("La sesión de este panel cambió. Vuelve a abrir el panel.", {
        status: 409,
        headers: { ...noStore, [PANEL_SESSION_CHANGED]: "1" },
      });
    }
  }

  if (check) return new NextResponse(null, { status: 204, headers: noStore });
  if (panel && !needsBinding && (request.method === "GET" || request.method === "HEAD")) {
    const documentContext = request.nextUrl.searchParams.get(PANEL_TAB_QUERY);
    if (documentContext !== null && (!context || documentContext !== context)) {
      const response = NextResponse.redirect(new URL(PANEL_TAB_BLOCKED, request.url));
      response.headers.set("Cache-Control", noStore["Cache-Control"]);
      return response;
    }
    if (context && documentContext === null) {
      return new NextResponse(panelBootstrap(context, token?.tabLoginAttempt), {
        headers: { ...noStore, "Content-Type": "text/html; charset=utf-8", "Referrer-Policy": "no-referrer" },
      });
    }
  }
  if (panel && context) headers.set(PANEL_CONTEXT_HEADER, context);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/dashboard/:path*", "/superadmin/:path*", "/api/panel-session", "/api/auth/signout",
    "/api/blob/upload", "/api/local/brand-upload", "/api/metrics/details",
    "/api/leads/export", "/api/local/broadcast-exports/:path*",
    "/api/local/points/:path*", "/api/superadmin/:path*", "/api/physical-designs/:path*",
  ],
};
