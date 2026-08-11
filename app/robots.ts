import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://smartnfc.cl";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard/", "/superadmin/", "/login", "/activar-cuenta", "/olvide-mi-contrasena", "/restablecer-contrasena"] }],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
