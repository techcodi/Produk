import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gift, ShieldCheck, UserX, Zap } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { ToolCard } from "@/components/tools/tool-card";
import { siteConfig } from "@/config/site";
import { liveTools, toolHref, tools } from "@/config/tools";
import { cn } from "@/lib/cn";
import { jsonLdHtml } from "@/lib/metadata";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: siteConfig.name, title: `${siteConfig.name} — ${siteConfig.seoTitle}`, description: siteConfig.description, url: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url, description: siteConfig.description },
    { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
    {
      "@type": "ItemList",
      itemListElement: liveTools.map((tool, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: tool.name,
        url: `${siteConfig.url}${toolHref(tool)}`,
      })),
    },
  ],
};

const promises = [
  { icon: ShieldCheck, title: "Private by design", body: "Files are processed in your browser and never uploaded to a server." },
  { icon: UserX, title: "No sign-up", body: "No account, no email, no watermark. Open a tool and get going." },
  { icon: Zap, title: "Fast on any device", body: "Built to work well on phones, even on slower connections." },
  { icon: Gift, title: "Free", body: "Every tool on ProDuk is free to use." },
];

export default function HomePage() {
  const featured = liveTools[0];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(jsonLd)} />
      <section className="mx-auto w-full max-w-6xl px-4 pb-12 pt-16 text-center sm:px-6 sm:pt-24">
        <p className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
          <ShieldCheck className="size-3.5 text-success" /> 100% in-browser · no uploads
        </p>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Everyday file tools, <span className="text-brand">done right.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted text-balance">
          Free online tools to merge, edit and convert PDFs, compress images, remove backgrounds, and make passport photos,
          invoices and QR codes. Fast and private — your files stay on your device.
        </p>
        {featured && (
          <Link href={toolHref(featured)} className={cn(buttonStyles({ size: "lg" }), "mt-8")}>
            Try {featured.name} <ArrowRight />
          </Link>
        )}
      </section>

      <section id="tools" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-12 sm:px-6">
        <h2 className="text-xl font-semibold">Tools</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 rounded-2xl border border-border bg-surface p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
          {promises.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <Icon className="size-5 text-brand" />
              <h3 className="mt-3 font-medium">{title}</h3>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
