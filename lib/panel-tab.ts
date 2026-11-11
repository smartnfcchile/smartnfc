export const PANEL_TAB_KEY = "smartnfc:tab-session";
export const PANEL_TAB_QUERY = "_panel";
export const PANEL_TAB_BLOCKED = "/login?error=sessionChanged";

// The initial document contains no private panel data.
function resumePanel(context: string, attempt: string | null, key: string, query: string, blocked: string) {
  try {
    const saved = sessionStorage.getItem(key);
    if (saved && saved !== context && (!attempt || saved !== "login:" + attempt)) {
      location.replace(blocked);
      return;
    }
    sessionStorage.setItem(key, context);
    const url = new URL(location.href);
    url.searchParams.set(query, context);
    location.replace(url);
  } catch {
    location.replace(blocked);
  }
}

export function panelBootstrap(context: string, attempt: unknown) {
  const safeAttempt = typeof attempt === "string" && /^[a-f0-9-]{36}$/.test(attempt) ? attempt : null;
  const args = [context, safeAttempt, PANEL_TAB_KEY, PANEL_TAB_QUERY, PANEL_TAB_BLOCKED];
  return `<!doctype html><html lang="es"><meta charset="utf-8"><title>SmartNFC</title>
<script>(${resumePanel.toString()})(...${JSON.stringify(args)})</script>
<noscript>Activa JavaScript para verificar la sesión de esta pestaña.</noscript></html>`;
}
