import type { MetadataRoute } from "next";
import { posts } from "../lib/blog";
import { EMPRESAS_PUBLISHED } from "../content/empresas/launch";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.smartnfc.cl";
  return [
    { url: `${baseUrl}/`, changeFrequency: "weekly", priority: 1 },
    // /empresas está en el sitemap mientras EMPRESAS_PUBLISHED sea true (content/empresas/launch.ts).
    ...(EMPRESAS_PUBLISHED ? [{ url: `${baseUrl}/empresas`, changeFrequency: "monthly" as const, priority: 0.9 }] : []),
    { url: `${baseUrl}/local`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/personas`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/blog`, changeFrequency: "weekly", priority: 0.8 },
    ...posts.map((post) => ({ url: `${baseUrl}/blog/${post.slug}`, lastModified: new Date(post.published), changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
