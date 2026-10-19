import type { MetadataRoute } from "next";
import { posts } from "../lib/blog";
import { EMPRESAS_PUBLISHED } from "../content/empresas/launch";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.smartnfc.cl";
  return [
    { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    // La nueva landing /empresas vuelve al sitemap al autorizar su lanzamiento (content/empresas/launch.ts).
    ...(EMPRESAS_PUBLISHED ? [{ url: `${baseUrl}/empresas`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.9 }] : []),
    { url: `${baseUrl}/local`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    ...posts.map((post) => ({ url: `${baseUrl}/blog/${post.slug}`, lastModified: new Date(post.published), changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
