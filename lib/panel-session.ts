import { createHmac } from "node:crypto";
import type { JWT } from "next-auth/jwt";

export const PANEL_SESSION_HEADER = "x-smartnfc-panel-session";
export const PANEL_CONTEXT_HEADER = "x-smartnfc-panel-context";
export const PANEL_SESSION_CHANGED = "x-smartnfc-session-changed";
export const PANEL_SESSION_CHECK = "/api/panel-session";
export const PANEL_SESSION_EVENT = "smartnfc:session-change";

// NextAuth can rotate the encrypted cookie on session reads. Bind to the
// sign-in and identity, so a rotation doesn't invalidate an open panel.
export function panelSessionContext(token: JWT | null, secret: string | undefined) {
  if (!secret || typeof token?.id !== "string" || typeof token.companyId !== "string") return null;
  return createHmac("sha256", secret)
    .update(JSON.stringify(["panel-session", token.id, token.companyId, token.role, token.loginId]))
    .digest("hex");
}
