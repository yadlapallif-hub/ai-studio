import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/tutorials",
          "/about",
          "/privacy",
          "/resume-builder",
          "/certificate-builder",
          "/verify",
          "/assistant",
          "/support",
          "/stamps",
        ],
        disallow: [
          "/dashboard",
          "/vault",
          "/settings",
          "/auth/",
          "/api/",
          "/admin",
          "/bulk-generator",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
