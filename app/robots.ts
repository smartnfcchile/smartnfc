import type { MetadataRoute } from "next";

// Perfiles de clientes (/c/), enlaces NFC/QR y autenticación no se bloquean aquí: llevan X-Robots-Tag noindex
// (next.config.ts), que los buscadores solo leen si pueden rastrear la URL.
export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.smartnfc.cl";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard/", "/superadmin/"] }],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
