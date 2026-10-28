import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-sm font-medium text-brand">404</p>
      <h1 className="mt-2 text-2xl font-semibold">This tool doesn’t exist (yet)</h1>
      <p className="mt-2 text-muted">It may be on the way. In the meantime, check out what’s available.</p>
      <Link href="/#tools" className={cn(buttonStyles({ variant: "secondary" }), "mt-6")}>
        Browse tools
      </Link>
    </div>
  );
}
