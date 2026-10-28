"use client";

import { useEffect, useRef } from "react";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extensions";
import { useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

interface DocumentEditorOptions {
  placeholder: string;
  /** Called after every change to the content (not on selection moves). */
  onChange?: (editor: Editor) => void;
}

/**
 * The rich-text editor behind the document tools. The feature set is chosen to
 * match what both exporters (PDF via pdfmake, Word via docx/html) can represent.
 */
export function useDocumentEditor({ placeholder, onChange }: DocumentEditorOptions) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  return useEditor({
    // Rendering on the server would mismatch on hydration; the editor is client-only.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"] },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TableKit.configure({ table: { resizable: false } }),
      Image.configure({ allowBase64: true }),
      Placeholder.configure({ placeholder }),
    ],
    editorProps: {
      attributes: { class: "doc-content", "aria-label": "Document", spellcheck: "true" },
    },
    onUpdate: ({ editor }) => onChangeRef.current?.(editor),
  });
}
