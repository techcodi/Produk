import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="ProDuk home" className="rounded-lg focus-visible:outline-2 focus-visible:outline-brand">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/#tools" className="rounded-md px-3 py-2 text-muted hover:text-foreground">
            All tools
          </Link>
          <span className="ml-2 hidden items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success md:inline-flex">
            <ShieldCheck className="size-3.5" />
            Files never leave your device
          </span>
        </nav>
      </div>
    </header>
  );
}
