import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { liveTools, toolHref } from "@/config/tools";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteConfig.url, changeFrequency: "weekly", priority: 1 },
    ...liveTools.map((tool) => ({ url: `${siteConfig.url}${toolHref(tool)}`, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
