import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/*/account", "/*/agent", "/*/dashboard", "/*/login", "/*/register", "/*/forgot-password", "/*/reset-password", "/*/verify-email"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
