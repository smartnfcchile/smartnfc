import "./helpers/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";

test("descarga pública: acceso, errores y respuesta real sin base de datos", async () => {
  const active = { id: "card-test", companyId: "company-test", isActive: true, company: { isActive: true }, name: "Ana", profileName: "Ana Ñandú", companyName: null, role: null, phone: "+56912345678", email: null };
  let card: typeof active | null = active;
  let entitled = true;
  let broken = false;
  const prismaPath = require.resolve("../../lib/prisma");
  const rightsPath = require.resolve("../../lib/entitlements");
  const previousPrisma = require.cache[prismaPath];
  const previousRights = require.cache[rightsPath];
  require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: { prisma: { card: { findUnique: async () => { if (broken) throw new Error("test"); return card; } } } } } as NodeModule;
  require.cache[rightsPath] = { id: rightsPath, filename: rightsPath, loaded: true, exports: { hasCardProfileRight: async () => entitled } } as NodeModule;
  const routePath = require.resolve("../../app/c/[slug]/contacto.vcf/route");
  const previousRoute = require.cache[routePath];
  try {
    const { GET } = require(routePath);
    const get = () => GET(new Request("https://example.test/c/ana/contacto.vcf"), { params: Promise.resolve({ slug: "ana" }) }) as Promise<Response>;
    const response = await get();
    assert.equal(response.status, 200);
    assert.ok((await response.text()).includes("FN:Ana Ñandú"));
    card = null; assert.equal((await get()).status, 404);
    card = { ...active, isActive: false }; assert.equal((await get()).status, 404);
    card = { ...active, company: { isActive: false } }; assert.equal((await get()).status, 404);
    card = active; entitled = false; assert.equal((await get()).status, 403);
    entitled = true; broken = true;
    const originalError = console.error;
    console.error = () => {};
    try {
      const failed = await get();
      assert.equal(failed.status, 500);
      assert.equal(failed.headers.get("cache-control"), "no-store");
      assert.ok((await failed.text()).includes("inténtalo nuevamente"));
    } finally { console.error = originalError; }
  } finally {
    if (previousPrisma) require.cache[prismaPath] = previousPrisma; else delete require.cache[prismaPath];
    if (previousRights) require.cache[rightsPath] = previousRights; else delete require.cache[rightsPath];
    if (previousRoute) require.cache[routePath] = previousRoute; else delete require.cache[routePath];
  }
});
