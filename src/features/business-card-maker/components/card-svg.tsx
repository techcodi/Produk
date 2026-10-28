import { cn } from "@/lib/cn";

/**
 * Shows one of our generated card SVGs inline. The markup comes from
 * `renderCard`, which escapes every piece of user text, so it's safe to inject.
 */
export function CardSvg({ svg, label, className }: { svg: string; label: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("overflow-hidden rounded-md shadow-md ring-1 ring-black/10 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full", className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
