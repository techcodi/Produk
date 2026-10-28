import { FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SelectedFileBarProps {
  name: string;
  detail: string;
  onReplace: () => void;
  disabled?: boolean;
}

/** Header for single-file tools: which file is loaded, and a way to start over with another. */
export function SelectedFileBar({ name, detail, onReplace, disabled }: SelectedFileBarProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger">
        <FileText className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={name}>
          {name}
        </p>
        <p className="text-xs text-muted">{detail}</p>
      </div>
      <Button variant="secondary" size="sm" onClick={onReplace} disabled={disabled}>
        <RefreshCw /> Change file
      </Button>
    </div>
  );
}
