"use client";

import { useRef, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Columns3,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  Rows3,
  Strikethrough,
  Table,
  Trash2,
  Underline,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/cn";

type BlockType = "paragraph" | "h1" | "h2" | "h3";

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

interface EditorToolbarProps {
  editor: Editor;
  disabled?: boolean;
  /** Extra controls at the end, e.g. "Open .txt". */
  children?: ReactNode;
}

export function EditorToolbar({ editor, disabled, children }: EditorToolbarProps) {
  const imageInput = useRef<HTMLInputElement>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: (e.isActive("heading", { level: 1 })
        ? "h1"
        : e.isActive("heading", { level: 2 })
          ? "h2"
          : e.isActive("heading", { level: 3 })
            ? "h3"
            : "paragraph") as BlockType,
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      blockquote: e.isActive("blockquote"),
      align: (["center", "right", "justify"].find((a) => e.isActive({ textAlign: a })) ?? "left") as string,
      inTable: e.isActive("table"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();

  const setBlock = (block: BlockType) => {
    if (block === "paragraph") chain().setParagraph().run();
    else chain().setHeading({ level: Number(block.slice(1)) as 1 | 2 | 3 }).run();
  };

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-0.5 border-b border-border bg-surface px-2 py-1.5"
    >
      <ToolButton label="Undo" onClick={() => chain().undo().run()} disabled={disabled || !state.canUndo}>
        <Undo2 />
      </ToolButton>
      <ToolButton label="Redo" onClick={() => chain().redo().run()} disabled={disabled || !state.canRedo}>
        <Redo2 />
      </ToolButton>
      <Divider />
      <select
        aria-label="Text style"
        value={state.block}
        onChange={(event) => setBlock(event.target.value as BlockType)}
        disabled={disabled}
        className="h-8 rounded-md border border-border bg-surface px-2 text-sm focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
      >
        <option value="paragraph">Normal text</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>
      <Divider />
      <ToolButton label="Bold" shortcut="Ctrl+B" active={state.bold} onClick={() => chain().toggleBold().run()} disabled={disabled}>
        <Bold />
      </ToolButton>
      <ToolButton label="Italic" shortcut="Ctrl+I" active={state.italic} onClick={() => chain().toggleItalic().run()} disabled={disabled}>
        <Italic />
      </ToolButton>
      <ToolButton label="Underline" shortcut="Ctrl+U" active={state.underline} onClick={() => chain().toggleUnderline().run()} disabled={disabled}>
        <Underline />
      </ToolButton>
      <ToolButton label="Strikethrough" active={state.strike} onClick={() => chain().toggleStrike().run()} disabled={disabled}>
        <Strikethrough />
      </ToolButton>
      <Divider />
      <ToolButton label="Bulleted list" active={state.bulletList} onClick={() => chain().toggleBulletList().run()} disabled={disabled}>
        <List />
      </ToolButton>
      <ToolButton label="Numbered list" active={state.orderedList} onClick={() => chain().toggleOrderedList().run()} disabled={disabled}>
        <ListOrdered />
      </ToolButton>
      <Divider />
      <ToolButton label="Align left" active={state.align === "left"} onClick={() => chain().setTextAlign("left").run()} disabled={disabled}>
        <AlignLeft />
      </ToolButton>
      <ToolButton label="Align centre" active={state.align === "center"} onClick={() => chain().setTextAlign("center").run()} disabled={disabled}>
        <AlignCenter />
      </ToolButton>
      <ToolButton label="Align right" active={state.align === "right"} onClick={() => chain().setTextAlign("right").run()} disabled={disabled}>
        <AlignRight />
      </ToolButton>
      <ToolButton label="Justify" active={state.align === "justify"} onClick={() => chain().setTextAlign("justify").run()} disabled={disabled}>
        <AlignJustify />
      </ToolButton>
      <Divider />
      <ToolButton label="Quote" active={state.blockquote} onClick={() => chain().toggleBlockquote().run()} disabled={disabled}>
        <Quote />
      </ToolButton>
      <ToolButton label="Divider line" onClick={() => chain().setHorizontalRule().run()} disabled={disabled}>
        <Minus />
      </ToolButton>
      <ToolButton label="Insert image" onClick={() => imageInput.current?.click()} disabled={disabled}>
        <ImagePlus />
      </ToolButton>
      <input
        ref={imageInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) chain().setImage({ src: await readAsDataUrl(file), alt: file.name }).run();
        }}
      />
      <ToolButton
        label="Insert table"
        onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        disabled={disabled || state.inTable}
      >
        <Table />
      </ToolButton>
      {state.inTable && (
        <>
          <ToolButton label="Add row below" onClick={() => chain().addRowAfter().run()} disabled={disabled}>
            <Rows3 />
          </ToolButton>
          <ToolButton label="Add column right" onClick={() => chain().addColumnAfter().run()} disabled={disabled}>
            <Columns3 />
          </ToolButton>
          <ToolButton label="Delete row" onClick={() => chain().deleteRow().run()} disabled={disabled}>
            <Rows3 className="text-danger" />
          </ToolButton>
          <ToolButton label="Delete column" onClick={() => chain().deleteColumn().run()} disabled={disabled}>
            <Columns3 className="text-danger" />
          </ToolButton>
          <ToolButton label="Delete table" onClick={() => chain().deleteTable().run()} disabled={disabled}>
            <Trash2 className="text-danger" />
          </ToolButton>
        </>
      )}
      <Divider />
      <ToolButton label="Clear formatting" onClick={() => chain().unsetAllMarks().clearNodes().run()} disabled={disabled}>
        <RemoveFormatting />
      </ToolButton>
      {children && (
        <>
          <Divider />
          {children}
        </>
      )}
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-border" />;
}

interface ToolButtonProps {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

function ToolButton({ label, shortcut, active, disabled, onClick, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keep the editor's selection when clicking a toolbar button.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md transition-colors [&_svg]:size-4",
        "focus-visible:outline-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-40",
        active ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
