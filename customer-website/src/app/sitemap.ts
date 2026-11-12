import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-11-11T00:00:00.000Z");
  const routes: Array<{ path: string; priority: number; changeFrequency: "weekly" | "monthly" }> = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/tutorials", priority: 0.9, changeFrequency: "weekly" },
    { path: "/resume-builder", priority: 0.9, changeFrequency: "weekly" },
    { path: "/certificate-builder", priority: 0.85, changeFrequency: "weekly" },
    { path: "/portfolio-builder", priority: 0.85, changeFrequency: "weekly" },
    { path: "/cover-letter", priority: 0.85, changeFrequency: "weekly" },
    { path: "/verify", priority: 0.85, changeFrequency: "weekly" },
    { path: "/assistant", priority: 0.8, changeFrequency: "weekly" },
    { path: "/stamps", priority: 0.75, changeFrequency: "monthly" },
    { path: "/support", priority: 0.7, changeFrequency: "monthly" },
    { path: "/about", priority: 0.75, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.6, changeFrequency: "monthly" },
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
