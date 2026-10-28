import { memo, type ReactNode } from "react";

interface ImageFileRowProps {
  name: string;
  previewUrl: string;
  /** Second line, e.g. sizes or dimensions. */
  detail: ReactNode;
  /** Buttons or links on the right. */
  actions?: ReactNode;
}

export const ImageFileRow = memo(function ImageFileRow({ name, previewUrl, detail, actions }: ImageFileRowProps) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2 pr-3 shadow-sm">
      <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
        {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL, next/image adds nothing here */}
        <img src={previewUrl} alt="" decoding="async" className="size-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={name}>
          {name}
        </p>
        <div className="text-xs text-muted">{detail}</div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </li>
  );
});
