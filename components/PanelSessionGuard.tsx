import { headers } from "next/headers";
import {
  PANEL_CONTEXT_HEADER, PANEL_SESSION_CHANGED, PANEL_SESSION_CHECK,
  PANEL_SESSION_EVENT, PANEL_SESSION_HEADER,
} from "../lib/panel-session";

// Install before hydration, so even an early submission is bound to the panel.
function installPanelSession(context: string, header: string, changed: string, checkPath: string, eventKey: string) {
  const root = document.documentElement;
  if (root.dataset.panelSession === context) return;
  root.dataset.panelSession = context;

  const fetchRequest = window.fetch.bind(window);
  const panelPath = /^\/(dashboard|superadmin)(\/|$)/;
  const inPanel = () => panelPath.test(window.location.pathname);
  let reloading = false;

  function reloadPanel() {
    if (reloading || !inPanel()) return;
    reloading = true;
    root.style.visibility = "hidden";
    window.location.reload();
  }

  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString(), window.location.href);
    if (url.origin !== window.location.origin ||
        (!panelPath.test(url.pathname) && !(inPanel() && url.pathname.startsWith("/api/")))) {
      return fetchRequest(input, init);
    }
    const requestHeaders = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    requestHeaders.set(header, context);
    const response = await fetchRequest(input, { ...init, headers: requestHeaders });
    if (response.status === 409 && response.headers.has(changed)) {
      reloadPanel();
      throw new Error("La sesión del panel cambió.");
    }
    return response;
  };

  document.addEventListener("formdata", (event) => {
    if (!(event.target instanceof HTMLFormElement)) return;
    const action = new URL(event.target.action, window.location.href);
    if (event.target.method === "post" && action.origin === window.location.origin &&
        panelPath.test(action.pathname)) event.formData.set(header, context);
  }, true);

  async function checkSession() {
    if (!inPanel() || reloading || document.visibilityState !== "visible") return;
    try {
      const response = await fetchRequest(checkPath, { headers: { [header]: context }, cache: "no-store" });
      if (response.status === 409 && response.headers.has(changed)) reloadPanel();
    } catch {
      // An offline tab will check again when it regains connectivity or focus.
    }
  }

  window.addEventListener("storage", (event) => {
    if (event.key === eventKey || event.key === "nextauth.message") void checkSession();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) void checkSession();
  });
  window.addEventListener("focus", checkSession);
  window.addEventListener("online", checkSession);
  document.addEventListener("visibilitychange", checkSession);
  void checkSession();
}

export default async function PanelSessionGuard() {
  const context = (await headers()).get(PANEL_CONTEXT_HEADER);
  if (!context || !/^[a-f0-9]{64}$/.test(context)) return null;
  const args = [context, PANEL_SESSION_HEADER, PANEL_SESSION_CHANGED, PANEL_SESSION_CHECK, PANEL_SESSION_EVENT];
  return <script dangerouslySetInnerHTML={{ __html: `(${installPanelSession.toString()})(...${JSON.stringify(args)})` }} />;
}
