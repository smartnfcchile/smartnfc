import "./helpers/test-database";
import assert from "node:assert/strict";
import { before, mock, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let pathname = "/superadmin";
mock.module("next/navigation", { namedExports: { usePathname: () => pathname } });
mock.module("next/link", {
  defaultExport: ({ href, className, children }: {
    href: string; className?: string; children: React.ReactNode;
  }) => createElement("a", { href, className }, children),
});
mock.module("next-auth/react", { namedExports: { signOut: () => {} } });

let Sidebar: typeof import("../../app/superadmin/SuperadminSidebar").default;
before(async () => {
  ({ default: Sidebar } = await import("../../app/superadmin/SuperadminSidebar"));
});

test("el menú enlaza una vez a Soluciones NFC y resalta su raíz y subrutas", () => {
  for (const [path, active] of [
    ["/superadmin", false],
    ["/superadmin/soluciones", true],
    ["/superadmin/soluciones/proyecto-de-prueba", true],
    ["/superadmin/soluciones-otra", false],
  ] as const) {
    pathname = path;
    const html = renderToStaticMarkup(createElement(Sidebar));
    const links = [...html.matchAll(/<a href="\/superadmin\/soluciones" class="([^"]+)">[^]*?<\/a>/g)];
    assert.equal(links.length, 1, path);
    assert.match(links[0][0], /Soluciones NFC/);
    assert.equal(links[0][1].includes("bg-blue-600"), active, path);
    assert.match(html, /href="\/superadmin\/empresas"/);
    assert.match(html, /href="\/superadmin\/locales"/);
  }
});
let hasSession = false;
let role = "COLLABORATOR";
mock.module("next-auth", {
  namedExports: { getServerSession: async () => hasSession ? { user: { id: "user-test", companyId: "company-test" } } : null },
});
mock.module("../../lib/auth.ts", { namedExports: { authOptions: {} } });
mock.module("../../lib/prisma.ts", {
  namedExports: { prisma: { user: { findFirst: async () => ({ id: "user-test", companyId: "company-test", role }) } } },
});

test("el permiso administrativo comprueba el rol de la cuenta activa", async () => {
  const { requireSuperAdmin } = await import("../../lib/permissions");
  await assert.rejects(requireSuperAdmin(), /No autorizado/);
  hasSession = true;
  for (const denied of ["COLLABORATOR", "COMPANY_OWNER", "COMPANY_ADMIN"]) {
    role = denied;
    await assert.rejects(requireSuperAdmin(), /Permisos insuficientes/);
  }
  role = "SUPERADMIN";
  assert.equal((await requireSuperAdmin()).role, "SUPERADMIN");
});
