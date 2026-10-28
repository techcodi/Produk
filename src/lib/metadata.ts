import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { toolHref, type ToolDefinition } from "@/config/tools";

export function toolMetadata(tool: ToolDefinition): Metadata {
  const title = tool.seoTitle ?? `${tool.name} — free, private, no sign-up`;
  const url = toolHref(tool);
  return {
    title,
    description: tool.description,
    keywords: tool.keywords,
    alternates: { canonical: url },
    // Page-level openGraph replaces the layout's, so repeat the site-wide fields.
    openGraph: { type: "website", siteName: siteConfig.name, title: `${title} | ${siteConfig.name}`, description: tool.description, url },
    twitter: { card: "summary", title: `${title} | ${siteConfig.name}`, description: tool.description },
  };
}

/** schema.org data for a tool page: a free web app plus its place in the site. */
export function toolJsonLd(tool: ToolDefinition) {
  const url = `${siteConfig.url}${toolHref(tool)}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: tool.name,
        url,
        description: tool.description,
        applicationCategory: tool.category === "developer" ? "DeveloperApplication" : tool.category === "business" ? "BusinessApplication" : "MultimediaApplication",
        operatingSystem: "Any (runs in the browser)",
        browserRequirements: "Requires JavaScript",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: siteConfig.name, item: siteConfig.url },
          { "@type": "ListItem", position: 2, name: tool.name, item: url },
        ],
      },
    ],
  };
}

/** Serialises JSON-LD for a `<script>` tag, escaping `<` so content can't close the tag. */
export const jsonLdHtml = (data: object) => ({ __html: JSON.stringify(data).replace(/</g, "\\u003c") });
