import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { siteConfig } from "@/config/site";
import { categoryLabels, liveTools, toolHref, type ToolCategory } from "@/config/tools";

const categories = Object.keys(categoryLabels) as ToolCategory[];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <nav aria-label="All tools" className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => {
            const tools = liveTools.filter((tool) => tool.category === category);
            if (tools.length === 0) return null;
            return (
              <div key={category}>
                <h2 className="text-sm font-semibold">{categoryLabels[category]}</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {tools.map((tool) => (
                    <li key={tool.slug}>
                      <Link href={toolHref(tool)} className="text-muted hover:text-foreground">
                        {tool.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-sm text-muted sm:flex-row">
          <span className="inline-flex items-center gap-2">
            <LogoMark className="size-5" />
            {siteConfig.name} — {siteConfig.tagline.toLowerCase()}.
          </span>
          <span>No sign-up. No uploads. Free.</span>
        </div>
      </div>
    </footer>
  );
}
