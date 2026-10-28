"use client";

import type { CSSProperties, ReactNode } from "react";
import { EditorContent, type Editor } from "@tiptap/react";
import { Loader2 } from "lucide-react";
import { DOC_MARGINS_PT, DOC_PAGE_SIZES, type DocFont, type DocumentSettings } from "@/lib/document/types";
import { EditorToolbar } from "./editor-toolbar";

/** Screen fonts that preview each export font. */
const PREVIEW_FONTS: Record<DocFont, string> = {
  sans: "Roboto, Calibri, Arial, sans-serif",
  serif: "'Times New Roman', Times, serif",
  mono: "'Courier New', Courier, monospace",
};

interface DocumentEditorProps {
  editor: Editor | null;
  settings: Omit<DocumentSettings, "fileName">;
  disabled?: boolean;
  /** Extra toolbar controls. */
  toolbarExtras?: ReactNode;
}

/** The editor drawn as a sheet of paper whose proportions, margins and font follow the export settings. */
export function DocumentEditor({ editor, settings, disabled, toolbarExtras }: DocumentEditorProps) {
  const page = DOC_PAGE_SIZES[settings.pageSize];
  // Percentage padding is relative to the sheet's width, so margins scale with it.
  const padding = `${(DOC_MARGINS_PT[settings.margin] / page.width) * 100}%`;
  const style: CSSProperties = {
    padding,
    fontFamily: PREVIEW_FONTS[settings.font],
    fontSize: `${(settings.fontSize * 96) / 72}px`,
    // At least one page tall; aspect-ratio still lets longer content grow the sheet.
    aspectRatio: `${page.width} / ${page.height}`,
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface-muted">
      {editor ? (
        <EditorToolbar editor={editor} disabled={disabled}>
          {toolbarExtras}
        </EditorToolbar>
      ) : (
        <div className="h-11 border-b border-border bg-surface" />
      )}
      <div className="p-3 sm:p-6">
        {/* Paper stays white in dark mode, as the exported page will be. */}
        <div
          className="mx-auto w-full max-w-[816px] rounded-sm bg-white text-neutral-900 shadow-md"
          style={style}
          // Clicks in the page margins or below the text land in the editor.
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && editor) {
              event.preventDefault();
              editor.commands.focus("end");
            }
          }}
        >
          {editor ? (
            <EditorContent editor={editor} className="h-full" />
          ) : (
            <div className="flex h-40 items-center justify-center text-muted">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
