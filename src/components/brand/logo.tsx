import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" className="fill-brand" />
      <path d="M11 8.5h6.2a5.3 5.3 0 0 1 0 10.6H14.6V23.5H11z" className="fill-brand-foreground" />
      <circle cx="17" cy="13.8" r="2" className="fill-brand" />
      <rect x="18.5" y="20.5" width="3" height="3" rx="1" className="fill-brand-foreground opacity-70" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight">
        Pro<span className="text-brand">Duk</span>
      </span>
    </span>
  );
}
