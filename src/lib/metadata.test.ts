import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";
import { liveTools } from "@/config/tools";
import { jsonLdHtml, toolMetadata } from "./metadata";

describe("toolMetadata", () => {
  it.each(liveTools.map((tool) => [tool.slug, tool] as const))("%s fits in a search result", (_, tool) => {
    const metadata = toolMetadata(tool);
    // Google cuts titles at roughly 60–65 characters, including the " | ProDuk" suffix.
    expect(`${metadata.title} | ${siteConfig.name}`.length).toBeLessThanOrEqual(65);
    expect(tool.description.length).toBeLessThanOrEqual(170);
    expect(tool.keywords.length).toBeGreaterThan(0);
  });
});

describe("jsonLdHtml", () => {
  it("escapes < so the data can't close its script tag", () => {
    expect(jsonLdHtml({ name: "</script><b>" }).__html).not.toContain("<");
  });
});
